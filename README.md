# cuahang-fe — Frontend Service

Giao diện Web thương mại điện tử trực quan cho dự án DevOps **`cuahang`**.

## Tính năng:
* Hiển thị bảng điều khiển DevOps: Tự động nhận diện môi trường (`DEV`, `STAGING`, `PRODUCTION`).
* Đo độ trễ thời gian thực tới Backend (`latency ms`) và hiển thị hostname của Pod đang phục vụ request.
* Tự động gọi API `/api/products` và cho phép gửi đơn hàng trực tiếp vào cơ sở dữ liệu PostgreSQL.
* Đóng gói bằng **Nginx Alpine** siêu nhẹ (~25 MB).

## Chạy thử với Docker:
```bash
docker build -t cuahang-fe:latest .
docker run -p 80:80 cuahang-fe:latest
```
Truy cập: `http://localhost`
