pipeline {
    agent any

    stages {
        stage('Diagnostics') {
            steps {
                script {
                    echo "🔧 Диагностика окружения Jenkins..."

                    sh '''
                        echo "=== Системная информация ==="
                        uname -a
                        echo ""

                        echo "=== Пользователь ==="
                        whoami
                        id
                        echo ""

                        echo "=== Docker информация ==="
                        docker --version || echo "Docker не установлен"
                        docker compose version || echo "docker compose не установлен"
                        echo ""

                        echo "=== Проверка Docker сокета ==="
                        ls -la /var/run/docker.sock 2>/dev/null || echo "Docker сокет не найден"
                        echo ""

                        echo "=== Проверка прав ==="
                        stat -c "%a %U:%G %n" /var/run/docker.sock 2>/dev/null || true
                        echo ""

                        echo "=== Доступные команды ==="
                        which docker-compose || echo "docker-compose не найден"
                        which docker || echo "docker не найден"
                        echo ""

                        echo "=== Список файлов ==="
                        ls -la
                    '''
                }
            }
        }
    }
}