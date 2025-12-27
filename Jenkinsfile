pipeline {
    agent any

    stages {
        stage('Security Check') {
                    steps {
                        sh '''
                            echo "🔒 ТЕКУЩАЯ БЕЗОПАСНОСТЬ:"
                            echo "Пользователь: $(whoami)"
                            id

                            echo ""
                            echo "=== Доступ jenkins к Docker ==="
                            if docker ps >/dev/null 2>&1; then
                                echo "❌ ОПАСНО: jenkins имеет прямой доступ!"
                            else
                                echo "✅ БЕЗОПАСНО: jenkins НЕ имеет прямого доступа"
                            fi

                            echo ""
                            echo "=== Доступ docker-runner к Docker ==="
                            if sudo -u docker-runner docker ps >/dev/null 2>&1; then
                                echo "✅ docker-runner имеет доступ"
                            else
                                echo "❌ docker-runner не имеет доступа"
                            fi
                        '''
                    }
                }
    }
}