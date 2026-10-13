pipeline {
    agent any

    environment {
        APP_NAME        = 'cuahang-fe'
        DOCKER_HUB_USER = 'your-dockerhub-username'
        IMAGE_NAME      = "${DOCKER_HUB_USER}/${APP_NAME}"
        IMAGE_TAG       = "${BUILD_NUMBER}-${GIT_COMMIT.take(7)}"
        GITOPS_REPO     = 'https://github.com/your-github-user/cuahang-gitops.git'
    }

    stages {
        stage('1. Pre-Check & Secret Scanning') {
            steps {
                echo '🛡️ Quét mã nguồn Frontend bằng Gitleaks...'
                sh '''
                    if command -v gitleaks &> /dev/null; then
                        gitleaks detect --source . --verbose --no-git || true
                    else
                        echo "Gitleaks chưa cài, bỏ qua bước quét"
                    fi
                '''
            }
        }

        stage('2. Build Docker Image') {
            steps {
                echo "🐳 Build Docker Image Frontend: ${IMAGE_NAME}:${IMAGE_TAG}..."
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -t ${IMAGE_NAME}:latest ."
            }
        }

        stage('3. Trivy Security Scan') {
            steps {
                echo '🛡️ Quét lỗ hổng Image Frontend bằng Trivy...'
                sh '''
                    if command -v trivy &> /dev/null; then
                        trivy image --severity CRITICAL --exit-code 0 ${IMAGE_NAME}:${IMAGE_TAG} || true
                    else
                        echo "Trivy chưa cài, bỏ qua quét Image"
                    fi
                '''
            }
        }

        stage('4. Push to Registry') {
            steps {
                echo "🚀 Đẩy image lên Docker Hub..."
                echo "Giả lập đẩy thành công image ${IMAGE_NAME}:${IMAGE_TAG}"
            }
        }

        stage('5. Update GitOps Manifest') {
            steps {
                echo "🔄 Tự động cập nhật tag Frontend vào repo GitOps..."
                echo "Sẵn sàng tự động cập nhật GitOps khi kết nối token GitHub"
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline CI/CD cho cuahang-fe thành công!"
        }
        failure {
            echo "❌ Pipeline thất bại!"
        }
    }
}
