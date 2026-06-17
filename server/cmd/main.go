package main

import (
	"fmt"
	"github.com/joho/godotenv"
	"log"
	"os"
	"task-tracker/internal/db"
	"task-tracker/internal/handlers"
	"task-tracker/internal/router"
	"task-tracker/internal/service"
	"task-tracker/pkg/storage"
	"time"
)

func main() {
	// Загрузка .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Подключение к БД
	dbConfig := db.Config{
		Host:     os.Getenv("DB_HOST"),
		Port:     os.Getenv("DB_PORT"),
		User:     os.Getenv("DB_USER"),
		Password: os.Getenv("DB_PASSWORD"),
		DBName:   os.Getenv("DB_NAME"),
		SSLMode:  os.Getenv("DB_SSLMODE"),
	}

	DB, err := db.Connect(dbConfig)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	jwtKey := os.Getenv("JWT_SECRET")
	if jwtKey == "" {
		log.Fatal("JWT secret key not found")
	}

	uploadsPath := os.Getenv("UPLOADS_PATH")
	if uploadsPath == "" {
		uploadsPath = "./uploads"
	}
	uploadsURL := os.Getenv("UPLOADS_URL")
	if uploadsURL == "" {
		uploadsURL = "/api/attachments"
	}
	fileStorage, _ := storage.NewLocalFileStorage(uploadsPath, uploadsURL)

	// Инициализируем сервисы
	newServices := service.NewServices(DB, fileStorage)

	// Инициализируем хендлеры
	newHandlers := handlers.NewHandlers(newServices, jwtKey)

	// Настраиваем роутер
	r := router.NewRouter(newHandlers, newServices, jwtKey)

	server := r.Setup()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Запускаем сервер
	fmt.Printf("%s | %s %s\n",
		time.Now().Format("2006/01/02 - 15:04:05"),
		"Server starting on",
		port,
	)
	if err = server.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
