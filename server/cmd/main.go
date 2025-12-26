package main

import (
	"github.com/gin-contrib/cors"
	"log"
	"os"
	"task-tracker/internal/handlers"
	"task-tracker/internal/middleware"
	"task-tracker/internal/models"
	"task-tracker/internal/repository"
	"task-tracker/internal/service"
	"task-tracker/pkg/database"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Загрузка .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Подключение к БД
	dbConfig := database.Config{
		Host:     os.Getenv("DB_HOST"),
		Port:     os.Getenv("DB_PORT"),
		User:     os.Getenv("DB_USER"),
		Password: os.Getenv("DB_PASSWORD"),
		DBName:   os.Getenv("DB_NAME"),
		SSLMode:  os.Getenv("DB_SSLMODE"),
	}

	db, err := database.Connect(dbConfig)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	err = db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"").Error
	if err != nil {
		log.Fatal("Failed to create uuid extension:", err)
	}

	err = db.Exec("CREATE EXTENSION IF NOT EXISTS pg_trgm").Error
	if err != nil {
		log.Fatal("Failed to create extension pg_trgm:", err)
	}

	// Автомиграция
	err = db.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.Task{},
	)
	if err != nil {
		log.Fatal("Failed to migrate models:", err)
	}

	// Инициализация репозиториев
	userRepo := repository.NewUserRepository(db)
	taskRepo := repository.NewTaskRepository(db)
	projectRepo := repository.NewProjectRepository(db)

	// Инициализация сервисов
	userService := service.NewUserService(userRepo) // было: authService
	taskService := service.NewTaskService(taskRepo)
	projectService := service.NewProjectService(projectRepo, userRepo)

	// Инициализация хэндлеров
	userHandler := handlers.NewUserHandler(userService, os.Getenv("JWT_SECRET")) // было: authHandler
	taskHandler := handlers.NewTaskHandler(taskService)
	projectHandler := handlers.NewProjectHandler(projectService)

	// Настройка роутера
	r := gin.Default()
	config := cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost", "http://127.0.0.1", "http://localhost:80"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Authorization", "X-Refresh-Token", "Content-Type"},
		ExposeHeaders:    []string{"Authorization", "X-Refresh-Token"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}

	r.Use(cors.New(config))

	// Публичные роуты
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, "OK")
	})
	r.HEAD("/health", func(c *gin.Context) {
		c.JSON(200, "OK")
	})
	r.POST("/api/register", userHandler.Register)
	r.POST("/api/login", userHandler.Login)

	// Защищенные роуты
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware(os.Getenv("JWT_SECRET")))

	// Пользователь
	api.GET("/profile", userHandler.GetProfile)
	api.PUT("/profile", userHandler.UpdateProfile) // Добавили обновление профиля

	// Задачи
	api.GET("/tasks", taskHandler.ListTasks)
	api.POST("/tasks", taskHandler.CreateTask)
	api.GET("/tasks/:id", taskHandler.GetTask)
	api.PUT("/tasks/:id", taskHandler.UpdateTask)
	api.DELETE("/tasks/:id", taskHandler.DeleteTask)
	api.PUT("/tasks/:id/status", taskHandler.UpdateTaskStatus)

	// Проекты
	api.GET("/projects", projectHandler.ListProjects)
	api.POST("/projects", projectHandler.CreateProject)
	api.GET("/projects/:id", projectHandler.GetProject)
	api.PUT("/projects/:id", projectHandler.UpdateProject)
	api.DELETE("/projects/:id", projectHandler.DeleteProject)

	// Запуск сервера
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
