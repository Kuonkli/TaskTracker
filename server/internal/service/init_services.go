package service

import (
	"gorm.io/gorm"
	"task-tracker/internal/uow"
)

// Services содержит все сервисы приложения
type Services struct {
	User     UserService
	Project  ProjectService
	Member   MemberService
	Task     TaskService
	Activity ActivityService
	Board    BoardService
	Status   StatusService
	Tag      TagService
}

// NewServices создает все сервисы
func NewServices(db *gorm.DB) *Services {
	return &Services{
		User:     NewUserService(uow.NewUserUoWFactory(db)),
		Project:  NewProjectService(uow.NewProjectUoWFactory(db)),
		Member:   NewMemberService(uow.NewMemberUoWFactory(db)),
		Task:     NewTaskService(uow.NewTaskUoWFactory(db)),
		Activity: NewActivityService(uow.NewActivityUoWFactory(db)),
		Board:    NewBoardService(uow.NewBoardUoWFactory(db)),
		Status:   NewStatusService(uow.NewStatusUoWFactory(db)),
		Tag:      NewTagService(uow.NewTagUoWFactory(db)),
	}
}
