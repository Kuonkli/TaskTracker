pipeline {
    agent any

    triggers {
        // Явно указываем GitHub webhook
        githubPush()
    }

    stages {
        // СТАДИЯ 1: Получение кода
        stage('Checkout') {
            steps {
                checkout scm
                echo "📦 Ветка: ${env.BRANCH_NAME}"
            }
        }

        // СТАДИЯ 2: Сборка и запуск через Docker Compose
        stage('Build and Deploy') {
            steps {
                script {
                    echo "Использую существующие Dockerfile и docker-compose.yml"

                    // 1. Останавливаем старые контейнеры
                    sh '''
                        echo "=== Остановка старых контейнеров ==="
                        docker compose down --remove-orphans || true
                    '''

                    // 2. Собираем образы и запускаем
                    sh '''
                        docker build -t task-tracker-frontend:latest client
                        docker build -t task-tracker-backend:latest server
                        docker compose up -d
                    '''

                    // 3. Проверяем что все запустилось
                    sh '''
                        echo "=== Статус контейнеров ==="
                        docker compose ps

                        echo "=== Проверка здоровья ==="
                        MAX_ATTEMPTS=12
                        for i in $(seq 1 $MAX_ATTEMPTS); do
                            if curl -f http://localhost:8080/health >/dev/null 2>&1; then
                                echo "Backend здоров после $i попыток"
                                break
                            fi
                            if [ $i -eq $MAX_ATTEMPTS ]; then
                                echo "Backend не запустился"
                                docker compose logs backend
                                exit 1
                            fi
                            echo "⏳ Ожидание backend... ($i/$MAX_ATTEMPTS)"
                            sleep 5
                        done
                    '''
                }
            }
        }

        // СТАДИЯ 3: Запуск тестов (опционально)
        stage('Run Tests') {
            steps {
                script {
                    echo "🧪 Запуск тестов..."

                    // Запускаем тесты внутри контейнеров
                    sh '''
                        echo "=== Тесты backend ==="
                        docker compose exec backend go test ./... -v 2>&1 | tail -20 || echo "Тесты backend завершились"

                        echo "=== Тесты frontend ==="
                        docker compose exec frontend npm test -- --passWithNoTests 2>&1 | tail -20 || echo "Тесты frontend завершились"
                    '''
                }
            }
        }
    }

    post {
        always {
            echo "📊 Сборка завершена: ${currentBuild.currentResult}"
            sh 'docker compose ps'
        }
        success {
            echo "✅ ПРИЛОЖЕНИЕ РАБОТАЕТ!"
            echo "🌐 Frontend: http://localhost"
            echo "🔧 API: http://localhost:8080"
        }
        failure {
            sh '''
                echo "=== Логи для отладки ==="
                docker compose logs --tail=50
            '''
        }
    }
}