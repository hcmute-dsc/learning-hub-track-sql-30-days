> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Câu hỏi ôn tập cuối khóa

Mười câu, mỗi câu chạm vào một nhóm kỹ năng chính. Tự làm trước rồi mới mở đáp án. Mọi đáp án SQL chạy trên dữ liệu gốc của DSC Shop; câu nào có tạo đối tượng hay sửa dữ liệu đều tự dọn hoặc `ROLLBACK` ở cuối.

### Cơ bản

**Câu 1 (Ngày 3-5).** Lấy tất cả đơn hàng trong 3 tháng gần nhất tính đến ngày 17/10/2026, sắp xếp theo thời gian đặt.

<details>
<summary>Đáp án</summary>

```sql
SELECT order_id,
       customer_id,
       order_date,
       status
FROM orders
WHERE order_date >= DATE '2026-10-17' - INTERVAL '3 months'
ORDER BY order_date;
```

Kết quả:

| order_id | customer_id | order_date | status |
| --- | --- | --- | --- |
| 36 | 18 | 2026-08-08 18:00:00+07 | delivered |
| 37 | 1 | 2026-09-02 10:00:00+07 | shipped |
| 38 | 13 | 2026-09-20 16:30:00+07 | paid |
| 39 | 15 | 2026-10-05 09:00:00+07 | paid |
| 40 | 3 | 2026-10-14 22:00:00+07 | pending |

Trong ứng dụng thật, thay `DATE '2026-10-17'` bằng `CURRENT_DATE`. Ở đây dùng ngày cố định để kết quả không thay đổi theo ngày bạn chạy. Điều kiện viết trực tiếp trên cột `order_date` (không bọc hàm quanh cột) nên dùng được index nếu có (Ngày 28).

> **Ghi chú dialect:** MySQL viết `order_date >= CURDATE() - INTERVAL 3 MONTH` (hoặc `DATE_SUB(CURDATE(), INTERVAL 3 MONTH)`), SQL Server viết `order_date >= DATEADD(MONTH, -3, CAST(GETDATE() AS DATE))`.
</details>

**Câu 2 (Ngày 10).** Tìm những khách hàng chưa từng đặt đơn nào.

<details>
<summary>Đáp án</summary>

```sql
SELECT c.customer_id,
       c.full_name,
       c.created_at::date AS ngay_dang_ky
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL
ORDER BY c.customer_id;
```

Kết quả:

| customer_id | full_name | ngay_dang_ky |
| --- | --- | --- |
| 16 | Tạ Quang Sơn | 2025-11-20 |
| 17 | Châu Ngọc Trâm | 2026-01-15 |

Đây là anti-join. Cách viết tương đương: `WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)` (Ngày 11).
</details>

**Câu 3 (Ngày 8, 9, 13).** Phân loại các đơn đã thanh toán thành ba nhóm theo giá trị: lớn (từ 20 triệu), vừa (5 đến dưới 20 triệu), nhỏ (dưới 5 triệu). Mỗi nhóm có bao nhiêu đơn và tổng doanh thu bao nhiêu?

<details>
<summary>Đáp án</summary>

```sql
WITH order_totals AS (
    SELECT o.order_id,
           ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))) AS tong_tien
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status NOT IN ('pending', 'cancelled')
    GROUP BY o.order_id
)
SELECT CASE
           WHEN tong_tien >= 20000000 THEN 'Lớn (từ 20 triệu)'
           WHEN tong_tien >= 5000000  THEN 'Vừa (5-20 triệu)'
           ELSE 'Nhỏ (dưới 5 triệu)'
       END AS nhom_don,
       COUNT(*) AS so_don,
       SUM(tong_tien) AS doanh_thu
FROM order_totals
GROUP BY 1
ORDER BY MIN(tong_tien) DESC;
```

Kết quả:

| nhom_don | so_don | doanh_thu |
| --- | --- | --- |
| Lớn (từ 20 triệu) | 11 | 298101500 |
| Vừa (5-20 triệu) | 18 | 222083500 |
| Nhỏ (dưới 5 triệu) | 7 | 16106000 |

Phải tính tổng tiền từng đơn trước (trong CTE), rồi mới phân loại. Nếu `CASE` trên từng dòng `order_items` thì đang phân loại dòng hàng chứ không phải đơn. `GROUP BY 1` nghĩa là nhóm theo cột thứ nhất trong `SELECT`.
</details>

### Vận dụng

**Câu 4 (Ngày 17).** Viết function `so_don_cua_khach` nhận vào `customer_id` và trả về số đơn đã thanh toán của khách đó.

<details>
<summary>Đáp án</summary>

```sql
CREATE OR REPLACE FUNCTION so_don_cua_khach(p_customer_id INT)
RETURNS BIGINT
LANGUAGE sql
AS $$
    SELECT COUNT(*)
    FROM orders
    WHERE customer_id = p_customer_id
      AND status NOT IN ('pending', 'cancelled');
$$;

SELECT so_don_cua_khach(1) AS khach_1,
       so_don_cua_khach(16) AS khach_16;
```

Kết quả:

| khach_1 | khach_16 |
| --- | --- |
| 5 | 0 |

`COUNT(*)` trả về kiểu `BIGINT` nên function khai báo `RETURNS BIGINT`. Khách 16 chưa mua gì, `COUNT` trả 0 chứ không phải NULL. Dọn function sau khi thử:

```sql
DROP FUNCTION so_don_cua_khach(INT);
```
</details>

**Câu 5 (Ngày 29).** Xếp hạng khách hàng theo tổng chi tiêu, in 5 khách đứng đầu.

<details>
<summary>Đáp án</summary>

```sql
WITH chi_tieu AS (
    SELECT o.customer_id,
           ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))) AS tong_chi
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status NOT IN ('pending', 'cancelled')
    GROUP BY o.customer_id
)
SELECT c.customer_id,
       c.full_name,
       ct.tong_chi,
       RANK() OVER (ORDER BY ct.tong_chi DESC) AS hang
FROM chi_tieu ct
JOIN customers c ON c.customer_id = ct.customer_id
ORDER BY hang
LIMIT 5;
```

Kết quả:

| customer_id | full_name | tong_chi | hang |
| --- | --- | --- | --- |
| 10 | Dương Minh Khoa | 63220500 | 1 |
| 15 | Nguyễn Văn An | 58970000 | 2 |
| 2 | Trần Thị Bình | 58262500 | 3 |
| 18 | Mai Đức Uy | 46980000 | 4 |
| 14 | Huỳnh Tấn Phát | 45880500 | 5 |

Khách hạng 2 là Nguyễn Văn An **số 15**, không phải khách 1 cùng tên. In kèm `customer_id` để không nhầm.
</details>

**Câu 6 (Ngày 22).** Liệt kê các sản phẩm có RAM từ 16 GB trở lên (thông tin nằm trong cột JSONB `attributes`), kèm tên CPU.

<details>
<summary>Đáp án</summary>

```sql
SELECT sku,
       name,
       attributes ->> 'cpu' AS cpu,
       (attributes ->> 'ram_gb')::int AS ram_gb
FROM products
WHERE (attributes ->> 'ram_gb')::int >= 16
ORDER BY price DESC;
```

Kết quả:

| sku | name | cpu | ram_gb |
| --- | --- | --- | --- |
| LAP-001 | ASUS ROG Strix G16 | Intel Core i7-13650HX | 16 |
| LAP-002 | Lenovo Legion 5 | AMD Ryzen 7 7840HS | 16 |
| LAP-006 | HP Pavilion 15 | AMD Ryzen 5 7530U | 16 |

`->>` lấy giá trị dạng text, nên phải ép sang `int` trước khi so sánh số. Sản phẩm không có khóa `ram_gb` (hoặc `attributes` là NULL) cho ra NULL và tự bị loại.
</details>

**Câu 7 (Ngày 19).** Tạo view `v_doanh_thu_thang` cho biết số đơn và doanh thu mỗi tháng (chỉ đơn đã thanh toán), rồi dùng view để xem các tháng từ 07/2026.

<details>
<summary>Đáp án</summary>

```sql
CREATE OR REPLACE VIEW v_doanh_thu_thang AS
SELECT DATE_TRUNC('month', o.order_date)::date AS thang,
       COUNT(DISTINCT o.order_id) AS so_don,
       ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))) AS doanh_thu
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status NOT IN ('pending', 'cancelled')
GROUP BY DATE_TRUNC('month', o.order_date);

SELECT to_char(thang, 'YYYY-MM') AS thang, so_don, doanh_thu
FROM v_doanh_thu_thang
WHERE thang >= '2026-07-01'
ORDER BY thang;
```

Kết quả:

| thang | so_don | doanh_thu |
| --- | --- | --- |
| 2026-07 | 1 | 17091000 |
| 2026-08 | 1 | 29990000 |
| 2026-09 | 2 | 17630000 |
| 2026-10 | 1 | 39980000 |

`COUNT(DISTINCT o.order_id)` vì sau JOIN với `order_items`, một đơn nhiều dòng hàng sẽ xuất hiện nhiều lần (bẫy nhân dòng ở Ngày 10). Dọn view:

```sql
DROP VIEW v_doanh_thu_thang;
```
</details>

### Thử thách

**Câu 8 (Ngày 6, 16).** Bán 2 chuột Logitech G102 (`ACC-001`) cho khách 16 tại cửa hàng, nhân viên 4 bán. Việc này gồm ba bước: tạo đơn, thêm dòng hàng, trừ tồn kho. Viết sao cho ba bước thành công cùng nhau hoặc không bước nào có hiệu lực. Để không làm thay đổi dữ liệu mẫu, kết thúc bằng `ROLLBACK` thay cho `COMMIT`.

<details>
<summary>Đáp án</summary>

```sql
BEGIN;

INSERT INTO orders (customer_id, employee_id, order_date, status, channel)
VALUES (16, 4, now(), 'paid', 'offline')
RETURNING order_id;

INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT currval(pg_get_serial_sequence('orders', 'order_id')), product_id, 2, price
FROM products
WHERE sku = 'ACC-001';

UPDATE products
SET stock_quantity = stock_quantity - 2
WHERE sku = 'ACC-001'
RETURNING sku, stock_quantity;

ROLLBACK;

SELECT sku, stock_quantity FROM products WHERE sku = 'ACC-001';
```

Kết quả lần lượt (trên dữ liệu vừa nạp lại):

| order_id |
| --- |
| 41 |

| sku | stock_quantity |
| --- | --- |
| ACC-001 | 58 |

Sau `ROLLBACK`:

| sku | stock_quantity |
| --- | --- |
| ACC-001 | 60 |

Những điểm cần thấy:

- `currval(pg_get_serial_sequence('orders', 'order_id'))` lấy id vừa sinh trong **chính phiên này**, nên an toàn khi nhiều người cùng đặt hàng. Trong code ứng dụng, bạn đọc giá trị trả về từ `RETURNING order_id` rồi truyền vào câu sau.
- `unit_price` lấy từ `price` hiện tại, đúng quy ước "giá lúc mua" của DSC Shop.
- Chạy lại lần nữa bạn sẽ thấy `order_id` là 42, 43... Sequence **không** quay lui khi `ROLLBACK`, nên id có thể bị "nhảy số". Đó là hành vi bình thường, đừng dựa vào id liên tục.
- Trong thực tế, bước trừ kho nên kiểm tra đủ hàng (`CHECK (stock_quantity >= 0)` của bảng sẽ chặn số âm) và khi nhiều người mua cùng lúc thì cần khóa dòng `SELECT ... FOR UPDATE` (Ngày 16).
</details>

**Câu 9 (Ngày 20, 28).** Một đồng đội viết truy vấn đếm đơn năm 2025 như sau và than "chạy chậm khi bảng có hàng triệu dòng, dù đã có index trên `order_date`". Vì sao? Viết lại cho tốt hơn, và nêu quy trình chung để tối ưu một truy vấn chậm.

```sql
SELECT COUNT(*) AS so_don_2025
FROM orders
WHERE EXTRACT(YEAR FROM order_date) = 2025;
```

<details>
<summary>Đáp án</summary>

Bọc hàm `EXTRACT(...)` quanh cột khiến điều kiện không còn "sargable": index B-tree sắp xếp theo `order_date`, không theo `EXTRACT(YEAR FROM order_date)`, nên planner không dùng index để tìm đúng khoảng mà phải đọc toàn bảng. Viết lại thành một khoảng trên chính cột đó:

```sql
SELECT COUNT(*) AS so_don_2025
FROM orders
WHERE order_date >= '2025-01-01'
  AND order_date <  '2026-01-01';
```

Kết quả (cả hai cách đều cho cùng số trên DSC Shop):

| so_don_2025 |
| --- |
| 25 |

Dùng `< '2026-01-01'` thay cho `<= '2025-12-31'` vì `order_date` là `TIMESTAMPTZ`: đơn lúc 15 giờ ngày 31/12 lớn hơn `'2025-12-31 00:00'` và sẽ bị bỏ sót.

Quy trình chung (Ngày 15, 20, 28):

1. Đo trước: `EXPLAIN (ANALYZE, BUFFERS)` để thấy thời gian thật, kiểu scan, số dòng ước lượng so với thực tế.
2. Tìm nguyên nhân: Seq Scan trên bảng lớn với điều kiện chọn lọc cao, ước lượng lệch xa thực tế (chạy `ANALYZE`), Sort hoặc Hash tràn ra đĩa, vòng Nested Loop quá nhiều lần.
3. Sửa đúng chỗ: viết điều kiện sargable, thêm index phù hợp (cột lọc, khóa ngoại, index nhiều cột theo thứ tự tiền tố trái), chỉ lấy cột cần thiết thay cho `SELECT *`, thay `OFFSET` lớn bằng phân trang keyset, gom N+1 truy vấn thành một.
4. Đo lại với cùng dữ liệu và ghi số trước/sau. Không đo thì không biết mình đã tối ưu hay chưa.
</details>

**Câu 10 (Ngày 23, 30).** Bạn sẽ ngăn SQL injection thế nào trong một API đăng nhập? Viết đoạn code Python minh họa cách đúng, và nói rõ mật khẩu được lưu và kiểm tra ra sao.

<details>
<summary>Đáp án</summary>

Hai nguyên tắc:

1. **Không bao giờ ghép chuỗi** dữ liệu người dùng vào câu SQL. Luôn dùng truy vấn tham số hóa: câu SQL và dữ liệu được gửi tách nhau, nên dữ liệu không bao giờ bị hiểu thành lệnh SQL.
2. **Không lưu mật khẩu dạng rõ** và không kiểm tra đăng nhập kiểu `WHERE username = ? AND password = ?` với mật khẩu dạng rõ. Lưu chuỗi hash có salt (bcrypt, argon2). Cách ưu tiên: lấy hash ra theo username rồi so sánh ở tầng ứng dụng. So bằng `crypt()` của pgcrypto ngay trong SQL cũng đúng (Ngày 30, Cách 2), nhưng mật khẩu dạng rõ phải đi qua câu SQL gửi tới server.

```python
import bcrypt
import psycopg

def dang_nhap(conn: psycopg.Connection, username: str, password: str) -> bool:
    # %s là tham số: psycopg gửi username tách khỏi câu SQL
    row = conn.execute(
        "SELECT password_hash FROM app_users WHERE username = %s",
        (username,),
    ).fetchone()
    if row is None:
        return False
    return bcrypt.checkpw(password.encode("utf-8"), row[0].encode("utf-8"))
```

Cách sai cần tránh: `f"SELECT ... WHERE username = '{username}'"`. Chỉ cần nhập `' OR '1'='1' --` là câu SQL bị đổi nghĩa. Ngoài ra, user mà ứng dụng dùng để kết nối database chỉ nên có đúng quyền nó cần (`GRANT SELECT, INSERT ...` trên các bảng cần thiết), không dùng `postgres` (Ngày 30).
</details>

---
