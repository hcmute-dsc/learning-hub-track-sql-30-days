---
uid: "9fce6157-6b2b-5afe-bad8-2da4e4c62a57"
slug: "review-1"
title: "Ngày 7: Ôn tập 1 (Ngày 1 đến 6)"
objectives:
  - "Tự kiểm tra mình đã nắm chắc phần nào của Ngày 1 đến 6 và phần nào cần đọc lại."
  - "Viết được truy vấn đọc dữ liệu kết hợp lọc, xử lý NULL, sắp xếp, phân trang và cột tính toán."
  - "Tạo được một bảng nháp có đủ ràng buộc, rồi thêm, sửa, xóa dữ liệu trên đó theo quy trình an toàn."
prerequisites:
  - "sql-30-days/foundations/intro-to-sql-and-dbms"
  - "sql-30-days/foundations/table-structure-and-data-types"
  - "sql-30-days/foundations/select-where"
  - "sql-30-days/foundations/order-by-limit"
  - "sql-30-days/foundations/operators-expressions"
  - "sql-30-days/foundations/insert-update-delete"
authors:
  - "github:TienNHM"
license: "MIT"
---

> **Tóm tắt:** Bài ôn tập chặng đầu. Không có kiến thức mới: bạn dùng lại những gì đã học từ Ngày 1 đến Ngày 6 (khám phá schema, kiểu dữ liệu và ràng buộc, SELECT/WHERE/NULL, ORDER BY/LIMIT, biểu thức và hàm, INSERT/UPDATE/DELETE) để giải 16 bài tập trên DSC Shop, chia ba mức độ, có đáp án và kết quả thật để tự chấm.

**Sau bài này bạn có thể:**

- Tự kiểm tra mình đã nắm chắc phần nào của Ngày 1 đến 6 và phần nào cần đọc lại.
- Viết được truy vấn đọc dữ liệu kết hợp lọc, xử lý NULL, sắp xếp, phân trang và cột tính toán.
- Tạo được một bảng nháp có đủ ràng buộc, rồi thêm, sửa, xóa dữ liệu trên đó theo quy trình an toàn.

**Cần biết trước:** [Ngày 1](01-intro-to-sql-and-dbms.md), [Ngày 2](02-table-structure-and-data-types.md), [Ngày 3](03-select-where.md), [Ngày 4](04-order-by-limit.md), [Ngày 5](05-operators-expressions.md), [Ngày 6](06-insert-update-delete.md).

## Cách làm bài

1. Mở psql hoặc Adminer, kết nối database `sql_challenge` (xem [setup/README.md](../../../setup/README.md)).
2. Tự viết truy vấn trước, chạy thử, rồi mới mở "Đáp án" để so. Kết quả của bạn phải khớp từng dòng (thứ tự dòng khớp khi đề có yêu cầu sắp xếp).
3. Mọi đáp án được chạy trên dữ liệu gốc. Bài nào sửa dữ liệu thì đáp án bọc trong `BEGIN ... ROLLBACK` hoặc làm trên bảng nháp, nên làm xong dữ liệu shop vẫn như cũ. Nếu lỡ sửa thật, chạy lại script init:

```sh
docker compose exec -T db psql -U postgres -d sql_challenge -f /docker-entrypoint-initdb.d/01_schema.sql -f /docker-entrypoint-initdb.d/02_seed.sql
```

4. Chỉ dùng kiến thức đến Ngày 6: chưa dùng `COUNT`/`SUM` (Ngày 8), `GROUP BY` (Ngày 9) hay JOIN (Ngày 10).

Gợi ý tự chấm: làm đúng 12/16 bài trở lên là sẵn sàng sang chặng 2. Sai bài nào, đọc lại ngày ghi trong ngoặc ở đầu bài đó.

## Ôn nhanh

| Ngày | Ý chính cần nhớ |
| --- | --- |
| 1 | SQL là ngôn ngữ khai báo: bạn nói muốn gì, database tự tìm cách lấy. `\dt` liệt kê bảng, `\d ten_bang` xem cấu trúc. Nhóm lệnh: DDL (`CREATE`, `ALTER`, `DROP`), DML (`SELECT`, `INSERT`, `UPDATE`, `DELETE`), DCL (`GRANT`, `REVOKE`), TCL (`BEGIN`, `COMMIT`, `ROLLBACK`) |
| 2 | Tiền dùng `NUMERIC`, không dùng `FLOAT`. Khóa chính `GENERATED ALWAYS AS IDENTITY`. Ràng buộc `NOT NULL`, `UNIQUE`, `CHECK`, `DEFAULT`, khóa ngoại `REFERENCES ... ON DELETE` |
| 3 | `SELECT ... FROM ... WHERE`; `IN`, `BETWEEN`, `LIKE`/`ILIKE`; `IS NULL`, không bao giờ `= NULL`; `NOT` > `AND` > `OR`, nên dùng ngoặc khi trộn `AND`/`OR` |
| 4 | `ORDER BY` nhiều cột, `ASC`/`DESC`, `NULLS FIRST/LAST`; `LIMIT ... OFFSET ...`; phân trang cần `ORDER BY` xác định duy nhất thứ tự |
| 5 | `INT / INT` chia nguyên; `||` nối chuỗi; `UPPER`, `TRIM`, `REPLACE`, `SUBSTRING`; `EXTRACT`, `AGE`, `INTERVAL`; `::kieu`; `ROUND`; `COALESCE`, `NULLIF` |
| 6 | `INSERT ... RETURNING`, `INSERT ... SELECT`, `ON CONFLICT`; `UPDATE ... FROM`; `DELETE`; `TRUNCATE`. Quy trình an toàn: SELECT xem trước, `BEGIN`, kiểm tra, `COMMIT`/`ROLLBACK` |

## Lỗi thường gặp (tổng hợp chặng 1)

| Lỗi | Ví dụ sai | Cách đúng |
| --- | --- | --- |
| So sánh với NULL bằng `=` | `WHERE phone = NULL` (luôn 0 dòng) | `WHERE phone IS NULL` |
| Quên rằng `<>` bỏ qua NULL | `WHERE city <> 'Hà Nội'` không trả khách chưa có city | thêm `OR city IS NULL` nếu muốn lấy cả họ (Bài 7) |
| Trộn `AND`/`OR` không ngoặc | `status = 'paid' OR status = 'shipped' AND ...` | `(status = 'paid' OR status = 'shipped') AND ...` (Bài 8) |
| Chia nguyên khi cả hai vế là số nguyên | `stock_quantity / 200 * 100` ra 0 với Sạc Anker (40 cái) | `stock_quantity * 100.0 / 200` hoặc ép `::NUMERIC` trước khi chia (Ngày 5) |
| Phân trang không có thứ tự duy nhất | `ORDER BY price LIMIT 5 OFFSET 5` khi nhiều sản phẩm cùng giá | thêm cột khóa: `ORDER BY price DESC, product_id` (Bài 11) |
| Dùng `FLOAT` cho tiền | `price FLOAT` | `price NUMERIC(12,0)` |
| `UPDATE`/`DELETE` không xem trước | sửa theo tên, sửa nhầm hai "Nguyễn Văn An" | SELECT trước, lọc theo khóa chính, chạy trong `BEGIN` |

## Bài tập

Phần bài tập của bài này nằm ở bài tập **Bài tập: Ôn tập 1 (Ngày 1 đến 6)** ngay sau bài học.

## Tóm tắt

- Đọc dữ liệu: `SELECT` cột cần dùng, `WHERE` để lọc (nhớ ngoặc khi trộn `AND`/`OR`), `ORDER BY` + `LIMIT/OFFSET` để sắp và phân trang với thứ tự xác định duy nhất.
- NULL là "chưa biết": dùng `IS NULL`/`IS NOT NULL`, nhớ rằng `<>` và phép nối chuỗi cũng gặp NULL; `COALESCE` để thay giá trị mặc định, `NULLS LAST` khi sắp xếp.
- Biểu thức: cẩn thận chia nguyên, dùng `ROUND`, ép kiểu `::`, lọc ngày bằng điều kiện khoảng.
- Ghi dữ liệu: ràng buộc là người gác cổng; sửa/xóa theo khóa chính, xem trước bằng SELECT, chạy trong `BEGIN`, kiểm tra rồi mới `COMMIT`.
- Chặng 2 bắt đầu từ [Ngày 8](../../02-aggregation-and-joins/lessons/08-aggregate-functions.md): gom nhiều dòng thành con số thống kê.

## Đọc thêm

- [PostgreSQL tutorial: The SQL Language](https://www.postgresql.org/docs/16/tutorial-sql.html)
- [PostgreSQL: Comparison Functions and Operators](https://www.postgresql.org/docs/16/functions-comparison.html) (`IS NULL`, `IS DISTINCT FROM`)
- [Vì sao NOT IN của bạn trả về 0 dòng? Logic ba trị của SQL và cái bẫy NULL](https://tiennhm.io.vn/blog/sql-null-not-in-three-valued-logic) — đọc trước để chuẩn bị cho Ngày 11.
