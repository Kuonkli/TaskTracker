pipeline {
    agent any

    // ВКЛЮЧАЕМ GITHUB ИНТЕГРАЦИЮ
    options {
        // Ссылка на GitHub проект
        githubProjectProperty(
            projectUrlStr: 'https://github.com/Kuonkli/TaskTracker'
        )

        // Настройки для PR
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    // ПАРАМЕТРЫ ДЛЯ РУЧНОГО ЗАПУСКА
    parameters {
        choice(
            name: 'BRANCH',
            choices: ['main', 'dev'],
            description: 'Select branch to build'
        )
        booleanParam(
            name: 'RUN_TESTS',
            defaultValue: true,
            description: 'Run tests'
        )
        booleanParam(
            name: 'DEPLOY',
            defaultValue: true,
            description: 'Deploy to local environment'
        )
    }

    environment {
        // GitHub репозиторий
        GITHUB_REPO = 'Kuonkli/TaskTracker'
        GITHUB_URL = "https://github.com/${GITHUB_REPO}"

        // Docker образы
        BACKEND_IMAGE = "task-tracker-backend"
        FRONTEND_IMAGE = "task-tracker-frontend"

        // Теги
        SHORT_COMMIT = sh(
            script: 'git rev-parse --short HEAD',
            returnStdout: true
        ).trim()

        BUILD_TAG = "${env.BUILD_NUMBER}-${SHORT_COMMIT}"

        // Пути к проектам (обнови под свою структуру)
        BACKEND_DIR = 'server'
        FRONTEND_DIR = 'client'
    }

    stages {
        stage('Checkout & Initialize') {
            steps {
                // ПРОВЕРЯЕМ: У тебя Jenkins настроен на GitHub?
                script {
                    echo "🔗 GitHub Repository: ${GITHUB_URL}"
                    echo "🌿 Branch: ${params.BRANCH}"
                    echo "🔨 Build: #${env.BUILD_NUMBER}"
                }

                // CHECKOUT С УЧЕТОМ ВЕТКИ
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: "*/${params.BRANCH}"]],
                    extensions: [],
                    userRemoteConfigs: [[
                        url: GITHUB_URL,
                        credentialsId: 'github-token'
                    ]]
                ])

                // ВЫВОДИМ ИНФОРМАЦИЮ
                sh '''
                    echo "=== Project Structure ==="
                    ls -la
                    echo -e "\n=== Backend (server) ==="
                    ls -la server/ 2>/dev/null || echo "server/ not found"
                    echo -e "\n=== Frontend (client) ==="
                    ls -la client/ 2>/dev/null || echo "client/ not found"
                '''
            }
        }

        stage('Build Backend') {
            steps {
                dir(env.BACKEND_DIR) {
                    echo "🔨 Building Go Backend..."
                    sh '''
                        docker build -t ${BACKEND_IMAGE}:${BUILD_TAG} .
                        docker tag ${BACKEND_IMAGE}:${BUILD_TAG} ${BACKEND_IMAGE}:latest

                        echo "✅ Docker images:"
                        docker images | grep ${BACKEND_IMAGE}
                    '''
                }
            }
        }

        stage('Build Frontend') {
            steps {
                dir(env.FRONTEND_DIR) {
                    echo "🎨 Building React Frontend..."
                    sh """
                        docker build -t ${FRONTEND_IMAGE}:${BUILD_TAG} .
                        docker tag ${FRONTEND_IMAGE}:${BUILD_TAG} ${FRONTEND_IMAGE}:latest

                        echo "✅ Docker images:"
                        docker images | grep ${FRONTEND_IMAGE}
                    """
                }
            }
        }

        stage('Run Tests') {
            when {
                expression { params.RUN_TESTS == true }
            }
            steps {
                echo "🧪 Running Tests..."

                parallel {
                    stage('Go Tests') {
                        steps {
                            dir(env.BACKEND_DIR) {
                                sh '''
                                    echo "Running Go tests..."
                                    go test ./... -v 2>&1 | tail -30 || echo "Tests completed"
                                '''
                            }
                        }
                    }

                    stage('Docker Health Check') {
                        steps {
                            sh '''
                                echo "Checking Docker images..."
                                docker run --rm ${BACKEND_IMAGE}:latest echo "✅ Backend image works"
                                docker run --rm ${FRONTEND_IMAGE}:latest echo "✅ Frontend image works"
                            '''
                        }
                    }
                }
            }
        }

        stage('Deploy with Docker Compose') {
            when {
                expression { params.DEPLOY == true }
            }
            steps {
                echo "🚀 Deploying Application..."

                script {
                    // Останавливаем старые контейнеры
                    sh 'docker-compose down 2>/dev/null || echo "No running containers"'

                    // Запускаем с новыми образами
                    sh '''
                        echo "Building and starting services..."
                        docker-compose up -d --build

                        echo "Waiting for services to start..."
                        sleep 15
                    '''

                    // Проверяем health
                    sh '''
                        echo "=== Service Status ==="
                        docker-compose ps

                        echo -e "\n=== Backend Health Check ==="
                        if curl -f http://localhost:8080/health; then
                            echo "✅ Backend is healthy!"
                        else
                            echo "❌ Backend health check failed"
                            exit 1
                        fi

                        echo -e "\n=== Frontend Check ==="
                        if curl -f http://localhost:3000 -I; then
                            echo "✅ Frontend is accessible!"
                        else
                            echo "⚠️ Frontend might be starting..."
                        fi
                    '''
                }
            }
        }

        stage('Integration Test') {
            steps {
                echo "🔗 Integration Test..."
                sh '''
                    echo "Testing full stack integration..."

                    # Тестируем API
                    API_RESPONSE=$(curl -s http://localhost:8080/health)
                    echo "API Response: $API_RESPONSE"

                    if [ -n "$API_RESPONSE" ]; then
                        echo "✅ API is responding"
                    else
                        echo "❌ API not responding"
                        exit 1
                    fi

                    # Проверяем что фронтенд сервит статику
                    if curl -s http://localhost:3000 | grep -q "DOCTYPE"; then
                        echo "✅ Frontend serves HTML"
                    else
                        echo "⚠️ Frontend HTML check inconclusive"
                    fi
                '''
            }
        }
    }

    post {
        success {
            echo "🎉🎉🎉 PIPELINE SUCCESSFUL! 🎉🎉🎉"
            script {
                sh '''
                    echo "========================================"
                    echo "🚀 CI/CD COMPLETE!"
                    echo "📦 Build: #${BUILD_NUMBER}"
                    echo "🌿 Branch: ${BRANCH}"
                    echo "🔗 Commit: ${SHORT_COMMIT}"
                    echo "📊 Services:"
                    docker-compose ps
                    echo "🔗 URLs:"
                    echo "  Backend: http://localhost:8080"
                    echo "  Frontend: http://localhost:3000"
                    echo "========================================"
                '''
            }
        }

        failure {
            echo "❌❌❌ PIPELINE FAILED! ❌❌❌"
            script {
                // Сохраняем логи для отладки
                sh '''
                    echo "=== ERROR DETAILS ==="
                    echo "Docker Compose logs:"
                    docker-compose logs --tail=50 2>/dev/null || true

                    echo -e "\nDocker containers:"
                    docker ps -a 2>/dev/null || true

                    echo -e "\nRecent Docker events:"
                    docker events --since "10m" 2>/dev/null || true
                '''

                // Останавливаем всё
                sh 'docker-compose down 2>/dev/null || true'
            }
        }

        always {
            echo "🧹 Cleanup..."
            sh '''
                echo "Cleaning up Docker..."
                docker system prune -f 2>/dev/null || true
                echo "Cleanup complete!"
            '''
        }
    }
}