package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"net/http"
	mwcontext "task-tracker/internal/handlers/middleware"
	"task-tracker/pkg/exceptions"

	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	"task-tracker/internal/service"
)

type MemberHandler interface {
	GetUserProjectProfile(c *gin.Context)
	GetMemberProfile(c *gin.Context)
	AddMember(c *gin.Context)
	RemoveMember(c *gin.Context)
	UpdateMember(c *gin.Context)
	LeaveProject(c *gin.Context)
	TransferOwnership(c *gin.Context)
}

type memberHandler struct {
	memberService service.MemberService
}

func NewMemberHandler(memberService service.MemberService) MemberHandler {
	return &memberHandler{
		memberService: memberService,
	}
}

func (h *memberHandler) GetUserProjectProfile(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
		return
	}
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}
	user, err := h.memberService.GetMemberProfile(c.Request.Context(), ctx.ProjectID, ctx.UserID)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
	}
	c.JSON(http.StatusOK, gin.H{"member": user})
}

func (h *memberHandler) GetMemberProfile(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
		return
	}
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}
	if ctx.MemberID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("member not found")))
	}
	user, err := h.memberService.GetMemberProfile(c.Request.Context(), ctx.ProjectID, ctx.MemberID)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
	}
	c.JSON(http.StatusOK, gin.H{"member": user})
}

func (h *memberHandler) AddMember(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
		return
	}
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}

	var req dto.AddMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	member, err := h.memberService.AddMember(c.Request.Context(), ctx.ProjectID, ctx.UserID, req)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusCreated, gin.H{"member": mapMemberToResponse(member)})
}

func (h *memberHandler) RemoveMember(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}

	targetUserID, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("invalid member id")))
		return
	}

	if err = h.memberService.RemoveMember(c.Request.Context(), ctx.ProjectID, targetUserID); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member removed successfully"})
}

func (h *memberHandler) UpdateMember(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}

	targetUserID, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("invalid member id")))
		return
	}

	var req dto.UpdateMemberRequest
	if err = c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	updatedMember, err := h.memberService.UpdateMember(c.Request.Context(), ctx.ProjectID, targetUserID, req)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Member updated successfully",
		"member":  mapMemberToResponse(updatedMember),
	})
}

func (h *memberHandler) LeaveProject(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
		return
	}
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}

	if err := h.memberService.LeaveProject(c.Request.Context(), ctx.ProjectID, ctx.UserID); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "You have left the project"})
}

func (h *memberHandler) TransferOwnership(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
		return
	}
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}

	var req struct {
		NewOwnerID uuid.UUID `json:"new_owner_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	if err := h.memberService.TransferOwnership(c.Request.Context(), ctx.ProjectID, ctx.UserID, req.NewOwnerID); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ownership transferred successfully"})
}

func mapMemberToResponse(m *models.ProjectMember) map[string]interface{} {
	resp := map[string]interface{}{
		"id":               m.ID,
		"user_id":          m.UserID,
		"permission_level": m.PermissionLevel,
		"joined_at":        m.JoinedAt,
		"granted_at":       m.GrantedAt,
	}

	if m.RoleInTeam != nil {
		resp["role_in_team"] = *m.RoleInTeam
	}

	if m.User.ID != uuid.Nil {
		resp["user"] = map[string]interface{}{
			"id":         m.User.ID,
			"email":      m.User.Email,
			"first_name": m.User.FirstName,
			"last_name":  m.User.LastName,
			"nickname":   m.User.Nickname,
			"color":      m.User.Color,
			"avatar_url": m.User.AvatarURL,
		}
	}

	if m.GrantedBy != nil && m.GrantedBy.ID != uuid.Nil {
		resp["granted_by"] = map[string]interface{}{
			"id":         m.GrantedBy.ID,
			"first_name": m.GrantedBy.FirstName,
			"last_name":  m.GrantedBy.LastName,
			"nickname":   m.GrantedBy.Nickname,
		}
	}

	return resp
}
