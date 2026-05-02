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
	SQLExpr      string        // SQL выражение для поля
	RequiredJoin *JoinMetadata // JOIN, если требуется (nil если не нужен)
}

// SQLGenerator преобразует ConditionNode в SQL WHERE clause
type SQLGenerator struct {
	fieldMap      map[string]string
	fieldMetadata map[string]FieldMetadata
	requiredJoins map[string]string // уникальные JOIN для текущего запроса
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
		RequiredJoin: &JoinMetadata{
			JoinTable: "users assignee_user",
			JoinOn:    "assignee_user.id = tasks.assignee_id",
			JoinType:  "LEFT JOIN",
		},
	}

	g.fieldMetadata["creator"] = FieldMetadata{
		SQLExpr: "creator_user.nickname",
		RequiredJoin: &JoinMetadata{
			JoinTable: "users creator_user",
			JoinOn:    "creator_user.id = tasks.creator_id",
			JoinType:  "LEFT JOIN",
		},
	}

	// ===== ЧИСЛОВЫЕ МЕТРИКИ =====
	g.fieldMap["subtasks_count"] = "(SELECT COUNT(*) FROM tasks subtasks WHERE subtasks.parent_task_id = tasks.id)"
	g.fieldMap["subtasks_closed"] = "(SELECT COUNT(*) FROM tasks subtasks WHERE subtasks.parent_task_id = tasks.id AND subtasks.closed_at IS NOT NULL)"
	g.fieldMap["comments_count"] = "(SELECT COUNT(*) FROM comments WHERE comments.task_id = tasks.id)"
	g.fieldMap["attachments_count"] = "(SELECT COUNT(*) FROM attachments WHERE attachments.task_id = tasks.id)"

	// Возраст и время
	g.fieldMap["age_days"] = "EXTRACT(DAY FROM NOW() - tasks.created_at)"
	g.fieldMap["todo_days"] = `(
    SELECT COALESCE(SUM(time_duration), 0) / 86400.0 + 
    CASE 
        WHEN (SELECT ps.status_type FROM project_statuses ps WHERE ps.id = tasks.status_id) = 'todo' 
        THEN EXTRACT(EPOCH FROM (NOW() - COALESCE((
            SELECT created_at FROM changes 
            WHERE changes.task_id = tasks.id 
            AND changes.field_name = 'status'
            AND changes.new_value->>'status_type' = 'todo'
            ORDER BY created_at DESC LIMIT 1
        ), tasks.created_at))) / 86400.0
        ELSE 0
    END
    FROM changes 
    WHERE changes.task_id = tasks.id 
    AND changes.field_name = 'status'
    AND changes.old_value->>'status_type' = 'todo'
)`

	g.fieldMap["progress_days"] = `(
    SELECT COALESCE(SUM(time_duration), 0) / 86400.0 + 
    CASE 
        WHEN (SELECT ps.status_type FROM project_statuses ps WHERE ps.id = tasks.status_id) = 'progress' 
        THEN EXTRACT(EPOCH FROM (NOW() - COALESCE((
            SELECT created_at FROM changes 
            WHERE changes.task_id = tasks.id 
            AND changes.field_name = 'status'
            AND changes.new_value->>'status_type' = 'progress'
            ORDER BY created_at DESC LIMIT 1
        ), tasks.created_at))) / 86400.0
        ELSE 0
    END
    FROM changes 
    WHERE changes.task_id = tasks.id 
    AND changes.field_name = 'status'
    AND changes.old_value->>'status_type' = 'progress'
)`

	g.fieldMap["pause_days"] = `(
    SELECT COALESCE(SUM(time_duration), 0) / 86400.0 + 
    CASE 
        WHEN (SELECT ps.status_type FROM project_statuses ps WHERE ps.id = tasks.status_id) = 'paused' 
        THEN EXTRACT(EPOCH FROM (NOW() - COALESCE((
            SELECT created_at FROM changes 
            WHERE changes.task_id = tasks.id 
            AND changes.field_name = 'status'
            AND changes.new_value->>'status_type' = 'paused'
            ORDER BY created_at DESC LIMIT 1
        ), tasks.created_at))) / 86400.0
        ELSE 0
    END
    FROM changes 
    WHERE changes.task_id = tasks.id 
    AND changes.old_value->>'status_type' = 'paused'
)`
	g.fieldMap["close_days"] = "EXTRACT(DAY FROM NOW() - tasks.closed_at)"
	g.fieldMap["complete_days"] = `(
    SELECT EXTRACT(DAY FROM NOW() - tasks.closed_at)
    WHERE EXISTS (
        SELECT 1 FROM project_statuses ps 
        WHERE ps.id = tasks.status_id AND ps.status_type = 'completed'
    )
)`

	g.fieldMap["cancel_days"] = `(
    SELECT EXTRACT(DAY FROM NOW() - tasks.closed_at)
    WHERE EXISTS (
        SELECT 1 FROM project_statuses ps 
        WHERE ps.id = tasks.status_id AND ps.status_type = 'cancelled'
    )
)`

	// Относительно дат
	g.fieldMap["days_from_start"] = "EXTRACT(DAY FROM NOW() - tasks.start_date)"
	g.fieldMap["days_to_start"] = "EXTRACT(DAY FROM tasks.start_date - NOW())"
	g.fieldMap["days_from_overdue"] = "EXTRACT(DAY FROM NOW() - tasks.due_date)"
	g.fieldMap["days_to_overdue"] = "EXTRACT(DAY FROM tasks.due_date - NOW())"

	// ===== БУЛЕВЫ ПОЛЯ =====
	g.fieldMap["is_closed"] = "tasks.closed_at IS NOT NULL"
	g.fieldMap["is_completed"] = `EXISTS (
    SELECT 1 FROM project_statuses ps 
    WHERE ps.id = tasks.status_id AND ps.status_type = 'completed'
)`
	g.fieldMap["is_cancelled"] = `EXISTS (
    SELECT 1 FROM project_statuses ps 
    WHERE ps.id = tasks.status_id AND ps.status_type = 'cancelled'
)`
	g.fieldMap["has_due_date"] = "tasks.due_date IS NOT NULL"
	g.fieldMap["has_assignee"] = "tasks.assignee_id IS NOT NULL"
	g.fieldMap["is_overdue"] = "(tasks.due_date < NOW() AND tasks.closed_at IS NULL)"
	g.fieldMap["is_subtask"] = "tasks.parent_task_id IS NOT NULL"

	// ===== МАССИВЫ =====
	g.fieldMap["tags"] = "ARRAY(SELECT tags.title FROM task_tags JOIN tags ON tags.id = task_tags.tag_id WHERE task_tags.task_id = tasks.id)"
}

// Generate преобразует JSON-правило в SQL условие и возвращает список необходимых JOIN
func (g *SQLGenerator) Generate(ruleJSON string) (string, []string, error) {
	var node ConditionNode
	if err := json.Unmarshal([]byte(ruleJSON), &node); err != nil {
		return "", nil, fmt.Errorf("invalid JSON: %w", err)
	}

	// Сбрасываем JOIN при каждом новом запросе
	g.requiredJoins = make(map[string]string)

	// Собираем все поля из условия для определения необходимых JOIN
	g.collectFields(&node)

	// Генерируем SQL условия
	conditionSQL, err := g.generateNode(&node)
	if err != nil {
		return "", nil, err
	}

	// Формируем список уникальных JOIN
	joins := make([]string, 0, len(g.requiredJoins))
	for _, joinSQL := range g.requiredJoins {
		joins = append(joins, joinSQL)
	}

	return conditionSQL, joins, nil
}

// collectFields рекурсивно собирает все поля из AST
func (g *SQLGenerator) collectFields(node *ConditionNode) {
	if node == nil {
		return
	}

	// Если это лист с полем
	if node.Field != "" {
		// Проверяем, есть ли метаданные с JOIN для этого поля
		if meta, ok := g.fieldMetadata[node.Field]; ok && meta.RequiredJoin != nil {
			joinKey := fmt.Sprintf("%s %s ON %s",
				meta.RequiredJoin.JoinType,
				meta.RequiredJoin.JoinTable,
				meta.RequiredJoin.JoinOn)
			g.requiredJoins[joinKey] = joinKey
		}
	}

	// Рекурсивно обрабатываем дочерние узлы
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

	// Сначала проверяем в fieldMetadata (поля с JOIN)
	if meta, ok := g.fieldMetadata[node.Field]; ok {
		sqlField = meta.SQLExpr
	} else {
		// Иначе в fieldMap
		var ok bool
		sqlField, ok = g.fieldMap[node.Field]
		if !ok {
			return "", fmt.Errorf("unknown field: %s", node.Field)
		}
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

// BuildQuery строит полный SQL запрос с JOIN
func (g *SQLGenerator) BuildQuery(projectID string, ruleJSON string) (string, []interface{}, error) {
	conditionSQL, joins, err := g.Generate(ruleJSON)
	if err != nil {
		return "", nil, err
	}

	// Собираем JOIN в строку
	joinClause := ""
	if len(joins) > 0 {
		joinClause = strings.Join(joins, "\n")
	}

	// Формируем полный запрос
	query := fmt.Sprintf(`
		SELECT tasks.* 
		FROM tasks
		%s
		WHERE tasks.project_id = $1 
		AND %s
		ORDER BY tasks.created_at
	`, joinClause, conditionSQL)

	return query, []interface{}{projectID}, nil
}
