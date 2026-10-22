pipeline {
    agent any

    parameters {
        choice(
            name: 'TARGET_ENV',
            choices: ['dev', 'stag', 'prod'],
            description: '🎯 Chọn môi trường bạn muốn triển khai Frontend:'
        )
        choice(
            name: 'ACTION',
            choices: ['Build & Deploy', 'Deploy Only (Promote)'],
            description: '⚙️ Chọn hành động (Build & Deploy: build code mới; Deploy Only: đưa tag đã có sang môi trường này):'
        )
        string(
            name: 'IMAGE_TAG',
            defaultValue: 'v2.0.0',
            description: '🏷️ Phiên bản SemVer gốc (Dev & Stag tự gắn thêm -b<build_number>; Prod tự chốt tag sạch vx.x.x):'
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
                    def rawTag = params.IMAGE_TAG ? params.IMAGE_TAG.trim() : 'v2.0.0'
                    def baseSemver = rawTag.contains('-') ? rawTag.split('-')[0] : rawTag

                    if (params.TARGET_ENV == 'prod') {
                        // PRODUCTION: Luôn chốt Tag sạch chuẩn quốc tế vx.x.x (ví dụ v2.0.0)
                        env.FINAL_TAG = baseSemver
                        env.IS_PROD = 'true'
                        env.SOURCE_TAG = (rawTag != baseSemver) ? rawTag : ''
                    } else if (params.TARGET_ENV == 'stag') {
                        // STAGING:
                        env.IS_PROD = 'false'
                        if (params.ACTION == 'Build & Deploy') {
                            env.FINAL_TAG = "${baseSemver}-b${BUILD_NUMBER}"
                        } else {
                            env.FINAL_TAG = rawTag
                            env.RESOLVE_FROM_DEV = (rawTag == baseSemver) ? 'true' : 'false'
                        }
                    } else {
                        // DEV:
                        env.IS_PROD = 'false'
                        if (params.ACTION == 'Build & Deploy') {
                            env.FINAL_TAG = "${baseSemver}-b${BUILD_NUMBER}"
                        } else {
                            env.FINAL_TAG = rawTag
                        }
                    }

                    echo "=========================================================="
                    echo "🚀 KẾ HOẠCH TRIỂN KHAI FRONTEND:"
                    echo "   - Ứng dụng: ${APP_NAME}"
                    echo "   - Môi trường đích: [ ${params.TARGET_ENV.toUpperCase()} ]"
                    echo "   - Hành động: ${params.ACTION}"
                    echo "   - Phiên bản SemVer gốc: ${baseSemver}"
                    echo "   - Image Tag dự kiến: [ ${env.FINAL_TAG} ]"
                    if (env.IS_PROD == 'true') {
                        echo "   - Quy chuẩn Production: Tự động chốt Tag sạch SemVer [ ${env.FINAL_TAG} ]"
                    } else {
                        echo "   - Quy chuẩn Dev/Stag: Tự sinh Tag bất biến [ ${env.FINAL_TAG} ] (tránh cache K8s)"
                    }
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
                sh "docker build -t ${IMAGE_NAME}:${env.FINAL_TAG} -t ${IMAGE_NAME}:${params.TARGET_ENV}-latest ."

                echo '🛡️ Quét lỗ hổng bảo mật Docker Image bằng Trivy...'
                sh """
                    if command -v trivy &> /dev/null; then
                        trivy image --severity CRITICAL --exit-code 0 ${IMAGE_NAME}:${env.FINAL_TAG} || true
                    else
                        echo "Trivy chưa cài, bỏ qua quét Image"
                    fi
                """

                echo "🚀 Đẩy image lên Docker Hub..."
                withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh """
                        echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin
                        docker push ${IMAGE_NAME}:${env.FINAL_TAG}
                        docker push ${IMAGE_NAME}:${params.TARGET_ENV}-latest
                        if [ "${env.IS_PROD}" = "true" ]; then
                            docker tag ${IMAGE_NAME}:${env.FINAL_TAG} ${IMAGE_NAME}:latest
                            docker push ${IMAGE_NAME}:latest
                        fi
                    """
                }
            }
        }

        stage('3. Cập nhật GitOps Manifest & Đóng dấu Release') {
            steps {
                echo "🔄 Đang cập nhật Kustomize Manifest cho môi trường: ${params.TARGET_ENV}..."
                withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh """
                        rm -rf gitops-tmp
                        GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" git clone ${GITOPS_REPO_SSH} gitops-tmp
                        cd gitops-tmp/projects/cuahang/overlays/${params.TARGET_ENV}
                        
                        ACTUAL_TAG="${env.FINAL_TAG}"
                        
                        # Nếu là Staging Promote và chưa chỉ định tag -b, tự động lấy tag vừa test ở Dev
                        if [ "${params.TARGET_ENV}" = "stag" ] && [ "${env.RESOLVE_FROM_DEV}" = "true" ]; then
                            DEV_TAG=\$(grep -A 2 'name: ${APP_NAME}' ../dev/kustomization.yaml | grep 'newTag:' | awk '{print \$2}' | tr -d ' ' || true)
                            if [ -n "\$DEV_TAG" ]; then
                                ACTUAL_TAG="\$DEV_TAG"
                                echo "🎯 Tự động lấy Tag đã kiểm thử từ Dev sang Staging: \${ACTUAL_TAG}"
                            fi
                        fi
                        
                        # Nếu là Production Promote: Đóng dấu Tag sạch chính thức vx.x.x từ Staging
                        if [ "${params.TARGET_ENV}" = "prod" ] && [ "${params.ACTION}" = "Deploy Only (Promote)" ]; then
                            SRC_TAG="${env.SOURCE_TAG}"
                            if [ -z "\$SRC_TAG" ]; then
                                SRC_TAG=\$(grep -A 2 'name: ${APP_NAME}' ../stag/kustomization.yaml | grep 'newTag:' | awk '{print \$2}' | tr -d ' ' || true)
                            fi
                            if [ -n "\$SRC_TAG" ] && [ "\$SRC_TAG" != "\$ACTUAL_TAG" ]; then
                                echo "🔄 Lấy Image đã nghiệm thu từ Staging (\${SRC_TAG}) -> Gán nhãn Tag Prod sạch (\${ACTUAL_TAG})"
                                echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin
                                docker pull ${IMAGE_NAME}:\${SRC_TAG}
                                docker tag ${IMAGE_NAME}:\${SRC_TAG} ${IMAGE_NAME}:\${ACTUAL_TAG}
                                docker tag ${IMAGE_NAME}:\${SRC_TAG} ${IMAGE_NAME}:latest
                                docker push ${IMAGE_NAME}:\${ACTUAL_TAG}
                                docker push ${IMAGE_NAME}:latest
                                echo "✅ Đã gán nhãn và đẩy Tag Production sạch \${ACTUAL_TAG} thành công!"
                            fi
                        fi
                        
                        # Cập nhật image tag chuẩn xác bằng Kustomize CLI
                        kustomize edit set image ${APP_NAME}=docker.io/${IMAGE_NAME}:\${ACTUAL_TAG}
                        
                        git config user.name "jenkins-bot"
                        git config user.email "jenkins@lan"
                        
                        if git status --porcelain | grep -q 'kustomization.yaml'; then
                            git add kustomization.yaml
                            git commit -m "ci(${params.TARGET_ENV}): promote ${APP_NAME} to \${ACTUAL_TAG} via Jenkins [skip ci]"
                            GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" git push origin main
                            echo "✅ Đã commit và push cập nhật GitOps thành công với tag [\${ACTUAL_TAG}]!"
                        else
                            echo "ℹ️ Tag \${ACTUAL_TAG} đã tồn tại trong kustomization.yaml của ${params.TARGET_ENV}, không có thay đổi mới."
                        fi
                    """
                }
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
            echo "✅ Pipeline hoàn thành xuất sắc! Môi trường [ ${params.TARGET_ENV.toUpperCase()} ] đã được đồng bộ."
        }
        failure {
            echo "❌ Pipeline gặp lỗi! Vui lòng kiểm tra log chi tiết."
        }
    }
}
