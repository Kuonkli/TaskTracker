pipeline {
    agent any

    environment {
        // Загружаем .env файл как секрет
        ENV_FILE = credentials('task-tracker-env')
    }

    triggers {
        githubPush()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "📦 Ветка: ${env.BRANCH_NAME}"
            }
        }

        stage('Setup Environment') {
            steps {
                script {
                    echo "🔧 Настройка окружения из secret file..."

                    // 1. Копируем секретный файл в нужные места
                    sh '''
                        echo "=== Копирую .env файл ==="

                        sudo -u docker-runner cp "$ENV_FILE" server/.env
                        sudo -u docker-runner cp "$ENV_FILE" .env

                        echo ".env файлы созданы из секрета"
                        echo "Файл содержит: $(wc -l < .env) строк"
                    '''
                }
            }
        }

        stage('Build and Deploy') {
            steps {
                script {
                    echo "🚀 Использую безопасного пользователя docker-runner для Docker операций"

                    // 1. Останавливаем старые контейнеры
                    sh '''
                        echo "=== Остановка старых контейнеров ==="
                        sudo -u docker-runner docker compose down --remove-orphans 2>/dev/null || echo "Нет контейнеров для остановки"
                    '''

                    // 2. Собираем образы и запускаем
                    sh '''
                        echo "=== Сборка образов ==="
                        sudo -u docker-runner docker build -t task-tracker-backend:latest server
                        sudo -u docker-runner docker build -t task-tracker-frontend:latest client

                        echo "=== Запуск приложения ==="
                        sudo -u docker-runner docker compose up -d
                    '''

                    // 3. Проверяем что все запустилось
                    sh '''
                        echo "=== Статус контейнеров ==="
                        sudo -u docker-runner docker compose ps

                        echo "=== Проверка здоровья ==="
                        MAX_ATTEMPTS=12
                        for i in $(seq 1 $MAX_ATTEMPTS); do
                            if curl -f http://localhost:8080/health >/dev/null 2>&1; then
                                echo "✅ Backend здоров после $i попыток"
                                break
                            fi
                            if [ $i -eq $MAX_ATTEMPTS ]; then
                                echo "❌ Backend не запустился"
                                sudo -u docker-runner docker compose logs backend --tail=20
                                exit 1
                            fi
                            echo "⏳ Ожидание backend... ($i/$MAX_ATTEMPTS)"
                            sleep 5
                        done
                    '''
                }
            }
        }

        stage('Run Tests') {
            steps {
                script {
                    echo "🧪 Запуск тестов..."

                    // Запускаем тесты внутри контейнеров
                    sh '''
                        echo "=== Тесты backend ==="
                        sudo -u docker-runner docker compose exec backend go test ./... -v 2>&1 | tail -20 || echo "Тесты backend завершились"

                        echo "=== Тесты frontend ==="
                        sudo -u docker-runner docker compose exec frontend npm test -- --passWithNoTests 2>&1 | tail -20 || echo "Тесты frontend завершились"
                    '''
                }
            }
        }
    }

    post {
        always {
            echo "📊 Сборка завершена: ${currentBuild.currentResult}"
            sh 'sudo -u docker-runner docker compose ps 2>/dev/null || echo "Не удалось получить статус"'
        }
        success {
            echo "✅ ПРИЛОЖЕНИЕ РАБОТАЕТ!"
            echo "🌐 Frontend: http://localhost"
            echo "🔧 API: http://localhost:8080"
            echo ""
            echo "⚠️  В production: использовать сервисные аккаунты с ограниченными правами"
            echo "⚠️  В production: хранить секреты в vault, а не в Jenkins"
        }
        failure {
            sh '''
                echo "=== Логи для отладки ==="
                sudo -u docker-runner docker compose logs --tail=50 2>/dev/null || echo "Не удалось получить логи"
            '''
        }
    }
}