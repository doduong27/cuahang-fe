pipeline {
    agent any

    parameters {
        choice(
            name: 'TARGET_ENV',
            choices: ['dev', 'stag', 'prod'],
            description: '🎯 Chọn môi trường bạn muốn triển khai:'
        )
        choice(
            name: 'ACTION',
            choices: ['Build & Deploy', 'Deploy Only (Promote)'],
            description: '⚙️ Chọn hành động (Build & Deploy: build code mới; Deploy Only: đưa tag đã có sang môi trường này):'
        )
        string(
            name: 'IMAGE_TAG',
            defaultValue: 'dev-v2',
            description: '🏷️ Tag Image (nếu chọn "Deploy Only", hệ thống sẽ lấy Tag này để cập nhật vào môi trường đã chọn):'
        )
    }

    environment {
        APP_NAME        = 'cuahang-fe'
        DOCKER_HUB_USER = 'dvduong'
        IMAGE_NAME      = "${DOCKER_HUB_USER}/${APP_NAME}"
        GITOPS_REPO_SSH = 'git@github.com:doduong27/cuahang-gitops.git'
    }

    stages {
        stage('1. Khởi tạo & Xác định phiên bản') {
            steps {
                script {
                    if (params.ACTION == 'Build & Deploy') {
                        env.FINAL_TAG = "build-${BUILD_NUMBER}-${GIT_COMMIT.take(7)}"
                    } else {
                        env.FINAL_TAG = params.IMAGE_TAG
                    }
                    echo "=========================================================="
                    echo "🚀 KẾ HOẠCH TRIỂN KHAI:"
                    echo "   - Ứng dụng: ${APP_NAME}"
                    echo "   - Môi trường đích: [ ${params.TARGET_ENV.toUpperCase()} ]"
                    echo "   - Hành động: ${params.ACTION}"
                    echo "   - Phiên bản Image Tag: ${env.FINAL_TAG}"
                    echo "=========================================================="
                }
            }
        }

        stage('2. Build & Push Docker Image') {
            when {
                expression { return params.ACTION == 'Build & Deploy' }
            }
            steps {
                echo "🐳 Đang Build Docker Image ${IMAGE_NAME}:${env.FINAL_TAG}..."
                sh "docker build -t ${IMAGE_NAME}:${env.FINAL_TAG} -t ${IMAGE_NAME}:latest -t ${IMAGE_NAME}:${params.TARGET_ENV}-latest ."
                echo "🚀 Đẩy image lên Docker Hub..."
                withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh """
                        echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin
                        docker push ${IMAGE_NAME}:${env.FINAL_TAG}
                        docker push ${IMAGE_NAME}:latest
                        docker push ${IMAGE_NAME}:${params.TARGET_ENV}-latest
                    """
                }
            }
        }

        stage('3. Cập nhật GitOps Manifest') {
            steps {
                echo "🔄 Đang cập nhật Kustomize Manifest cho môi trường: ${params.TARGET_ENV}..."
                sh """
                    rm -rf gitops-tmp
                    GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no" git clone ${GITOPS_REPO_SSH} gitops-tmp
                    cd gitops-tmp/projects/cuahang/overlays/${params.TARGET_ENV}
                    
                    # Sử dụng Kustomize CLI để cập nhật image tag chuẩn xác
                    kustomize edit set image cuahang-fe=docker.io/${IMAGE_NAME}:${env.FINAL_TAG}
                    
                    git config user.name "jenkins-bot"
                    git config user.email "jenkins@lan"
                    
                    if git status --porcelain | grep -q 'kustomization.yaml'; then
                        git add kustomization.yaml
                        git commit -m "ci(${params.TARGET_ENV}): promote ${APP_NAME} to ${env.FINAL_TAG} via Jenkins [skip ci]"
                        GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no" git push origin main
                        echo "✅ Đã commit và push cập nhật GitOps thành công!"
                    else
                        echo "ℹ️ Tag ${env.FINAL_TAG} đã tồn tại trong kustomization.yaml của ${params.TARGET_ENV}, không có thay đổi mới."
                    fi
                """
            }
        }

        stage('4. Kiểm tra trạng thái triển khai') {
            steps {
                script {
                    echo "🎉 Đã hoàn tất đẩy cấu hình vào GitOps!"
                    echo "Argo CD sẽ tự động đồng bộ (hoặc bấm Sync trên Argo CD nếu là Production)."
                    if (params.TARGET_ENV == 'dev') {
                        echo "🌐 Xem kết quả tại: http://dev.cuahang.lan/"
                    } else if (params.TARGET_ENV == 'stag') {
                        echo "🌐 Xem kết quả tại: http://stag.cuahang.lan/"
                    } else {
                        echo "🌐 Xem kết quả tại: http://cuahang.lan/ (hoặc http://192.168.1.252/)"
                    }
                }
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline hoàn thành xuất sắc! Môi trường [ ${params.TARGET_ENV.toUpperCase()} ] đã được đồng bộ với Tag [ ${env.FINAL_TAG} ]."
        }
        failure {
            echo "❌ Pipeline gặp lỗi! Vui lòng kiểm tra log chi tiết."
        }
    }
}
