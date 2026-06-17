package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"net/http"
	mwcontext "task-tracker/internal/handlers/middleware"
	"task-tracker/pkg/exceptions"

	"task-tracker/internal/dto"
	"task-tracker/internal/service"
	"task-tracker/pkg/utils"
)

type UserHandler interface {
	Register(*gin.Context)
	Login(*gin.Context)
	UpdateProfile(*gin.Context)
	GetProfile(*gin.Context)
	SearchUser(*gin.Context)
	Logout(c *gin.Context)
}

type userHandler struct {
	service   service.UserService
	jwtSecret string
}

func NewUserHandler(service service.UserService, jwtSecret string) UserHandler {
	return &userHandler{
		service:   service,
		jwtSecret: jwtSecret,
	}
}

func (h *userHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	user, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	accessToken, err := utils.GenerateAccess(user.ID.String(), h.jwtSecret)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}
	refreshToken, err := utils.GenerateRefresh(user.ID.String(), h.jwtSecret)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.SetCookie("access_token", accessToken, 900, "/", "", false, true)
	c.SetCookie("refresh_token", refreshToken, 259200, "/", "", false, true)

	c.JSON(http.StatusCreated, gin.H{
		"user":          user,
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

func (h *userHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	user, err := h.service.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	accessToken, err := utils.GenerateAccess(user.ID.String(), h.jwtSecret)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}
	refreshToken, err := utils.GenerateRefresh(user.ID.String(), h.jwtSecret)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.SetCookie("access_token", accessToken, 900, "/", "", false, true)
	c.SetCookie("refresh_token", refreshToken, 259200, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"user":          user,
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

func (h *userHandler) GetProfile(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
		return
	}

	user, err := h.service.GetProfile(c.Request.Context(), ctx.UserID)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

func (h *userHandler) UpdateProfile(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
		return
	}

	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	if err := h.service.UpdateProfile(c.Request.Context(), ctx.UserID, req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	user, _ := h.service.GetProfile(c.Request.Context(), ctx.UserID)
	c.JSON(http.StatusOK, gin.H{
		"user":    user,
		"message": "Profile updated successfully",
	})
}

func (h *userHandler) Logout(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
	}
	c.SetCookie("access_token", "", -1, "/", "", false, true)
	c.SetCookie("refresh_token", "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"message": "logout successful"})
}

func (h *userHandler) SearchUser(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
	}
	query := c.DefaultQuery("search", "")
	users, err := h.service.SearchUser(c.Request.Context(), query)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}
	usersResp := make([]dto.UserResponse, len(users))
	for i, user := range users {
		usersResp[i].ID = user.ID
		usersResp[i].Nickname = user.Nickname
		usersResp[i].FirstName = user.FirstName
		usersResp[i].LastName = user.LastName
		usersResp[i].Color = user.Color
	}

	c.JSON(http.StatusOK, gin.H{
		"users": usersResp,
	})
}
