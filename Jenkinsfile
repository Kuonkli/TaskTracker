properties([
    pipelineTriggers([
        [
            $class: 'GitHubPushTrigger',
            adminList: '',
            cron: '',
            triggerPhrase: ''
        ]
    ])
])

pipeline {
    agent any

    triggers {
        // Явно указываем GitHub webhook
        githubPush()
    }

    stages {
        stage('Webhook Test') {
            steps {
                script {
                    echo "🎯 ==================================="
                    echo "🎯 WEBHOOK TRIGGERED BUILD!"
                    echo "🎯 ==================================="
                    
                    // Выводим информацию о триггере
                    def causes = currentBuild.getBuildCauses()
                    causes.each { cause ->
                        echo "Build cause: ${cause}"
                        if (cause instanceof hudson.model.Cause.UpstreamCause) {
                            echo "Upstream cause"
                        } else if (cause.shortDescription?.contains("GitHub")) {
                            echo "✅ Triggered by GitHub Webhook!"
                        }
                    }

                    // Выводим переменные окружения
                    sh '''
                        echo "=== Environment Variables ==="
                        echo "GIT_URL: ${GIT_URL}"
                        echo "GIT_BRANCH: ${GIT_BRANCH}"
                        echo "GIT_COMMIT: ${GIT_COMMIT}"
                        echo "BRANCH_NAME: ${BRANCH_NAME}"
                        echo "CHANGE_ID: ${CHANGE_ID}"
                        echo "============================="
                    '''
                }
            }
        }

        stage('Build') {
            steps {
                echo "🔨 Building application..."
                // Твоя логика сборки
            }
        }
    }

    post {
        success {
            echo "✅ Build triggered by webhook succeeded!"
        }
    }
}