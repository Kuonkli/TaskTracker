package exceptions

import "errors"

// DomainError - ошибка, которая знает свой HTTP статус и код
type DomainError struct {
	Err    error
	Status int
	Code   string
}

func (e *DomainError) Error() string {
	return e.Err.Error()
}

func (e *DomainError) Unwrap() error {
	return e.Err
}

func NewDomainError(err error, status int, code string) *DomainError {
	return &DomainError{
		Err:    err,
		Status: status,
		Code:   code,
	}
}

func BadRequest(message string) *DomainError {
	return &DomainError{
		Err:    errors.New(message),
		Status: 400,
		Code:   "bad_request",
	}
}

func NotFound(resource string) *DomainError {
	return &DomainError{
		Err:    errors.New(resource + " not found"),
		Status: 404,
		Code:   "not_found",
	}
}

func Unauthorized(message string) *DomainError {
	return &DomainError{
		Err:    errors.New(message),
		Status: 401,
		Code:   "unauthorized",
	}
}

func Forbidden(message string) *DomainError {
	return &DomainError{
		Err:    errors.New(message),
		Status: 403,
		Code:   "forbidden",
	}
}

func Conflict(message string) *DomainError {
	return &DomainError{
		Err:    errors.New(message),
		Status: 409,
		Code:   "conflict",
	}
}

func ValidationError(message string) *DomainError {
	return &DomainError{
		Err:    errors.New(message),
		Status: 400,
		Code:   "validation_failed",
	}
}

var (
	// User errors
	ErrUserNotFound = &DomainError{
		Err:    errors.New("user not found"),
		Status: 404,
		Code:   "user_not_found",
	}

	ErrUserAlreadyExists = &DomainError{
		Err:    errors.New("user already exists"),
		Status: 409,
		Code:   "user_already_exists",
	}

	ErrInvalidCredentials = &DomainError{
		Err:    errors.New("invalid credentials"),
		Status: 401,
		Code:   "invalid_credentials",
	}

	ErrNicknameTaken = &DomainError{
		Err:    errors.New("nickname already taken"),
		Status: 409,
		Code:   "nickname_taken",
	}

	ErrEmailTaken = &DomainError{
		Err:    errors.New("email already taken"),
		Status: 409,
		Code:   "email_taken",
	}

	ErrPasswordTooWeak = &DomainError{
		Err:    errors.New("password too weak"),
		Status: 400,
		Code:   "password_too_weak",
	}

	ErrFailedToHash = &DomainError{
		Err:    errors.New("failed to hash password"),
		Status: 500,
		Code:   "failed_to_hash",
	}

	ErrFailedToCreateUser = &DomainError{
		Err:    errors.New("failed to create user"),
		Status: 500,
		Code:   "failed_to_create_user",
	}

	// Project errors
	ErrProjectNotFound = &DomainError{
		Err:    errors.New("project not found"),
		Status: 404,
		Code:   "project_not_found",
	}

	ErrProjectAccessDenied = &DomainError{
		Err:    errors.New("project access denied"),
		Status: 403,
		Code:   "project_access_denied",
	}

	ErrProjectNameExists = &DomainError{
		Err:    errors.New("project with this name already exists"),
		Status: 409,
		Code:   "project_name_exists",
	}

	ErrProjectOwnerRequired = &DomainError{
		Err:    errors.New("only project owner can perform this action"),
		Status: 403,
		Code:   "project_owner_required",
	}

	// Task errors
	ErrTaskNotFound = &DomainError{
		Err:    errors.New("task not found"),
		Status: 404,
		Code:   "task_not_found",
	}

	ErrParentTaskNotFound = &DomainError{
		Err:    errors.New("parent task not found"),
		Status: 404,
		Code:   "parent_task_not_found",
	}

	ErrTaskAccessDenied = &DomainError{
		Err:    errors.New("task access denied"),
		Status: 403,
		Code:   "task_access_denied",
	}

	ErrInvalidStatusTransition = &DomainError{
		Err:    errors.New("invalid status transition"),
		Status: 400,
		Code:   "invalid_status_transition",
	}

	ErrInvalidPriority = &DomainError{
		Err:    errors.New("invalid priority value"),
		Status: 400,
		Code:   "invalid_priority",
	}

	ErrTaskAlreadyClosed = &DomainError{
		Err:    errors.New("task already closed"),
		Status: 400,
		Code:   "task_already_closed",
	}

	ErrTaskHasSubtasks = &DomainError{
		Err:    errors.New("task has subtasks"),
		Status: 400,
		Code:   "task_has_subtasks",
	}

	ErrAlreadySubtask = &DomainError{
		Err:    errors.New("subtask cannot have subtasks"),
		Status: 400,
		Code:   "already_subtask",
	}

	ErrCircularTaskDependency = &DomainError{
		Err:    errors.New("circular task dependency detected"),
		Status: 400,
		Code:   "circular_dependency",
	}

	// Status errors
	ErrStatusNotFound = &DomainError{
		Err:    errors.New("status not found"),
		Status: 404,
		Code:   "status_not_found",
	}

	ErrStatusInUse = &DomainError{
		Err:    errors.New("status is in use and cannot be deleted"),
		Status: 409,
		Code:   "status_in_use",
	}

	// Column errors
	ErrColumnNotFound = &DomainError{
		Err:    errors.New("column not found"),
		Status: 404,
		Code:   "column_not_found",
	}

	ErrColumnAlreadyExists = &DomainError{
		Err:    errors.New("column already exists"),
		Status: 409,
		Code:   "column_already_exists",
	}

	// Lane errors
	ErrLaneNotFound = &DomainError{
		Err:    errors.New("lane not found"),
		Status: 404,
		Code:   "lane_not_found",
	}

	ErrInvalidRuleCondition = &DomainError{
		Err:    errors.New("invalid rule condition"),
		Status: 400,
		Code:   "invalid_rule_condition",
	}

	// Tag errors
	ErrTagNotFound = &DomainError{
		Err:    errors.New("tag not found"),
		Status: 404,
		Code:   "tag_not_found",
	}

	ErrTagAlreadyExists = &DomainError{
		Err:    errors.New("tag already exists"),
		Status: 409,
		Code:   "tag_already_exists",
	}

	// Member errors
	ErrMemberNotFound = &DomainError{
		Err:    errors.New("member not found"),
		Status: 404,
		Code:   "member_not_found",
	}

	ErrMemberAlreadyExists = &DomainError{
		Err:    errors.New("member already exists"),
		Status: 409,
		Code:   "member_already_exists",
	}

	ErrInsufficientPermissions = &DomainError{
		Err:    errors.New("insufficient permissions"),
		Status: 403,
		Code:   "insufficient_permissions",
	}

	ErrCannotRemoveOwner = &DomainError{
		Err:    errors.New("cannot remove project owner"),
		Status: 400,
		Code:   "cannot_remove_owner",
	}

	// Activity errors
	ErrActivityNotFound = &DomainError{
		Err:    errors.New("activity not found"),
		Status: 404,
		Code:   "activity_not_found",
	}

	// Change errors
	ErrChangeNotFound = &DomainError{
		Err:    errors.New("change not found"),
		Status: 404,
		Code:   "change_not_found",
	}

	// Comment errors
	ErrCommentNotFound = &DomainError{
		Err:    errors.New("comment not found"),
		Status: 404,
		Code:   "comment_not_found",
	}

	ErrCommentAccessDenied = &DomainError{
		Err:    errors.New("comment access denied"),
		Status: 403,
		Code:   "comment_access_denied",
	}

	// Attachment errors
	ErrAttachmentNotFound = &DomainError{
		Err:    errors.New("attachment not found"),
		Status: 404,
		Code:   "attachment_not_found",
	}

	ErrAttachmentTooLarge = &DomainError{
		Err:    errors.New("attachment too large"),
		Status: 400,
		Code:   "attachment_too_large",
	}

	ErrInvalidFileType = &DomainError{
		Err:    errors.New("invalid file type"),
		Status: 400,
		Code:   "invalid_file_type",
	}

	ErrUploadFailed = &DomainError{
		Err:    errors.New("upload failed"),
		Status: 500,
		Code:   "upload_failed",
	}

	// Invitation errors
	ErrInvitationNotFound = &DomainError{
		Err:    errors.New("invitation not found"),
		Status: 404,
		Code:   "invitation_not_found",
	}

	ErrInvitationExpired = &DomainError{
		Err:    errors.New("invitation expired"),
		Status: 400,
		Code:   "invitation_expired",
	}

	// Notification errors
	ErrNotificationNotFound = &DomainError{
		Err:    errors.New("notification not found"),
		Status: 404,
		Code:   "notification_not_found",
	}

	// Database errors
	ErrDatabaseConnection = &DomainError{
		Err:    errors.New("database connection failed"),
		Status: 503,
		Code:   "database_connection_error",
	}

	ErrDuplicateEntry = &DomainError{
		Err:    errors.New("duplicate entry"),
		Status: 409,
		Code:   "duplicate_entry",
	}

	ErrForeignKeyViolation = &DomainError{
		Err:    errors.New("foreign key violation"),
		Status: 400,
		Code:   "foreign_key_violation",
	}

	// Validation errors
	ErrValidationFailed = &DomainError{
		Err:    errors.New("validation failed"),
		Status: 400,
		Code:   "validation_failed",
	}

	ErrInvalidPagination = &DomainError{
		Err:    errors.New("invalid pagination parameters"),
		Status: 400,
		Code:   "invalid_pagination",
	}

	// Business logic errors
	ErrBusinessRuleViolation = &DomainError{
		Err:    errors.New("business rule violation"),
		Status: 422,
		Code:   "business_rule_violation",
	}
)
