---
uid: "f70320cf-d8a8-59e3-8da4-659330df2c79"
slug: "summary"
title: "Tổng kết và dự án cuối khóa"
objectives: []
prerequisites:
  - "sql-30-days/foundations/30-day-sql-learning-roadmap"
authors:
  - "github:TienNHM"
license: "MIT"
---

> **Tóm tắt:** Trang này nhìn lại 30 ngày học SQL theo bốn chặng, nêu các lỗi hay gặp khi làm dự án và gợi ý những gì nên học tiếp sau khóa này. Hai bài tập ngay sau trang này là **Câu hỏi ôn tập cuối khóa** (10 câu có đáp án chạy được trên DSC Shop) và **Dự án cuối khóa** (kèm rubric chấm điểm chi tiết để mentor CLB chấm thống nhất).

**Sau bài này bạn có thể:**
- Tự kiểm tra mình đã nắm từng chặng chưa bằng 10 câu ôn tập có đáp án.
- Thiết kế và xây dựng một database hoàn chỉnh cho một bài toán thật: từ ERD, schema 3NF có ràng buộc, dữ liệu mẫu, đến truy vấn báo cáo, index, API và sao lưu.
- Đọc rubric để biết bài nộp thế nào là đạt, giỏi, và tự chấm trước khi nộp.
- Chọn hướng học tiếp phù hợp (backend, phân tích dữ liệu, data engineering, quản trị database).

**Cần biết trước:** toàn bộ khóa học, xem [Lộ trình 30 ngày](../../01-foundations/lessons/00-30-day-sql-learning-roadmap.md).

---

## 1. Nhìn lại 30 ngày

Cả khóa dùng một hệ quản trị là **PostgreSQL 16** và một bộ dữ liệu chung là cửa hàng **DSC Shop** ([setup/README.md](../../../setup/README.md)). Bốn chặng đi từ "đọc được dữ liệu" tới "xây được một hệ thống dùng database đúng cách":

| Chặng | Ngày | Bạn đã học | Sau chặng này bạn làm được |
| --- | --- | --- | --- |
| 1. Nền tảng và truy vấn đơn giản | 1-7 | SQL và RDBMS, môi trường Docker/psql; kiểu dữ liệu và ràng buộc; `SELECT`, `WHERE`, NULL và logic ba trị; `ORDER BY`, `LIMIT`; hàm chuỗi, ngày giờ, `COALESCE`; `INSERT`, `UPDATE`, `DELETE`, UPSERT | Tạo bảng có ràng buộc, lọc và sửa dữ liệu an toàn trong `BEGIN ... ROLLBACK` |
| 2. Tổng hợp và kết hợp dữ liệu | 8-14 | Hàm tổng hợp; `GROUP BY`, `HAVING`; các loại `JOIN`, SELF JOIN, anti-join; subquery, `EXISTS`, CTE; `UNION`/`INTERSECT`/`EXCEPT`; `CASE`, `FILTER` | Trả lời câu hỏi nghiệp vụ trải trên nhiều bảng, tránh bẫy nhân dòng và `NOT IN` với NULL |
| 3. Index, transaction và các đối tượng database | 15-21 | Index B-tree và cách đo; transaction, ACID, isolation level, khóa dòng; function, procedure, trigger; view, materialized view; `EXPLAIN ANALYZE` | Làm truy vấn nhanh hơn có số đo, viết thao tác nhiều bước không bị hỏng dữ liệu, đóng gói logic trong database |
| 4. SQL trong thực tế | 22-30 | JSONB; kết nối từ Python/Node.js bằng truy vấn tham số hóa; `COPY`; partition; SQL và NoSQL; thiết kế và chuẩn hóa; tối ưu truy vấn; window function và CTE đệ quy; phân quyền, hash mật khẩu, `pg_dump` | Thiết kế database cho một bài toán mới, nối nó với ứng dụng, viết báo cáo phân tích, bảo vệ và sao lưu dữ liệu |

Bài tập **Dự án cuối khóa** dùng lại kiến thức của **cả bốn chặng**. Nếu làm dự án mà thấy hổng chỗ nào, quay lại đúng ngày đó trong bảng trên.

---

## Bài tập

Phần bài tập của bài này gồm hai bài ngay sau bài học:

- **Câu hỏi ôn tập cuối khóa**: 10 câu, mỗi câu chạm vào một nhóm kỹ năng chính, có đáp án để tự so.
- **Dự án cuối khóa**: xây database cho một bài toán mới, nộp repo, chấm theo rubric 100 điểm.

## 2. Lỗi thường gặp khi làm dự án

- **Thiết kế bảng theo màn hình giao diện** thay vì theo thực thể, dẫn tới một bảng chứa lặp thông tin của thực thể khác. Bắt đầu từ ERD, kiểm tra phụ thuộc hàm (Ngày 27).
- **Dùng `FLOAT` cho tiền** và `TIMESTAMP` (không múi giờ) cho thời điểm sự kiện. Dùng `NUMERIC` và `TIMESTAMPTZ` (Ngày 2).
- **Lưu tổng tiền, số lượng đăng ký... thành cột** rồi quên cập nhật. Nếu tính được từ dữ liệu gốc, hãy tính bằng truy vấn hoặc view; chỉ lưu khi đã đo thấy cần và có trigger hoặc transaction giữ cho đúng.
- **Seed quá ít dữ liệu** nên mọi truy vấn trả 0-1 dòng, và `EXPLAIN` trên bảng 30 dòng luôn ra Seq Scan. Sinh bảng lớn bằng `generate_series`.
- **Ghép chuỗi SQL trong API** "cho nhanh", hoặc commit file `.env` có mật khẩu lên repo.
- **Kết luận "index làm nhanh hơn" mà không có số đo**, hoặc đo một lần duy nhất ngay sau khi tạo bảng (cache còn lạnh). Chạy vài lần, ghi số ổn định.

---

## 3. Học gì tiếp theo?

Khóa học đã phủ phần lõi. Những hướng dưới đây là phần **chưa có** trong 30 ngày, chọn theo việc bạn muốn làm:

| Bạn muốn | Học tiếp | Gợi ý bắt đầu |
| --- | --- | --- |
| Làm backend | Migration schema (Alembic, Flyway, Prisma Migrate), ORM ở mức sâu, connection pooler (PgBouncer), cách thiết kế API phân trang và lọc | Đưa dự án cuối khóa sang dùng migration thay cho script tay |
| Phân tích dữ liệu | `GROUPING SETS`/`ROLLUP`/`CUBE`, phân tích cohort và retention, SQL kết hợp Python (pandas) hoặc công cụ BI (Metabase, Power BI) | Viết báo cáo cohort khách hàng theo tháng đăng ký trên DSC Shop |
| Data engineering | Mô hình kho dữ liệu (star schema, fact và dimension), dbt, pipeline ETL/ELT, kho dữ liệu dạng cột | Thiết kế star schema cho doanh thu DSC Shop |
| Quản trị database | MVCC và `VACUUM`, WAL, cài đặt replication thật, `pg_stat_statements` để tìm truy vấn chậm, giám sát và cảnh báo | Bật `pg_stat_statements` trên Docker và tìm 5 truy vấn tốn thời gian nhất |
| Mở rộng PostgreSQL | Full-text search (`tsvector`), PostGIS cho dữ liệu bản đồ, extension `pgvector` cho tìm kiếm vector | Thêm tìm kiếm tên sản phẩm có dấu/không dấu cho DSC Shop |

Luyện tập đều đặn quan trọng hơn học thêm chủ đề mới. Các trang luyện SQL có chấm tự động (LeetCode Database, HackerRank SQL) hợp để giữ tay quen; khi luyện, nhớ để ý dialect của từng trang có thể là MySQL thay vì PostgreSQL.

## Tóm tắt

- Khóa học đi qua bốn chặng: nền tảng (1-7), tổng hợp và kết hợp dữ liệu (8-14), index, transaction và các đối tượng database (15-21), SQL trong thực tế (22-30).
- Mười câu ôn tập phủ các kỹ năng chính; câu nào chưa làm được, quay lại đúng ngày ghi trong câu hỏi.
- Dự án cuối khóa yêu cầu một database thiết kế từ đầu: ERD và 3NF, schema có ràng buộc, seed, 15-20 truy vấn báo cáo, transaction, view, function/trigger, đo EXPLAIN trước/sau index, API tham số hóa, role quyền tối thiểu và sao lưu có khôi phục thử.
- Rubric 100 điểm với ba mức cho mỗi tiêu chí, điều kiện bắt buộc về script chạy được, và quy tắc hạ mức với lỗi bảo mật nghiêm trọng.
- Hướng học tiếp chọn theo vai trò: backend, phân tích dữ liệu, data engineering, quản trị database.

## Đọc thêm

- Tài liệu chính thức PostgreSQL 16: <https://www.postgresql.org/docs/16/>, đặc biệt phần [SQL Commands](https://www.postgresql.org/docs/16/sql-commands.html) để tra cú pháp khi làm dự án.
- [Luỹ kế của bạn sai ngay dòng đầu: window function, RANGE và cái mặc định ít ai đọc](https://tiennhm.io.vn/blog/window-function-vs-group-by) — đọc lại trước khi viết các truy vấn lũy kế trong dự án.
- [LEFT JOIN của bạn đã thành INNER JOIN mà không ai báo](https://tiennhm.io.vn/blog/left-join-thanh-inner-join) — bẫy hay gặp nhất khi viết báo cáo có LEFT JOIN.
