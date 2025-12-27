// Minimal Jenkinsfile для теста
pipeline {
    agent any
    stages {
        stage('Hello') {
            steps {
                echo "Hello from Jenkins CI/CD!"
                sh 'git --version'
                sh 'docker --version'
            }
        }
    }
}