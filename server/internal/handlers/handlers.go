package handlers

import (
	"task-tracker/internal/service"
)

// Handlers содержит все хендлеры приложения
type Handlers struct {
	User         UserHandler
	Project      ProjectHandler
	Member       MemberHandler
	Task         TaskHandler
	TaskActivity ActivityHandler
	Board        BoardHandler
	Tag          TagHandler
	Status       StatusHandler
}

// NewHandlers создает все хендлеры
func NewHandlers(services *service.Services, jwtSecret string) *Handlers {
	return &Handlers{
		User:         NewUserHandler(services.User, jwtSecret),
		Project:      NewProjectHandler(services.Project),
		Member:       NewMemberHandler(services.Member),
		Task:         NewTaskHandler(services.Task),
		TaskActivity: NewTaskActivityHandler(services.Activity),
		Board:        NewBoardHandler(services.Board),
		Tag:          NewTagHandler(services.Tag),
		Status:       NewStatusHandler(services.Status),
	}
}
