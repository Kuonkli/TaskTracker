package storage

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
)

// FileStorage - интерфейс для работы с файловым хранилищем
type FileStorage interface {
	// Save сохраняет файл из reader и возвращает URL для доступа
	Save(filename string, reader io.Reader) (string, error)

	// Delete удаляет файл по URL
	Delete(fileURL string) error

	// GetPath возвращает полный путь к файлу на диске по URL
	GetPath(fileURL string) string
}

// LocalFileStorage - реализация FileStorage для локальной файловой системы
type LocalFileStorage struct {
	basePath string // путь к директории хранения (например "./uploads")
	baseURL  string // базовый URL для доступа (например "/api/attachments")
}

// NewLocalFileStorage создает новое локальное хранилище
func NewLocalFileStorage(basePath, baseURL string) (*LocalFileStorage, error) {
	// Создаем директорию если не существует
	if err := os.MkdirAll(basePath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage directory: %w", err)
	}

	return &LocalFileStorage{
		basePath: basePath,
		baseURL:  baseURL,
	}, nil
}

// Save сохраняет файл и возвращает URL для доступа
func (s *LocalFileStorage) Save(filename string, reader io.Reader) (string, error) {
	// Берем расширение оригинального файла
	ext := filepath.Ext(filename)
	if ext == "" {
		ext = ".bin"
	}

	// Генерируем уникальное имя файла чтобы избежать коллизий
	uniqueName := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().UnixNano(), ext)

	// Полный путь на диске
	filePath := filepath.Join(s.basePath, uniqueName)

	// Создаем файл
	file, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer func(file *os.File) {
		err = file.Close()
		if err != nil {

		}
	}(file)

	// Копируем данные из reader в файл
	written, err := io.Copy(file, reader)
	if err != nil {
		err = os.Remove(filePath)
		if err != nil {
			return "", err
		} // Удаляем файл при ошибке копирования
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	// Проверяем что файл не пустой
	if written == 0 {
		err = os.Remove(filePath)
		if err != nil {
			return "", err
		}
		return "", fmt.Errorf("file is empty")
	}

	// Возвращаем URL (НЕ путь на диске!)
	return fmt.Sprintf("%s/%s", s.basePath, uniqueName), nil
}

// GetPath возвращает полный путь к файлу на диске по URL
func (s *LocalFileStorage) GetPath(fileURL string) string {
	// Извлекаем имя файла из URL
	// "/api/attachments/abc-123_report.pdf" → "abc-123_report.pdf"
	filename := filepath.Base(fileURL)

	// Собираем полный путь
	// "./uploads" + "abc-123_report.pdf" → "./uploads/abc-123_report.pdf"
	return filepath.Join(s.basePath, filename)
}

// Delete удаляет файл по URL
func (s *LocalFileStorage) Delete(fileURL string) error {
	filePath := s.GetPath(fileURL)

	if err := os.Remove(filePath); err != nil {
		// Если файл уже удален - не ошибка
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("failed to delete file: %w", err)
	}

	return nil
}
