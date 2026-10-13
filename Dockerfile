FROM nginx:1.27-alpine

# Copy cấu hình Nginx tối ưu
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy mã nguồn tĩnh vào thư mục phục vụ web của Nginx
COPY public/ /usr/share/nginx/html/

EXPOSE 80

# Chạy kiểm tra sức khỏe
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
