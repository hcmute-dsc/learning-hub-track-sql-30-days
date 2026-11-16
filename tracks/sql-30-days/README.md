# 30 ngày học SQL

Lộ trình học SQL trong 30 ngày với PostgreSQL 16 và bộ dữ liệu DSC Shop: từ SELECT cơ bản tới index, transaction, window function, tối ưu truy vấn và bảo mật.

Nguồn: [hcmute-dsc/sql-challenge](https://github.com/hcmute-dsc/sql-challenge) @ `6ae7152` (giấy phép MIT), nhập bằng `tools/import-sql-challenge.mjs`. Sửa nội dung tại đây; nếu nhập lại từ nguồn, các chỉnh sửa tại đây sẽ bị ghi đè.

## Chuẩn bị môi trường

Cần Docker. Trong thư mục này chạy `docker compose up -d`, xem [setup/README.md](setup/README.md).

## Mục lục

### Chặng 1: Nền tảng và truy vấn đơn giản

- [Lộ trình 30 ngày học SQL](modules/01-foundations/lessons/00-30-day-sql-learning-roadmap.md)
- [Ngày 1: Giới thiệu SQL, RDBMS và môi trường thực hành](modules/01-foundations/lessons/01-intro-to-sql-and-dbms.md)
- [Ngày 2: Bảng, kiểu dữ liệu và ràng buộc](modules/01-foundations/lessons/02-table-structure-and-data-types.md)
- [Ngày 3: SELECT và WHERE, truy vấn và lọc dữ liệu](modules/01-foundations/lessons/03-select-where.md)
- [Ngày 4: ORDER BY và LIMIT, sắp xếp và phân trang](modules/01-foundations/lessons/04-order-by-limit.md)
- [Ngày 5: Toán tử, biểu thức và hàm thường dùng](modules/01-foundations/lessons/05-operators-expressions.md)
- [Ngày 6: Thêm, sửa, xóa dữ liệu (INSERT, UPDATE, DELETE)](modules/01-foundations/lessons/06-insert-update-delete.md)
- [Ngày 7: Ôn tập 1 (Ngày 1 đến 6)](modules/01-foundations/lessons/07-review-1.md)

### Chặng 2: Tổng hợp và kết hợp dữ liệu

- [Ngày 8: Hàm tổng hợp (COUNT, SUM, AVG, MIN, MAX)](modules/02-aggregation-and-joins/lessons/08-aggregate-functions.md)
- [Ngày 9: Nhóm dữ liệu với GROUP BY và HAVING](modules/02-aggregation-and-joins/lessons/09-group-by-having.md)
- [Ngày 10: Kết hợp nhiều bảng với JOIN](modules/02-aggregation-and-joins/lessons/10-join.md)
- [Ngày 11: Truy vấn con (subquery) và CTE](modules/02-aggregation-and-joins/lessons/11-subquery.md)
- [Ngày 12: UNION, INTERSECT và EXCEPT](modules/02-aggregation-and-joins/lessons/12-union-intersect.md)
- [Ngày 13: CASE và tổng hợp có điều kiện](modules/02-aggregation-and-joins/lessons/13-case-when.md)
- [Ngày 14: Ôn tập 2 - Báo cáo trên DSC Shop](modules/02-aggregation-and-joins/lessons/14-review-2.md)

### Chặng 3: Index, transaction và các đối tượng database

- [Ngày 15: Chỉ mục (index)](modules/03-database-objects/lessons/15-index.md)
- [Ngày 16: Transaction và ACID](modules/03-database-objects/lessons/16-transactions-acid.md)
- [Ngày 17: Function và Stored Procedure](modules/03-database-objects/lessons/17-stored-procedures-functions.md)
- [Ngày 18: Trigger](modules/03-database-objects/lessons/18-triggers.md)
- [Ngày 19: View và materialized view](modules/03-database-objects/lessons/19-views.md)
- [Ngày 20: Đọc kế hoạch thực thi với EXPLAIN](modules/03-database-objects/lessons/20-query-performance.md)
- [Ngày 21: Ôn tập 3 (Ngày 15-20)](modules/03-database-objects/lessons/21-review-3.md)

### Chặng 4: SQL trong thực tế

- [Ngày 22: Làm việc với JSON và JSONB](modules/04-sql-in-practice/lessons/22-sql-json-practice.md)
- [Ngày 23: Kết nối SQL từ ứng dụng](modules/04-sql-in-practice/lessons/23-sql-connect-apps.md)
- [Ngày 24: Nhập và xuất dữ liệu với CSV](modules/04-sql-in-practice/lessons/24-import-export-data.md)
- [Ngày 25: SQL và dữ liệu lớn](modules/04-sql-in-practice/lessons/25-big-data.md)
- [Ngày 26: SQL và NoSQL](modules/04-sql-in-practice/lessons/26-sql-nosql.md)
- [Ngày 27: Thiết kế cơ sở dữ liệu](modules/04-sql-in-practice/lessons/27-database-design-best-practices.md)
- [Ngày 28: Tối ưu truy vấn](modules/04-sql-in-practice/lessons/28-sql-query-optimization.md)
- [Ngày 29: Window function và truy vấn đệ quy](modules/04-sql-in-practice/lessons/29-recursive-queries-window-functions.md)
- [Ngày 30: Bảo mật cơ sở dữ liệu](modules/04-sql-in-practice/lessons/30-database-security.md)
- [Tổng kết và dự án cuối khóa](modules/04-sql-in-practice/lessons/99-summary.md)
