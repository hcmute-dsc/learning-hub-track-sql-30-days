---
uid: "101ec2e5-daa9-5c01-af54-3acd1c096d3d"
slug: "review-3"
title: "Ngày 21: Ôn tập 3 (Ngày 15-20)"
objectives:
  - "Đo một truy vấn trên 1 triệu dòng bằng `EXPLAIN ANALYZE` trước và sau khi tạo index, và giải thích vì sao plan thay đổi."
  - "Chọn đúng loại index (một cột, nhiều cột, partial) cho một truy vấn và nhận ra khi nào index không được dùng."
  - "Viết một quy trình đặt hàng an toàn bằng transaction, rồi gói nó thành procedure PL/pgSQL có kiểm tra lỗi."
  - "Nhận ra xung đột giữa trigger và code ứng dụng (trừ kho hai lần) và chọn một nơi duy nhất cho mỗi quy tắc."
  - "Dùng view để gói truy vấn JOIN nhiều bảng và viết điều kiện thời gian bằng khoảng nửa mở."
prerequisites:
  - "sql-30-days/database-objects/index"
  - "sql-30-days/database-objects/transactions-acid"
  - "sql-30-days/database-objects/stored-procedures-functions"
  - "sql-30-days/database-objects/triggers"
  - "sql-30-days/database-objects/views"
  - "sql-30-days/database-objects/query-performance"
authors:
  - "github:TienNHM"
license: "MIT"
---

> **Tóm tắt:** Bài ôn tập chặng 3: index, transaction, function và procedure, trigger, view, đọc plan bằng `EXPLAIN`. Phần đầu là bảng tóm tắt và câu hỏi kiểm tra khái niệm, phần sau là 10 bài tập chạy trên DSC Shop (schema `shop`) và dữ liệu lớn (schema `perf`), có đáp án và số đo thật.

**Sau bài này bạn có thể:**

- Đo một truy vấn trên 1 triệu dòng bằng `EXPLAIN ANALYZE` trước và sau khi tạo index, và giải thích vì sao plan thay đổi.
- Chọn đúng loại index (một cột, nhiều cột, partial) cho một truy vấn và nhận ra khi nào index không được dùng.
- Viết một quy trình đặt hàng an toàn bằng transaction, rồi gói nó thành procedure PL/pgSQL có kiểm tra lỗi.
- Nhận ra xung đột giữa trigger và code ứng dụng (trừ kho hai lần) và chọn một nơi duy nhất cho mỗi quy tắc.
- Dùng view để gói truy vấn JOIN nhiều bảng và viết điều kiện thời gian bằng khoảng nửa mở.

**Cần biết trước:** [Ngày 15](15-index.md), [Ngày 16](16-transactions-acid.md), [Ngày 17](17-stored-procedures-functions.md), [Ngày 18](18-triggers.md), [Ngày 19](19-views.md), [Ngày 20](20-query-performance.md).

## Chuẩn bị

- Database DSC Shop ở trạng thái gốc. Nếu đã sửa dữ liệu ở các bài trước, chạy lại script init (mục "Làm lại từ đầu" trong [setup/README.md](../../../setup/README.md)).
- Schema `perf` (100.000 khách, 1.000.000 đơn) đã được nạp bằng `setup/perf_seed.sql`. Bảng `perf.orders` chỉ có index khóa chính.
- Mọi bài tập sửa dữ liệu shop đều kết thúc bằng `ROLLBACK`, và mọi index tạo trên `perf` đều được xóa ở cuối bài, để bài sau chạy trên cùng một trạng thái.

## Tóm tắt kiến thức chặng 3

| Ngày | Chủ đề | Ý chính cần nhớ |
| --- | --- | --- |
| 15 | Index | B-tree giúp tìm ít dòng trong bảng lớn. Index nhiều cột dùng được khi điều kiện chạm cột đầu tiên (tiền tố trái). Partial index chỉ chứa dòng thỏa `WHERE`. Mỗi index làm chậm `INSERT`/`UPDATE` và tốn chỗ. PostgreSQL không tự tạo index cho khóa ngoại. |
| 16 | Transaction | `BEGIN` ... `COMMIT`/`ROLLBACK`: tất cả hoặc không gì cả. Một lệnh lỗi làm transaction hỏng, chỉ còn `ROLLBACK` được. `SELECT ... FOR UPDATE` khóa dòng để tránh lost update. |
| 17 | Function, procedure | Function trả về giá trị, gọi trong `SELECT`. Procedure gọi bằng `CALL`, được `COMMIT` bên trong. `RAISE EXCEPTION` dừng và hủy mọi thay đổi chưa commit. |
| 18 | Trigger | Chạy tự động trước/sau `INSERT`/`UPDATE`/`DELETE`. Tiện nhưng là "logic ẩn": người gọi không thấy, dễ trùng việc với code ứng dụng. |
| 19 | View | View thường chỉ lưu câu `SELECT`, không nhanh hơn. Materialized view lưu kết quả, phải `REFRESH`. `WITH CHECK OPTION` chặn ghi dữ liệu ngoài view. |
| 20 | EXPLAIN | `EXPLAIN` cho plan ước lượng, `EXPLAIN ANALYZE` chạy thật và cho số thật. So `rows` ước lượng với `actual rows`. Seq Scan không phải lúc nào cũng xấu. |

## Bài tập

Phần bài tập của bài này nằm ở bài tập **Bài tập: Ôn tập 3 (Ngày 15-20)** ngay sau bài học.

## Tóm tắt

- Index giúp khi lấy ít dòng từ bảng lớn. Kiểm tra bằng `EXPLAIN ANALYZE`, không đoán. Index nhiều cột theo quy tắc tiền tố trái; partial index nhỏ và nhanh cho tập con hay truy vấn.
- Cột bọc trong hàm (`DATE_TRUNC`, `EXTRACT`, ép kiểu) thường làm mất index. Viết điều kiện thời gian bằng khoảng nửa mở `>= đầu AND < cuối`, không dùng `BETWEEN` với cột thời gian.
- Transaction đảm bảo tất cả hoặc không gì cả; sau một lỗi chỉ còn `ROLLBACK`. Dùng `currval(...)` hoặc `RETURNING`, không dùng `MAX(id)`, để lấy mã vừa tạo.
- Procedure PL/pgSQL gói quy trình nhiều bước với `RAISE EXCEPTION` và `SELECT ... FOR UPDATE`. Ràng buộc `CHECK` là lưới an toàn cuối cùng.
- Mỗi quy tắc nghiệp vụ chỉ nên nằm ở một nơi: trigger và code cùng trừ kho là trừ hai lần.
- View gói truy vấn nhiều bảng; materialized view đánh đổi độ mới của dữ liệu lấy tốc độ.

## Đọc thêm

- [PostgreSQL: Using EXPLAIN](https://www.postgresql.org/docs/16/using-explain.html)
- [PostgreSQL: Partial Indexes](https://www.postgresql.org/docs/16/indexes-partial.html)
- [PostgreSQL: Multicolumn Indexes](https://www.postgresql.org/docs/16/indexes-multicolumn.html)
