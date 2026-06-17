pipeline {
    agent { label 'docker' }
    
    parameters {
        choice(
            name: 'ACTION',
            choices: ['init-db', 'migrate', 'build', 'deploy', 'full'],
            description: 'Выбери действие'
        )
        string(name: 'VERSION', defaultValue: '', description: 'Версия для деплоя')
        string(name: 'BRANCH', defaultValue: 'main', description: 'Ветка')
    }

    environment {
        DOCKER_USER = 'kuonkli'
        DEPLOY_HOST = '85.239.61.190'
        DEPLOY_USER = 'deploy'
        
        DB_NAME = credentials('db-name')
        DB_USER = credentials('db-user')
        DB_PASSWORD = credentials('db-user-password')
        POSTGRES_USER = credentials('postgres-user')
        POSTGRES_PASSWORD = credentials('postgres-password')
        JWT_SECRET = credentials('jwt-secret')
        ADMIN_PASSWORD = credentials('db-admin-password')
        USER_PASSWORD = credentials('db-user-password')
        UPLOADS_PATH = credentials('uploads-path')
        UPLOADS_URL = credentials('uploads-url')
    }

    stages {
        stage('Checkout') {
            when { expression { params.ACTION in ['init-db', 'migrate', 'build', 'deploy', 'full'] } }
            steps {
                git branch: params.BRANCH, 
                    url: 'https://github.com/Kuonkli/TaskTracker.git', 
                    credentialsId: 'github-token'
                sh 'echo "📦 Код скачан! Ветка: ${BRANCH}"'
            }
        }

        stage('Build Backend') {
            when { expression { params.ACTION in ['build', 'full'] } }
            steps {
                script {
                    docker.withRegistry('https://index.docker.io/v1/', 'docker-hub-creds') {
                        sh """
                            docker build -t ${DOCKER_USER}/task-tracker-backend:${BUILD_NUMBER} -f server/Dockerfile server/
                            docker push ${DOCKER_USER}/task-tracker-backend:${BUILD_NUMBER}
                        """
                    }
                }
            }
        }

        stage('Build Frontend') {
            when { expression { params.ACTION in ['build', 'full'] } }
            steps {
                script {
                    docker.withRegistry('https://index.docker.io/v1/', 'docker-hub-creds') {
                        sh """
                            docker build -t ${DOCKER_USER}/task-tracker-frontend:${BUILD_NUMBER} --build-arg REACT_APP_API_URL=/api -f client/Dockerfile client/
                            docker push ${DOCKER_USER}/task-tracker-frontend:${BUILD_NUMBER}
                        """
                    }
                }
            }
        }

        stage('Prepare Server') {
            when { expression { params.ACTION in ['init-db', 'migrate', 'deploy', 'full'] } }
            steps {
                sshagent(['deploy-server-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} '
                            mkdir -p /opt/task-tracker
                            docker network inspect task-tracker-network >/dev/null 2>&1 || docker network create task-tracker-network
                            echo "✅ Сервер подготовлен"
                        '
                    """
                }
            }
        }

        stage('Check PostgreSQL') {
            when { expression { params.ACTION in ['init-db', 'migrate', 'deploy', 'full'] } }
            steps {
                sshagent(['deploy-server-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} '
                            if docker ps -a --format "{{.Names}}" | grep -q "^task-tracker-postgres\$"; then
                                echo "Контейнер PostgreSQL существует, проверяем статус..."
                                if ! docker ps --format "{{.Names}}" | grep -q "^task-tracker-postgres\$"; then
                                    echo "Запускаем существующий контейнер..."
                                    docker start task-tracker-postgres
                                else
                                    echo "PostgreSQL уже запущен"
                                fi
                            else
                                echo "Создаём новый контейнер PostgreSQL..."
                                docker run -d --name task-tracker-postgres \\
                                    --network task-tracker-network \\
                                    -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \\
                                    -e POSTGRES_USER=${POSTGRES_USER} \\
                                    -e POSTGRES_DB=${DB_NAME} \\
                                    -v postgres_data:/var/lib/postgresql/data \\
                                    postgres:16-alpine
                            fi
                            
                            echo "Ожидаем готовности PostgreSQL..."
                            for i in {1..30}; do
                                if docker exec task-tracker-postgres pg_isready -U ${POSTGRES_USER}; then
                                    echo "✅ PostgreSQL готов!"
                                    break
                                fi
                                if [ \$i -eq 30 ]; then
                                    echo "❌ PostgreSQL не запустился за 30 секунд!"
                                    exit 1
                                fi
                                sleep 2
                            done
                            
                            echo "Проверяем существование базы ${DB_NAME}..."
                            if ! docker exec task-tracker-postgres psql -U ${POSTGRES_USER} -lqt | cut -d \\| -f 1 | grep -qw ${DB_NAME}; then
                                echo "База ${DB_NAME} не найдена, создаём..."
                                docker exec task-tracker-postgres psql -U ${POSTGRES_USER} -c "CREATE DATABASE ${DB_NAME};"
                                if [ \$? -eq 0 ]; then
                                    echo "✅ База данных ${DB_NAME} создана"
                                else
                                    echo "❌ Не удалось создать базу данных"
                                    exit 1
                                fi
                            else
                                echo "✅ База данных ${DB_NAME} уже существует"
                            fi
                        '
                    """
                }
            }
        }

        stage('Init Database') {
            when { expression { params.ACTION in ['init-db', 'full'] } }
            steps {
                sshagent(['deploy-server-key']) {
                    sh """
                        scp -o StrictHostKeyChecking=no database/init-db.sh ${DEPLOY_USER}@${DEPLOY_HOST}:/opt/task-tracker/init-db.sh
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} '
                            # Копируем скрипт в контейнер
                            docker cp /opt/task-tracker/init-db.sh task-tracker-postgres:/init-db.sh
                            
                            # Даём права на выполнение
                            docker exec task-tracker-postgres chmod +x /init-db.sh
                            
                            # Запускаем скрипт со ВСЕМИ нужными переменными
                            docker exec \
                                -e POSTGRES_USER=${POSTGRES_USER} \
                                -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
                                -e POSTGRES_DB=${DB_NAME} \
                                -e DB_USER=${DB_USER} \
                                -e DB_PASSWORD=${DB_PASSWORD} \
                                -e ADMIN_PASSWORD=${ADMIN_PASSWORD} \
                                -e USER_PASSWORD=${USER_PASSWORD} \
                                task-tracker-postgres bash /init-db.sh
                            
                            if [ \$? -eq 0 ]; then
                                echo "✅ База данных инициализирована"
                            else
                                echo "❌ Ошибка инициализации базы данных"
                                exit 1
                            fi
                        '
                    """
                }
            }
        }

        stage('Copy Migrations') {
            when { expression { params.ACTION in ['migrate', 'full'] } }
            steps {
                sshagent(['deploy-server-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} 'rm -rf /opt/task-tracker/migrations'
                        scp -o StrictHostKeyChecking=no -r database/migrations ${DEPLOY_USER}@${DEPLOY_HOST}:/opt/task-tracker/
                        echo "✅ Миграции скопированы"
                    """
                }
            }
        }

        stage('Run Migrations') {
            when { expression { params.ACTION in ['migrate', 'full'] } }
            steps {
                sshagent(['deploy-server-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} '
                            echo "Ожидание готовности PostgreSQL..."
                            until docker exec task-tracker-postgres pg_isready -U ${POSTGRES_USER}; do
                                echo "Ждём PostgreSQL..."
                                sleep 2
                            done
                            
                            docker run --rm \\
                                --network task-tracker-network \\
                                -v /opt/task-tracker/migrations:/migrations \\
                                migrate/migrate:latest \\
                                -path=/migrations \\
                                -database="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@task-tracker-postgres:5432/${DB_NAME}?sslmode=disable" \\
                                up
                            
                            if [ \$? -eq 0 ]; then
                                echo "✅ Миграции успешно применены"
                            else
                                echo "❌ Миграции провалились!"
                                exit 1
                            fi
                        '
                    """
                }
            }
        }

        stage('Deploy Backend') {
            when { expression { params.ACTION in ['deploy', 'full'] } }
            steps {
                script {
                    def version = params.VERSION ?: "${BUILD_NUMBER}"
                    sshagent(['deploy-server-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} '
                                echo "Загружаем образ backend версии ${version}..."
                                docker pull ${DOCKER_USER}/task-tracker-backend:${version}
                                
                                echo "Останавливаем старый контейнер backend..."
                                docker stop task-tracker-backend 2>/dev/null || true
                                docker rm task-tracker-backend 2>/dev/null || true
                                
                                echo "Запускаем новый контейнер backend..."
                                docker run -d --name task-tracker-backend \\
                                    --network task-tracker-network \\
                                    -p 8080:8080 \\
                                    --restart unless-stopped \\
                                    -e DB_HOST=task-tracker-postgres \\
                                    -e DB_PORT=5432 \\
                                    -e DB_USER=${DB_USER} \\
                                    -e DB_PASSWORD=${DB_PASSWORD} \\
                                    -e DB_NAME=${DB_NAME} \\
                                    -e DB_SSLMODE=disable \\
                                    -e JWT_SECRET=${JWT_SECRET} \\
                                    -e PORT=8080 \\
                                    -e UPLOADS_PATH=${UPLOADS_PATH} \\
                                    -e UPLOADS_URL=${UPLOADS_URL} \\
                                    -v uploads_data:${UPLOADS_PATH} \\
                                    ${DOCKER_USER}/task-tracker-backend:${version}
                                
                                sleep 5
                                
                                echo "=== Статус контейнера ==="
                                docker ps -a --filter "name=task-tracker-backend" --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"
                                
                                echo ""
                                echo "=== Логи backend ==="
                                docker logs --tail 20 task-tracker-backend 2>&1 || echo "Логи недоступны"
                                
                                if docker ps -a --filter "name=task-tracker-backend" --format "{{.Status}}" | grep -q "Restarting"; then
                                    echo "❌ Контейнер backend постоянно перезапускается!"
                                    docker logs task-tracker-backend 2>&1
                                    exit 1
                                fi
                                
                                if docker ps --filter "name=task-tracker-backend" --format "{{.Names}}" | grep -q "task-tracker-backend"; then
                                    echo "✅ Backend запущен"
                                else
                                    echo "❌ Backend не запустился!"
                                    exit 1
                                fi
                            '
                        """
                    }
                }
            }
        }

        stage('Deploy Frontend') {
            when { expression { params.ACTION in ['deploy', 'full'] } }
            steps {
                script {
                    def version = params.VERSION ?: "${BUILD_NUMBER}"
                    sshagent(['deploy-server-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} '
                                echo "Загружаем образ frontend версии ${version}..."
                                docker pull ${DOCKER_USER}/task-tracker-frontend:${version}
                                
                                echo "Останавливаем старый контейнер frontend..."
                                docker stop task-tracker-frontend 2>/dev/null || true
                                docker rm task-tracker-frontend 2>/dev/null || true
                                
                                echo "Запускаем новый контейнер frontend..."
                                docker run -d --name task-tracker-frontend \\
                                    --network task-tracker-network \\
                                    -p 80:80 \\
                                    --restart unless-stopped \\
                                    ${DOCKER_USER}/task-tracker-frontend:${version}
                                
                                if [ \$? -eq 0 ]; then
                                    echo "✅ Frontend запущен"
                                else
                                    echo "❌ Ошибка запуска frontend"
                                    exit 1
                                fi
                            '
                        """
                    }
                }
            }
        }

        stage('Health Check') {
            when { expression { params.ACTION in ['deploy', 'full'] } }
            steps {
                sshagent(['deploy-server-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} '
                            echo "🔍 Ожидание запуска backend..."
                            
                            for i in {1..30}; do
                                if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
                                    echo ""
                                    echo "✅ Backend здоров!"
                                    break
                                fi
                                
                                if [ \$i -eq 30 ]; then
                                    echo ""
                                    echo "❌ Backend не запустился за 60 секунд!"
                                    echo "=== Логи backend ==="
                                    docker logs --tail 50 task-tracker-backend 2>&1
                                    echo "=== Статус ==="
                                    docker ps -a --filter "name=task-tracker-backend"
                                    exit 1
                                fi
                                
                                echo -n "."
                                sleep 2
                            done
                            
                            echo ""
                            echo "🔍 Проверка frontend..."
                            
                            if curl -f -s http://localhost/ > /dev/null 2>&1; then
                                echo "✅ Frontend доступен!"
                            else
                                echo "⚠️ Frontend может быть недоступен"
                                docker logs --tail 10 task-tracker-frontend 2>&1
                            fi
                            
                            echo ""
                            echo "=== Финальный статус ==="
                            docker ps --filter "name=task-tracker" --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"
                            echo ""
                            echo "✅ Деплой завершён!"
                        '
                    """
                }
            }
        }
    }

    post {
        always { 
            cleanWs()
        }
        success { 
            echo "✅ ACTION ${params.ACTION} успешно завершён!"
        }
        failure { 
            echo "❌ ACTION ${params.ACTION} провален!"
            echo "Проверьте логи выше для диагностики проблемы"
        }
    }
}