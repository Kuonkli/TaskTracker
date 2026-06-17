// uow/attachment_uow.go

package uow

import (
	"context"

	"gorm.io/gorm"
	"task-tracker/internal/repository"
)

// AttachmentUoW - unit of work для работы с вложениями
type AttachmentUoW interface {
	AttachmentRepo() repository.AttachmentRepository
}

// AttachmentUoWFactory - фабрика для создания UoW
type AttachmentUoWFactory interface {
	New() AttachmentUoW
	NewTransaction(ctx context.Context) (AttachmentUoWTx, error)
}

// AttachmentUoWTx - UoW с поддержкой транзакций
type AttachmentUoWTx interface {
	AttachmentUoW
	Commit(ctx context.Context) error
	Rollback()
}

// attachmentUoWFactory - реализация фабрики
type attachmentUoWFactory struct {
	db *gorm.DB
}

// NewAttachmentUoWFactory создает новую фабрику
func NewAttachmentUoWFactory(db *gorm.DB) AttachmentUoWFactory {
	return &attachmentUoWFactory{db: db}
}

// New создает обычный (не транзакционный) UoW
func (f *attachmentUoWFactory) New() AttachmentUoW {
	return &attachmentUoWImpl{
		db:             f.db,
		attachmentRepo: repository.NewAttachmentRepository(f.db),
	}
}

// NewTransaction создает транзакционный UoW
func (f *attachmentUoWFactory) NewTransaction(ctx context.Context) (AttachmentUoWTx, error) {
	tx := f.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	return &attachmentUoWImpl{
		db:             tx,
		attachmentRepo: repository.NewAttachmentRepository(tx),
	}, nil
}

// attachmentUoWImpl - реализация UoW
type attachmentUoWImpl struct {
	db             *gorm.DB
	attachmentRepo repository.AttachmentRepository
}

func (u *attachmentUoWImpl) AttachmentRepo() repository.AttachmentRepository {
	return u.attachmentRepo
}

func (u *attachmentUoWImpl) Commit(ctx context.Context) error {
	return u.db.WithContext(ctx).Commit().Error
}

func (u *attachmentUoWImpl) Rollback() {
	u.db.Rollback()
}
