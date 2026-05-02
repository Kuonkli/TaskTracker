package pkg

// ConditionNode — структура для хранения правила из БД
type ConditionNode struct {
	IsNot      bool           `json:"is_not,omitempty"`
	Logic      string         `json:"logic,omitempty"`
	Field      string         `json:"field,omitempty"`
	Operator   string         `json:"operator,omitempty"`
	Value      interface{}    `json:"value,omitempty"`
	Condition1 *ConditionNode `json:"condition_1,omitempty"`
	Condition2 *ConditionNode `json:"condition_2,omitempty"`
}
