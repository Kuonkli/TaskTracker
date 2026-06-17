package pkg

import (
	"encoding/json"
	"fmt"
	"strings"
)

// JoinMetadata содержит информацию о необходимых JOIN
type JoinMetadata struct {
	JoinTable string // таблица с алиасом, например "users assignee_user"
	JoinOn    string // условие JOIN, например "assignee_user.id = tasks.assignee_id"
	JoinType  string // "LEFT JOIN", "INNER JOIN" и т.д.
}

// FieldMetadata содержит информацию о поле
type FieldMetadata struct {
	SQLExpr         string          // SQL выражение для поля
	RequiredJoins   []*JoinMetadata // JOIN, если требуется (nil если не нужен)
	RequiresGroupBy bool            // НОВОЕ: требует ли поле GROUP BY
}

// SQLGenerator преобразует ConditionNode в SQL WHERE clause
type SQLGenerator struct {
	fieldMap        map[string]string
	fieldMetadata   map[string]FieldMetadata
	requiredJoins   map[string]string // уникальные JOIN для текущего запроса
	requiresGroupBy bool              // НОВОЕ: флаг, нужен ли GROUP BY
}

// NewSQLGenerator создает новый генератор
func NewSQLGenerator() *SQLGenerator {
	gen := &SQLGenerator{
		fieldMap:      make(map[string]string),
		fieldMetadata: make(map[string]FieldMetadata),
		requiredJoins: make(map[string]string),
	}

	// Инициализируем все поля
	gen.initFields()

	return gen
}

// initFields инициализирует все доступные поля
func (g *SQLGenerator) initFields() {
	// ===== СТРОКОВЫЕ ПОЛЯ =====
	g.fieldMap["title"] = "tasks.title"
	g.fieldMap["description"] = "tasks.description"
	g.fieldMap["priority"] = "tasks.priority"

	// ===== ССЫЛКИ (требуют JOIN) =====
	g.fieldMetadata["assignee"] = FieldMetadata{
		SQLExpr: "assignee_user.nickname",
		RequiredJoins: []*JoinMetadata{
			{
				JoinTable: "users assignee_user",
				JoinOn:    "assignee_user.id = tasks.assignee_id",
				JoinType:  "LEFT JOIN",
			},
		},
		RequiresGroupBy: false,
	}

	g.fieldMetadata["creator"] = FieldMetadata{
		SQLExpr: "creator_user.nickname",
		RequiredJoins: []*JoinMetadata{
			{
				JoinTable: "users creator_user",
				JoinOn:    "creator_user.id = tasks.creator_id",
				JoinType:  "LEFT JOIN",
			},
		},
		RequiresGroupBy: false,
	}

	// ===== ЧИСЛОВЫЕ МЕТРИКИ =====
	g.fieldMetadata["subtasks_count"] = FieldMetadata{
		SQLExpr: "COALESCE(sub.cnt, 0)",
		RequiredJoins: []*JoinMetadata{
			{
				JoinTable: `(
            SELECT parent_task_id, COUNT(*) as cnt
            FROM tasks
            WHERE parent_task_id IS NOT NULL
            GROUP BY parent_task_id
        ) sub`,
				JoinOn:   "sub.parent_task_id = tasks.id",
				JoinType: "LEFT JOIN",
			},
		},
		RequiresGroupBy: true,
	}

	g.fieldMetadata["comments_count"] = FieldMetadata{
		SQLExpr: "COALESCE(com.cnt, 0)",
		RequiredJoins: []*JoinMetadata{
			{
				JoinTable: `(
            SELECT task_id, COUNT(*) as cnt
            FROM comments
            GROUP BY task_id
        ) com`,
				JoinOn:   "com.task_id = tasks.id",
				JoinType: "LEFT JOIN",
			},
		},
		RequiresGroupBy: true,
	}

	g.fieldMetadata["attachments_count"] = FieldMetadata{
		SQLExpr: "COALESCE(att.cnt, 0)",
		RequiredJoins: []*JoinMetadata{
			{
				JoinTable: `(
            SELECT task_id, COUNT(*) as cnt
            FROM attachments
            GROUP BY task_id
        ) att`,
				JoinOn:   "att.task_id = tasks.id",
				JoinType: "LEFT JOIN",
			},
		},
		RequiresGroupBy: true,
	}

	g.fieldMap["subtasks_closed"] = "(SELECT COUNT(*) FROM tasks subtasks WHERE subtasks.parent_task_id = tasks.id AND subtasks.closed_at IS NOT NULL)"

	// Возраст и время
	g.fieldMap["age_days"] = "EXTRACT(DAY FROM NOW() - tasks.created_at)"

	statusJoins := []*JoinMetadata{
		{
			JoinTable: `(
            SELECT 
                task_id,
                SUM(time_duration) FILTER (WHERE (old_value->>'status_type') = 'todo') as todo_seconds,
                SUM(time_duration) FILTER (WHERE (old_value->>'status_type') = 'progress') as progress_seconds,
                SUM(time_duration) FILTER (WHERE (old_value->>'status_type') = 'paused') as paused_seconds
            FROM changes
            WHERE field_name = 'status'
            GROUP BY task_id
        ) stat`,
			JoinOn:   "stat.task_id = tasks.id",
			JoinType: "LEFT JOIN",
		},
		{
			JoinTable: "project_statuses ps",
			JoinOn:    "ps.id = tasks.status_id",
			JoinType:  "LEFT JOIN",
		},
	}

	g.fieldMetadata["todo_days"] = FieldMetadata{
		SQLExpr: `
        COALESCE(stat.todo_seconds, 0) / 86400.0 +
        CASE WHEN ps.status_type = 'todo' 
             THEN EXTRACT(EPOCH FROM (NOW() - tasks.status_changed_at)) / 86400.0
             ELSE 0 
        END
    `,
		RequiredJoins:   statusJoins,
		RequiresGroupBy: true,
	}

	g.fieldMetadata["progress_days"] = FieldMetadata{
		SQLExpr: `
        COALESCE(stat.progress_seconds, 0) / 86400.0 +
        CASE WHEN ps.status_type = 'progress' 
             THEN EXTRACT(EPOCH FROM (NOW() - tasks.status_changed_at)) / 86400.0
             ELSE 0 
        END
    `,
		RequiredJoins:   statusJoins,
		RequiresGroupBy: true,
	}

	g.fieldMetadata["pause_days"] = FieldMetadata{
		SQLExpr: `
        COALESCE(stat.paused_seconds, 0) / 86400.0 +
        CASE WHEN ps.status_type = 'pause' 
             THEN EXTRACT(EPOCH FROM (NOW() - tasks.status_changed_at)) / 86400.0
             ELSE 0 
        END
    `,
		RequiredJoins:   statusJoins,
		RequiresGroupBy: true,
	}

	g.fieldMap["close_days"] = "COALESCE(EXTRACT(DAY FROM NOW() - tasks.closed_at), 0)"
	// ===== ДНИ ДЛЯ ЗАКРЫТЫХ ЗАДАЧ =====
	g.fieldMetadata["complete_days"] = FieldMetadata{
		SQLExpr: `
        CASE 
            WHEN tasks.closed_at IS NOT NULL AND ps.status_type = 'completed'
            THEN EXTRACT(DAY FROM NOW() - tasks.closed_at)
            ELSE NULL
        END
    `,
		RequiredJoins: []*JoinMetadata{
			{
				JoinTable: "project_statuses ps",
				JoinOn:    "ps.id = tasks.status_id",
				JoinType:  "LEFT JOIN",
			},
		},
		RequiresGroupBy: false,
	}

	g.fieldMetadata["cancel_days"] = FieldMetadata{
		SQLExpr: `
        CASE 
            WHEN tasks.closed_at IS NOT NULL AND ps.status_type = 'cancelled'
            THEN EXTRACT(DAY FROM NOW() - tasks.closed_at)
            ELSE NULL
        END
    `,
		RequiredJoins: []*JoinMetadata{
			{
				JoinTable: "project_statuses ps",
				JoinOn:    "ps.id = tasks.status_id",
				JoinType:  "LEFT JOIN",
			},
		},
		RequiresGroupBy: false,
	}

	// Относительно дат
	g.fieldMap["days_from_start"] = "EXTRACT(DAY FROM NOW() - tasks.start_date)"
	g.fieldMap["days_to_start"] = "EXTRACT(DAY FROM tasks.start_date - NOW())"
	g.fieldMap["days_from_overdue"] = "EXTRACT(DAY FROM NOW() - tasks.due_date)"
	g.fieldMap["days_to_overdue"] = "EXTRACT(DAY FROM tasks.due_date - NOW())"

	// ===== БУЛЕВЫ ПОЛЯ =====
	g.fieldMap["is_closed"] = "tasks.closed_at IS NOT NULL"
	g.fieldMetadata["is_completed"] = FieldMetadata{
		SQLExpr: "ps_completed.status_type IS NOT NULL",
		RequiredJoins: []*JoinMetadata{
			{
				JoinTable: "project_statuses ps_completed",
				JoinOn:    "ps_completed.id = tasks.status_id AND ps_completed.status_type = 'completed'",
				JoinType:  "LEFT JOIN",
			},
		},
		RequiresGroupBy: false,
	}

	g.fieldMetadata["is_cancelled"] = FieldMetadata{
		SQLExpr: "ps_cancelled.status_type IS NOT NULL",
		RequiredJoins: []*JoinMetadata{
			{
				JoinTable: "project_statuses ps_cancelled",
				JoinOn:    "ps_cancelled.id = tasks.status_id AND ps_cancelled.status_type = 'cancelled'",
				JoinType:  "LEFT JOIN",
			},
		},
		RequiresGroupBy: false,
	}
	g.fieldMap["has_due_date"] = "tasks.due_date IS NOT NULL"
	g.fieldMap["has_assignee"] = "tasks.assignee_id IS NOT NULL"
	g.fieldMap["is_overdue"] = "(tasks.due_date < NOW() AND tasks.closed_at IS NULL)"
	g.fieldMap["is_subtask"] = "tasks.parent_task_id IS NOT NULL"

	// ===== МАССИВЫ =====
	g.fieldMetadata["tags"] = FieldMetadata{
		SQLExpr: "COALESCE(tag.tags_array, '{}')",
		RequiredJoins: []*JoinMetadata{
			{
				JoinTable: `(
            SELECT 
                task_tags.task_id,
                ARRAY_AGG(tags.title::text) as tags_array
            FROM task_tags
            JOIN tags ON tags.id = task_tags.tag_id
            GROUP BY task_tags.task_id
        ) tag`,
				JoinOn:   "tag.task_id = tasks.id",
				JoinType: "LEFT JOIN",
			},
		},
		RequiresGroupBy: true,
	}
}

// Generate преобразует JSON-правило в SQL условие и возвращает список необходимых JOIN
func (g *SQLGenerator) Generate(ruleJSON string) (string, []string, bool, error) {
	var node ConditionNode
	if err := json.Unmarshal([]byte(ruleJSON), &node); err != nil {
		return "", nil, false, fmt.Errorf("invalid JSON: %w", err)
	}

	// Сбрасываем JOIN при каждом новом запросе
	g.requiredJoins = make(map[string]string)
	g.requiresGroupBy = false

	// Собираем все поля из условия для определения необходимых JOIN
	g.collectFields(&node)

	// Генерируем SQL условия
	conditionSQL, err := g.generateNode(&node)
	if err != nil {
		return "", nil, false, err
	}

	// Формируем список уникальных JOIN
	joins := make([]string, 0, len(g.requiredJoins))
	for _, joinSQL := range g.requiredJoins {
		joins = append(joins, joinSQL)
	}

	return conditionSQL, joins, g.requiresGroupBy, nil
}

// collectFields рекурсивно собирает все поля из AST
func (g *SQLGenerator) collectFields(node *ConditionNode) {
	if node == nil {
		return
	}

	if node.Field != "" {
		if meta, ok := g.fieldMetadata[node.Field]; ok {
			// Добавляем все JOINs из списка
			for _, join := range meta.RequiredJoins {
				joinKey := fmt.Sprintf("%s %s ON %s",
					join.JoinType,
					join.JoinTable,
					join.JoinOn)
				g.requiredJoins[joinKey] = joinKey
			}

			if meta.RequiresGroupBy {
				g.requiresGroupBy = true
			}
		}
	}

	g.collectFields(node.Condition1)
	g.collectFields(node.Condition2)
}

// generateNode рекурсивно генерирует SQL для узла
func (g *SQLGenerator) generateNode(node *ConditionNode) (string, error) {
	if node == nil {
		return "", fmt.Errorf("nil node")
	}

	// Лист (простое условие)
	if node.Field != "" {
		sql, err := g.generateLeaf(node)
		if err != nil {
			return "", err
		}
		if node.IsNot {
			return "NOT (" + sql + ")", nil
		}
		return sql, nil
	}

	// Внутренний узел с логикой (AND/OR)
	if node.Logic != "" {
		if node.Condition1 == nil || node.Condition2 == nil {
			return "", fmt.Errorf("logic node must have two conditions")
		}

		sql1, err := g.generateNode(node.Condition1)
		if err != nil {
			return "", err
		}
		sql2, err := g.generateNode(node.Condition2)
		if err != nil {
			return "", err
		}

		result := fmt.Sprintf("(%s %s %s)", sql1, strings.ToUpper(node.Logic), sql2)
		if node.IsBraced {
			result = "(" + result + ")"
		}

		if node.IsNot {
			return "NOT " + result, nil
		}
		return result, nil
	}

	// Узел с IsNot и Condition1 (для NOT)
	if node.IsNot && node.Condition1 != nil {
		sql, err := g.generateNode(node.Condition1)
		if err != nil {
			return "", err
		}
		return "NOT (" + sql + ")", nil
	}

	return "", fmt.Errorf("invalid node: neither field nor logic")
}

// generateLeaf генерирует SQL для листового узла (простое условие)
func (g *SQLGenerator) generateLeaf(node *ConditionNode) (string, error) {
	// Получаем SQL для поля
	var sqlField string

	// Поиск в fieldMetadata
	if meta, ok := g.fieldMetadata[node.Field]; ok {
		sqlField = meta.SQLExpr
	} else if val, ok := g.fieldMap[node.Field]; ok {
		sqlField = val
	} else {
		return "", fmt.Errorf("unknown field: %s", node.Field)
	}

	// Значение
	value := node.Value
	isTagsField := node.Field == "tags"

	// Генерация SQL в зависимости от оператора
	switch node.Operator {
	case "=", "!=", ">", "<", ">=", "<=":
		// Для булевых полей
		if strings.Contains(sqlField, "IS NOT NULL") ||
			strings.Contains(sqlField, "< NOW()") ||
			strings.Contains(sqlField, "EXISTS") {
			boolVal := g.formatBoolValue(value)
			return fmt.Sprintf("%s %s %s", sqlField, node.Operator, boolVal), nil
		}

		// Для полей assignee/creator при сравнении с NULL
		if (node.Field == "assignee" || node.Field == "creator") && value == nil {
			if node.Operator == "=" {
				return fmt.Sprintf("%s IS NULL", sqlField), nil
			}
			if node.Operator == "!=" {
				return fmt.Sprintf("%s IS NOT NULL", sqlField), nil
			}
		}

		if _, ok := value.(bool); ok || value == "true" || value == "false" {
			numVal := "0"
			if v, ok := value.(bool); ok && v {
				numVal = "1"
			} else if value == "true" || value == "1" {
				numVal = "1"
			}
			return fmt.Sprintf("%s %s %s", sqlField, node.Operator, numVal), nil
		}

		// Для обычных полей
		return fmt.Sprintf("%s %s %s", sqlField, node.Operator, g.formatValue(value)), nil

	case "contains":
		if isTagsField {
			// tags contains 'run' → точное совпадение
			// value уже строка, передаем как есть, без лишних кавычек
			return fmt.Sprintf("%s = ANY(%s)", g.formatStringValue(value), sqlField), nil
		}
		return fmt.Sprintf("%s ILIKE '%s'", sqlField, g.formatLike(value)), nil

	case "not_contains":
		if isTagsField {
			// tags not_contains 'run' → НЕ содержит точное значение
			return fmt.Sprintf("NOT (%s = ANY(%s))", g.formatStringValue(value), sqlField), nil
		}
		return fmt.Sprintf("%s NOT ILIKE '%s'", sqlField, g.formatLike(value)), nil

	case "in", "not_in":
		arr, ok := value.([]interface{})
		if !ok {
			return "", fmt.Errorf("operator %s requires array", node.Operator)
		}

		placeholders := make([]string, len(arr))
		for i, v := range arr {
			placeholders[i] = g.formatValue(v)
		}

		op := "IN"
		if node.Operator == "not_in" {
			op = "NOT IN"
		}
		return fmt.Sprintf("%s %s (%s)", sqlField, op, strings.Join(placeholders, ", ")), nil

	case "contains_any":
		if !isTagsField {
			return "", fmt.Errorf("operator contains_any can only be used with tags field")
		}
		arr, ok := value.([]interface{})
		if !ok {
			return "", fmt.Errorf("contains_any requires array")
		}
		placeholders := make([]string, len(arr))
		for i, v := range arr {
			placeholders[i] = g.formatValue(v)
		}
		// tags contains_any ('run','change') → пересекается
		return fmt.Sprintf("%s && ARRAY[%s]", sqlField, strings.Join(placeholders, ", ")), nil

	case "contains_all":
		if !isTagsField {
			return "", fmt.Errorf("operator contains_all can only be used with tags field")
		}
		arr, ok := value.([]interface{})
		if !ok {
			return "", fmt.Errorf("contains_all requires array")
		}
		placeholders := make([]string, len(arr))
		for i, v := range arr {
			placeholders[i] = g.formatValue(v)
		}
		// tags contains_all ('run','change') → содержит все
		return fmt.Sprintf("%s @> ARRAY[%s]", sqlField, strings.Join(placeholders, ", ")), nil

	case "is_null":
		if isTagsField {
			// tags is_null → задача без тегов
			return fmt.Sprintf("COALESCE(array_length(%s, 1), 0) = 0", sqlField), nil
		}
		return fmt.Sprintf("%s IS NULL", sqlField), nil

	case "is_not_null":
		if isTagsField {
			// tags is_not_null → задача имеет хотя бы один тег
			return fmt.Sprintf("COALESCE(array_length(%s, 1), 0) > 0", sqlField), nil
		}
		return fmt.Sprintf("%s IS NOT NULL", sqlField), nil

	default:
		return "", fmt.Errorf("unknown operator: %s", node.Operator)
	}
}

// formatStringValue форматирует строковое значение для точного сравнения (без лишних кавычек)
func (g *SQLGenerator) formatStringValue(v interface{}) string {
	switch val := v.(type) {
	case string:
		// Экранируем одинарные кавычки, но не добавляем лишние
		escaped := strings.ReplaceAll(val, "'", "''")
		return fmt.Sprintf("'%s'", escaped)
	default:
		return g.formatValue(v)
	}
}

// formatValue форматирует значение для SQL
func (g *SQLGenerator) formatValue(v interface{}) string {
	switch val := v.(type) {
	case string:
		// Экранируем одинарные кавычки
		escaped := strings.ReplaceAll(val, "'", "''")
		return fmt.Sprintf("'%s'", escaped)
	case int, int64, float64:
		return fmt.Sprintf("%v", val)
	case bool:
		if val {
			return "true"
		}
		return "false"
	case nil:
		return "NULL"
	default:
		return fmt.Sprintf("'%v'", val)
	}
}

// formatBoolValue форматирует булево значение (без кавычек)
func (g *SQLGenerator) formatBoolValue(v interface{}) string {
	switch val := v.(type) {
	case bool:
		if val {
			return "true"
		}
		return "false"
	case string:
		if val == "true" || val == "1" || val == "t" {
			return "true"
		}
		return "false"
	case int, int64, float64:
		if val == 1.0 {
			return "true"
		}
		return "false"
	default:
		return "false"
	}
}

// formatLike форматирует значение для ILIKE с экранированием
func (g *SQLGenerator) formatLike(v interface{}) string {
	str := fmt.Sprintf("%v", v)
	// Экранируем спецсимволы для LIKE
	str = strings.ReplaceAll(str, "'", "''")
	str = strings.ReplaceAll(str, "\\", "\\\\")
	str = strings.ReplaceAll(str, "%", "\\%")
	str = strings.ReplaceAll(str, "_", "\\_")
	return fmt.Sprintf("%%%s%%", str)
}
