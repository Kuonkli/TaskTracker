package pkg

import (
	"fmt"
	"strconv"
	"strings"
	"unicode"
)

type TokenType int

const (
	TokenEOF TokenType = iota
	TokenLParen
	TokenRParen
	TokenNot
	TokenAnd
	TokenOr
	TokenField
	TokenOperator
	TokenValue
	TokenString
	TokenNumber
	TokenComma
)

type Token struct {
	Type  TokenType
	Value string
	Pos   int
}

// FieldSchema описывает разрешенные операторы для поля
type FieldSchema struct {
	AllowedOperators map[string]bool
	IsStringField    bool
	CanBeNull        bool
}

type Validators struct {
	fields map[string]FieldSchema
}

func NewValidators() *Validators {
	return &Validators{
		fields: map[string]FieldSchema{
			// ===== СТРОКОВЫЕ ПОЛЯ =====
			"title": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, "contains": true, "not_contains": true,
					"in": true, "not_in": true, "is_null": true, "is_not_null": true,
				},
				IsStringField: true,
				CanBeNull:     false,
			},
			"description": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, "contains": true, "not_contains": true,
					"in": true, "not_in": true, "is_null": true, "is_not_null": true,
				},
				IsStringField: true,
				CanBeNull:     true,
			},
			"priority": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, "in": true, "not_in": true,
				},
				IsStringField: true,
				CanBeNull:     false,
			},

			// ===== ССЫЛКИ =====
			"assignee": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, "in": true, "not_in": true,
					"is_null": true, "is_not_null": true,
				},
				IsStringField: true,
				CanBeNull:     true,
			},
			"creator": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, "in": true, "not_in": true,
				},
				IsStringField: true,
				CanBeNull:     false,
			},

			// ===== ЧИСЛОВЫЕ МЕТРИКИ =====
			"subtasks_count": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"subtasks_closed": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"comments_count": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"attachments_count": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"age_days": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"todo_days": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"progress_days": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"pause_days": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"close_days": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"complete_days": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"cancel_days": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"days_from_start": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"days_to_start": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"days_from_overdue": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"days_to_overdue": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},

			// ===== БУЛЕВЫ ПОЛЯ =====
			"is_closed": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"is_completed": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"is_cancelled": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"has_due_date": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"has_assignee": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"is_overdue": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},
			"is_subtask": {
				AllowedOperators: map[string]bool{
					"=": true, "!=": true,
				},
				IsStringField: false,
				CanBeNull:     false,
			},

			// ===== МАССИВЫ =====
			"tags": {
				AllowedOperators: map[string]bool{
					"contains": true, "not_contains": true,
					"contains_any": true, "contains_all": true,
					"is_null": true, "is_not_null": true,
				},
				IsStringField: true,
				CanBeNull:     true,
			},
		},
	}
}

func (v *Validators) IsOperatorAllowed(field, operator string) bool {
	schema, exists := v.fields[field]
	if !exists {
		return false
	}
	return schema.AllowedOperators[operator]
}

func (v *Validators) IsStringField(field string) bool {
	schema, exists := v.fields[field]
	if !exists {
		return false
	}
	return schema.IsStringField
}

func (v *Validators) CanBeNull(field string) bool {
	schema, exists := v.fields[field]
	if !exists {
		return false
	}
	return schema.CanBeNull
}

func (v *Validators) GetFieldSchema(field string) (FieldSchema, bool) {
	schema, exists := v.fields[field]
	return schema, exists
}

type RuleParser struct {
	input      string
	tokens     []Token
	pos        int
	validators *Validators
}

func NewRuleParser(input string) *RuleParser {
	return &RuleParser{
		input:      input,
		validators: NewValidators(),
	}
}

func isOperator(s string) bool {
	operators := map[string]bool{
		"=": true, "!=": true, ">": true, "<": true,
		">=": true, "<=": true, "contains": true, "not_contains": true,
		"in": true, "not_in": true,
		"contains_any": true, "contains_all": true,
		"is_null": true, "is_not_null": true,
	}
	return operators[s]
}

func (p *RuleParser) needsQuotes(field string, valueToken *Token) bool {
	schema, exists := p.validators.GetFieldSchema(field)
	if !exists {
		return false
	}

	if valueToken.Value == "null" {
		return false
	}
	if valueToken.Value == "true" || valueToken.Value == "false" {
		return false
	}
	if valueToken.Type == TokenNumber {
		return false
	}
	return schema.IsStringField
}

func (p *RuleParser) Parse() (*ConditionNode, error) {
	if err := p.tokenize(); err != nil {
		return nil, err
	}

	if len(p.tokens) == 0 {
		return nil, fmt.Errorf("empty rule")
	}

	p.pos = 0
	node, err := p.parseOrExpression()
	if err != nil {
		return nil, err
	}

	if p.pos < len(p.tokens) {
		return nil, fmt.Errorf("unexpected token at position %d: %s",
			p.tokens[p.pos].Pos, p.tokens[p.pos].Value)
	}

	return node, nil
}

func (p *RuleParser) tokenize() error {
	input := p.input
	i := 0
	var tokens []Token

	for i < len(input) {
		ch := input[i]

		if unicode.IsSpace(rune(ch)) {
			i++
			continue
		}

		switch ch {
		case '(':
			tokens = append(tokens, Token{Type: TokenLParen, Value: "(", Pos: i})
			i++
		case ')':
			tokens = append(tokens, Token{Type: TokenRParen, Value: ")", Pos: i})
			i++
		case ',':
			tokens = append(tokens, Token{Type: TokenComma, Value: ",", Pos: i})
			i++
		case '\'', '"':
			quoteChar := ch
			start := i
			i++

			for i < len(input) && input[i] != quoteChar {
				i++
			}

			if i >= len(input) {
				return fmt.Errorf("unclosed quote at position %d", start)
			}

			value := input[start+1 : i]
			i++

			tokens = append(tokens, Token{Type: TokenString, Value: value, Pos: start})
		default:
			start := i
			for i < len(input) && !unicode.IsSpace(rune(input[i])) &&
				input[i] != '(' && input[i] != ')' && input[i] != ',' {
				i++
			}
			word := input[start:i]

			switch strings.ToUpper(word) {
			case "AND":
				tokens = append(tokens, Token{Type: TokenAnd, Value: "AND", Pos: start})
			case "OR":
				tokens = append(tokens, Token{Type: TokenOr, Value: "OR", Pos: start})
			case "NOT":
				tokens = append(tokens, Token{Type: TokenNot, Value: "NOT", Pos: start})
			default:
				if isOperator(word) {
					tokens = append(tokens, Token{Type: TokenOperator, Value: word, Pos: start})
				} else if _, exists := p.validators.GetFieldSchema(word); exists {
					tokens = append(tokens, Token{Type: TokenField, Value: word, Pos: start})
				} else {
					if _, err := strconv.ParseFloat(word, 64); err == nil {
						tokens = append(tokens, Token{Type: TokenNumber, Value: word, Pos: start})
					} else {
						tokens = append(tokens, Token{Type: TokenValue, Value: word, Pos: start})
					}
				}
			}
		}
	}

	p.tokens = tokens
	return nil
}

// parseOrExpression - самый низкий приоритет (OR)
func (p *RuleParser) parseOrExpression() (*ConditionNode, error) {
	left, err := p.parseAndExpression()
	if err != nil {
		return nil, err
	}

	for p.pos < len(p.tokens) && p.tokens[p.pos].Type == TokenOr {
		p.pos++
		right, err := p.parseAndExpression()
		if err != nil {
			return nil, err
		}
		left = &ConditionNode{
			Logic:      "or",
			Condition1: left,
			Condition2: right,
		}
	}
	return left, nil
}

// parseAndExpression - средний приоритет (AND)
func (p *RuleParser) parseAndExpression() (*ConditionNode, error) {
	left, err := p.parsePrimary()
	if err != nil {
		return nil, err
	}

	for p.pos < len(p.tokens) && p.tokens[p.pos].Type == TokenAnd {
		p.pos++
		right, err := p.parsePrimary()
		if err != nil {
			return nil, err
		}
		left = &ConditionNode{
			Logic:      "and",
			Condition1: left,
			Condition2: right,
		}
	}
	return left, nil
}

// parsePrimary - самый высокий приоритет (NOT, скобки, простые условия)
func (p *RuleParser) parsePrimary() (*ConditionNode, error) {
	if p.pos >= len(p.tokens) {
		return nil, fmt.Errorf("unexpected end of expression")
	}

	// Обработка NOT
	if p.tokens[p.pos].Type == TokenNot {
		p.pos++
		if p.pos >= len(p.tokens) || p.tokens[p.pos].Type != TokenLParen {
			return nil, fmt.Errorf("expected '(' after NOT")
		}
		p.pos++
		expr, err := p.parseOrExpression()
		if err != nil {
			return nil, err
		}
		if p.pos >= len(p.tokens) || p.tokens[p.pos].Type != TokenRParen {
			return nil, fmt.Errorf("missing closing parenthesis for NOT")
		}
		p.pos++
		return &ConditionNode{IsNot: true, Condition1: expr}, nil
	}

	// Обработка скобок
	if p.tokens[p.pos].Type == TokenLParen {
		p.pos++
		expr, err := p.parseOrExpression()
		if err != nil {
			return nil, err
		}
		if p.pos >= len(p.tokens) || p.tokens[p.pos].Type != TokenRParen {
			return nil, fmt.Errorf("missing closing parenthesis")
		}
		p.pos++

		// Помечаем, что это выражение было в скобках
		expr.IsBraced = true

		return expr, nil
	}

	// Обработка is_null/is_not_null
	if p.pos+1 < len(p.tokens) {
		nextTok := p.tokens[p.pos+1]
		if nextTok.Type == TokenOperator && (nextTok.Value == "is_null" || nextTok.Value == "is_not_null") {
			field := p.tokens[p.pos].Value
			if p.tokens[p.pos].Type != TokenField {
				return nil, fmt.Errorf("expected field before is_null/is_not_null")
			}

			if !p.validators.CanBeNull(field) {
				return nil, fmt.Errorf("field '%s' cannot be NULL, operator '%s' is not allowed", field, nextTok.Value)
			}

			if !p.validators.IsOperatorAllowed(field, nextTok.Value) {
				return nil, fmt.Errorf("operator '%s' is not allowed for field '%s'", nextTok.Value, field)
			}

			operator := nextTok.Value
			p.pos += 2
			return &ConditionNode{
				Field:    field,
				Operator: operator,
				Value:    nil,
			}, nil
		}
	}

	// Простое условие
	return p.parseSimpleCondition()
}

func (p *RuleParser) parseSimpleCondition() (*ConditionNode, error) {
	if p.pos+2 >= len(p.tokens) {
		return nil, fmt.Errorf("incomplete condition at position %d",
			p.tokens[minInt(p.pos, len(p.tokens)-1)].Pos)
	}

	if p.tokens[p.pos].Type != TokenField {
		return nil, fmt.Errorf("expected field at position %d, got %s",
			p.tokens[p.pos].Pos, p.tokens[p.pos].Value)
	}
	field := p.tokens[p.pos].Value
	p.pos++

	if p.tokens[p.pos].Type != TokenOperator {
		return nil, fmt.Errorf("expected operator at position %d, got %s",
			p.tokens[p.pos].Pos, p.tokens[p.pos].Value)
	}
	operator := p.tokens[p.pos].Value
	p.pos++

	if !p.validators.IsOperatorAllowed(field, operator) {
		return nil, fmt.Errorf("operator '%s' is not allowed for field '%s'", operator, field)
	}

	var value interface{}

	// Обработка списков
	if operator == "in" || operator == "not_in" || operator == "contains_any" || operator == "contains_all" {
		if p.pos >= len(p.tokens) || p.tokens[p.pos].Type != TokenLParen {
			return nil, fmt.Errorf("expected '(' after %s operator", operator)
		}
		p.pos++

		var values []interface{}
		for {
			if p.pos >= len(p.tokens) {
				return nil, fmt.Errorf("unexpected end of list")
			}

			tok := p.tokens[p.pos]

			if p.validators.IsStringField(field) && tok.Value != "null" && tok.Type != TokenString {
				return nil, fmt.Errorf("string field '%s' requires quoted values in list, got %s", field, tok.Value)
			}

			switch tok.Type {
			case TokenNumber:
				if p.validators.IsStringField(field) {
					return nil, fmt.Errorf("string field '%s' cannot have numeric value in list", field)
				}
				num, _ := strconv.ParseFloat(tok.Value, 64)
				values = append(values, num)
			case TokenString:
				values = append(values, tok.Value)
			default:
				if tok.Value == "null" {
					values = append(values, nil)
				} else {
					values = append(values, tok.Value)
				}
			}
			p.pos++

			if p.pos >= len(p.tokens) {
				return nil, fmt.Errorf("unexpected end of list")
			}

			if p.tokens[p.pos].Type == TokenRParen {
				p.pos++
				break
			} else if p.tokens[p.pos].Type == TokenComma {
				p.pos++
				continue
			} else {
				return nil, fmt.Errorf("expected ',' or ')' in list")
			}
		}
		value = values
	} else {
		// Обработка простого значения
		if p.pos >= len(p.tokens) {
			return nil, fmt.Errorf("expected value after operator")
		}

		tok := p.tokens[p.pos]

		if p.needsQuotes(field, &tok) && tok.Type != TokenString {
			return nil, fmt.Errorf("string field '%s' requires quoted value, got '%s'", field, tok.Value)
		}

		if tok.Value == "null" {
			if !p.validators.CanBeNull(field) {
				return nil, fmt.Errorf("field '%s' cannot be NULL", field)
			}
			value = nil
		} else {
			switch tok.Type {
			case TokenNumber:
				num, _ := strconv.ParseFloat(tok.Value, 64)
				value = num
			case TokenString:
				value = tok.Value
			case TokenValue:
				if _, err := strconv.ParseFloat(tok.Value, 64); err == nil {
					value, _ = strconv.ParseFloat(tok.Value, 64)
				} else if tok.Value == "true" || tok.Value == "false" {
					value = tok.Value == "true"
				} else {
					if p.validators.IsStringField(field) {
						return nil, fmt.Errorf("string field '%s' requires quoted value, got '%s'", field, tok.Value)
					}
					value = tok.Value
				}
			default:
				return nil, fmt.Errorf("expected value, got %s", tok.Value)
			}
		}
		p.pos++
	}

	return &ConditionNode{
		Field:    field,
		Operator: operator,
		Value:    value,
	}, nil
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
