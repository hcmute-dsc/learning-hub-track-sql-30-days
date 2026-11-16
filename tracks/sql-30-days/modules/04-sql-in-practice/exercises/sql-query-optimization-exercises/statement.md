> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Bài trên schema `perf` bắt đầu từ trạng thái chỉ có khóa chính, với `SET max_parallel_workers_per_gather = 0;`. Thời gian trên máy bạn sẽ khác.

### Cơ bản

**Bài 1.** Ứng dụng lọc đơn theo ngày bằng câu dưới đây. Tạo index trên `order_date`, chứng minh câu này không dùng được index, rồi viết lại cho sargable và đo lại.

```sql
SELECT order_id, total_amount FROM perf.orders
WHERE to_char(order_date, 'YYYY-MM-DD') = '2026-10-01';
```

<details>
<summary>Đáp án</summary>

```sql
CREATE INDEX idx_orders_order_date ON perf.orders (order_date);

EXPLAIN ANALYZE
SELECT order_id, total_amount FROM perf.orders
WHERE to_char(order_date, 'YYYY-MM-DD') = '2026-10-01';

EXPLAIN ANALYZE
SELECT order_id, total_amount FROM perf.orders
WHERE order_date >= '2026-10-01' AND order_date < '2026-10-02';

SELECT COUNT(*) FROM perf.orders
WHERE order_date >= '2026-10-01' AND order_date < '2026-10-02';

DROP INDEX perf.idx_orders_order_date;
```

Kết quả (máy tác giả):

| Cách viết | Plan | Execution Time |
| --- | --- | --- |
| `to_char(...) = '2026-10-01'` | `Seq Scan on orders`, `Rows Removed by Filter: 999271` | 315.470 ms |
| `>= '2026-10-01' AND < '2026-10-02'` | `Bitmap Index Scan on idx_orders_order_date` → `Bitmap Heap Scan` | 1.293 ms |

| count |
| --- |
| 729 |

</details>

**Bài 2.** Câu sau định đếm số đơn `pending` của cửa hàng nhưng trả về 18. Tìm lỗi và sửa.

```sql
SELECT COUNT(*) FROM customers c, orders o WHERE o.status = 'pending';
```

<details>
<summary>Đáp án</summary>

Câu thiếu điều kiện nối `c.customer_id = o.customer_id`, nên mỗi đơn `pending` được ghép với cả 18 khách (tích Descartes). Ở đây không cần bảng `customers` chút nào:

```sql
SELECT COUNT(*) FROM orders o WHERE o.status = 'pending';
```

Kết quả:

| count |
| --- |
| 1 |

Nếu cần thông tin khách, viết `JOIN customers c ON c.customer_id = o.customer_id` để điều kiện nối không thể bị quên.

</details>

### Vận dụng

**Bài 3.** Trên DSC Shop, tìm sản phẩm bán chạy nhất (theo tổng số lượng, không tính đơn `cancelled`) **của từng danh mục**. Nếu nhiều sản phẩm đồng hạng thì lấy hết. Không dùng window function (sẽ học ở Ngày 29).

<details>
<summary>Đáp án</summary>

```sql
WITH ban AS (
    SELECT p.category_id, p.product_id, p.name, SUM(oi.quantity) AS so_luong
    FROM order_items oi
    JOIN orders o   ON o.order_id = oi.order_id
    JOIN products p ON p.product_id = oi.product_id
    WHERE o.status <> 'cancelled'
    GROUP BY p.category_id, p.product_id, p.name
)
SELECT cat.name AS danh_muc, b.name AS san_pham, b.so_luong
FROM ban b
JOIN categories cat ON cat.category_id = b.category_id
WHERE b.so_luong = (SELECT MAX(b2.so_luong) FROM ban b2 WHERE b2.category_id = b.category_id)
ORDER BY danh_muc, san_pham;
```

Kết quả:

| danh_muc | san_pham | so_luong |
| --- | --- | --- |
| Chuột & Bàn phím | Chuột Logitech G102 | 6 |
| Điện thoại | Xiaomi Redmi Note 13 | 5 |
| Laptop gaming | Acer Nitro V 15 | 2 |
| Laptop gaming | Lenovo Legion 5 | 2 |
| Laptop văn phòng | Dell Inspiron 14 | 2 |
| Laptop văn phòng | MacBook Air M2 13 inch | 2 |
| Máy tính bảng | iPad Air M2 11 inch | 2 |
| Máy tính bảng | Samsung Galaxy Tab S9 FE | 2 |
| PC & Màn hình | Màn hình Dell P2422H | 3 |
| PC & Màn hình | Màn hình LG UltraGear 27 inch | 3 |
| Sạc & Cáp | Cáp USB-C to USB-C 1m | 13 |
| Tai nghe & Loa | Tai nghe AirPods Pro 2 | 3 |
| Tai nghe & Loa | Tai nghe Sony WH-1000XM5 | 3 |

Lỗi hay gặp là viết `GROUP BY danh_muc, san_pham ORDER BY so_luong DESC LIMIT 10`: đó là 10 cặp bán chạy nhất **toàn cửa hàng**, không phải sản phẩm đứng đầu **mỗi** danh mục. CTE `ban` được tính một lần, subquery tương quan chỉ chạy trên kết quả nhỏ đã tổng hợp. Ngày 29 sẽ viết gọn hơn bằng `RANK() OVER (PARTITION BY category_id ...)`. Trên dữ liệu lớn, index giúp nhất cho truy vấn này là index trên cột nối `order_items(product_id)` (DSC Shop đã có); partition theo danh mục thì không giúp, vì truy vấn cần mọi danh mục.

</details>

**Bài 4.** Tìm các sản phẩm chưa từng được bán (không có trong `order_items`) bằng `NOT EXISTS` và bằng `NOT IN`. Hai câu có cho cùng kết quả không? Vì sao vẫn nên chọn `NOT EXISTS`?

<details>
<summary>Đáp án</summary>

```sql
SELECT p.sku, p.name
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.product_id);

SELECT p.sku, p.name
FROM products p
WHERE p.product_id NOT IN (SELECT oi.product_id FROM order_items oi);
```

Kết quả (cả hai câu):

| sku | name |
| --- | --- |
| ACC-009 | Lót chuột DSC XXL |

Ở đây hai câu trùng kết quả vì `order_items.product_id` là `NOT NULL`. Nhưng nếu cột trong subquery có thể `NULL` (hoặc sau này bị đổi thành cho phép `NULL`), `NOT IN` sẽ âm thầm trả về rỗng. Thêm nữa, trên bảng lớn `NOT IN` không được chuyển thành Anti Join và có thể chậm khủng khiếp (ví dụ trên `perf` phải hủy sau 30 giây). `NOT EXISTS` đúng trong mọi trường hợp và có plan tốt.

</details>

**Bài 5.** Trang danh sách sản phẩm của DSC Shop sắp theo giá giảm dần, mỗi trang 5 sản phẩm. Trang 1 kết thúc ở `iPhone 15 128GB` (`product_id` 10, giá 19.990.000). Viết câu lấy trang 2 bằng keyset. Chú ý chọn thứ tự sắp xếp sao cho dùng được so sánh hàng.

<details>
<summary>Đáp án</summary>

So sánh hàng `(price, product_id) < (...)` chỉ đúng khi cả hai cột cùng chiều, nên sắp `price DESC, product_id DESC` (cột `product_id` để phá hòa khi hai sản phẩm cùng giá).

```sql
-- Trang 1
SELECT product_id, name, price FROM products
ORDER BY price DESC, product_id DESC
LIMIT 5;

-- Trang 2: bắt đầu sau (19990000, 10)
SELECT product_id, name, price FROM products
WHERE (price, product_id) < (19990000, 10)
ORDER BY price DESC, product_id DESC
LIMIT 5;
```

Kết quả trang 1:

| product_id | name | price |
| --- | --- | --- |
| 1 | ASUS ROG Strix G16 | 32990000 |
| 2 | Lenovo Legion 5 | 29990000 |
| 5 | MacBook Air M2 13 inch | 24990000 |
| 3 | Acer Nitro V 15 | 21990000 |
| 10 | iPhone 15 128GB | 19990000 |

Kết quả trang 2:

| product_id | name | price |
| --- | --- | --- |
| 11 | Samsung Galaxy S24 | 18990000 |
| 4 | Dell Inspiron 14 | 18490000 |
| 14 | iPad Air M2 11 inch | 16990000 |
| 6 | HP Pavilion 15 | 16990000 |
| 9 | PC văn phòng DSC Basic | 9990000 |

Trang 2 trùng với `LIMIT 5 OFFSET 5` cùng thứ tự sắp xếp. Để ý `iPad Air` và `HP Pavilion` cùng giá 16.990.000: nhờ `product_id DESC` mà thứ tự giữa chúng luôn cố định, nên không dòng nào bị lặp hay bị bỏ khi chuyển trang.

</details>

### Thử thách

**Bài 6.** Báo cáo "doanh thu từng tháng của các đơn đã giao" trên `perf.orders` được mở rất nhiều lần mỗi ngày. Đo truy vấn gốc, rồi tạo materialized view `perf.mv_doanh_thu_thang`, đo việc đọc 4 tháng gần nhất từ view và thời gian `REFRESH`. Khi nào cách này không phù hợp?

<details>
<summary>Đáp án</summary>

```sql
EXPLAIN ANALYZE
SELECT date_trunc('month', order_date) AS thang, SUM(total_amount) AS doanh_thu
FROM perf.orders
WHERE status = 'delivered'
GROUP BY 1;

DROP MATERIALIZED VIEW IF EXISTS perf.mv_doanh_thu_thang;
CREATE MATERIALIZED VIEW perf.mv_doanh_thu_thang AS
SELECT date_trunc('month', order_date) AS thang, SUM(total_amount) AS doanh_thu
FROM perf.orders
WHERE status = 'delivered'
GROUP BY 1;

EXPLAIN ANALYZE
SELECT thang, doanh_thu FROM perf.mv_doanh_thu_thang
WHERE thang >= '2026-07-01'
ORDER BY thang;

SELECT thang, doanh_thu FROM perf.mv_doanh_thu_thang
WHERE thang >= '2026-07-01'
ORDER BY thang;

\timing on
REFRESH MATERIALIZED VIEW perf.mv_doanh_thu_thang;
\timing off

DROP MATERIALIZED VIEW perf.mv_doanh_thu_thang;
```

Kết quả (máy tác giả):

| Thao tác | Thời gian |
| --- | --- |
| Truy vấn gốc (`Seq Scan` 1 triệu đơn → `HashAggregate` 46 tháng) | 472.342 ms |
| Đọc 4 tháng từ materialized view (`Seq Scan on mv_doanh_thu_thang`, 46 dòng) | 0.045 ms |
| `REFRESH MATERIALIZED VIEW` | 332 ms |

| thang | doanh_thu |
| --- | --- |
| 2026-07-01 00:00:00+07 | 289058531000 |
| 2026-08-01 00:00:00+07 | 284913926000 |
| 2026-09-01 00:00:00+07 | 276530348000 |
| 2026-10-01 00:00:00+07 | 101061785000 |

Mỗi lần mở báo cáo chỉ còn đọc 46 dòng. Cái giá là `REFRESH` tốn ngang truy vấn gốc và số liệu chỉ mới tới lần làm mới gần nhất. Không phù hợp khi báo cáo cần số liệu tức thời (ví dụ doanh thu hôm nay theo từng phút), hoặc khi dữ liệu nguồn thay đổi liên tục mà báo cáo hiếm khi được mở. (Index không giúp nhiều ở đây: truy vấn cần 85% số đơn.)

</details>

**Bài 7.** Câu sau đếm số đơn của mỗi khách DSC Shop bằng subquery tương quan. Viết lại bằng `LEFT JOIN` + `GROUP BY`, cho kết quả giống hệt (kể cả khách chưa có đơn). Vì sao viết `COUNT(*)` thay cho `COUNT(o.order_id)` lại sai?

```sql
SELECT c.customer_id, c.full_name,
       (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id) AS so_don
FROM customers c
ORDER BY c.customer_id;
```

<details>
<summary>Đáp án</summary>

```sql
SELECT c.customer_id, c.full_name, COUNT(o.order_id) AS so_don
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.full_name
ORDER BY c.customer_id;
```

Kết quả (giống câu gốc):

| customer_id | full_name | so_don |
| --- | --- | --- |
| 1 | Nguyễn Văn An | 5 |
| 2 | Trần Thị Bình | 4 |
| 3 | Lê Hoàng Cường | 3 |
| ... | ... | ... |
| 15 | Nguyễn Văn An | 2 |
| 16 | Tạ Quang Sơn | 0 |
| 17 | Châu Ngọc Trâm | 0 |
| 18 | Mai Đức Uy | 2 |

(... tổng 18 dòng)

Với `LEFT JOIN`, khách chưa có đơn vẫn có **một** dòng, các cột của `orders` là `NULL`. `COUNT(*)` đếm dòng nên cho 1; `COUNT(o.order_id)` bỏ qua `NULL` nên cho 0 (Ngày 8). Kiểm chứng với khách 15, 16, 17:

```sql
SELECT c.customer_id, c.full_name, COUNT(*) AS so_don
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE c.customer_id IN (15, 16, 17)
GROUP BY c.customer_id, c.full_name
ORDER BY c.customer_id;
```

| customer_id | full_name | so_don |
| --- | --- | --- |
| 15 | Nguyễn Văn An | 2 |
| 16 | Tạ Quang Sơn | 1 |
| 17 | Châu Ngọc Trâm | 1 |

Khách 16 và 17 bị đếm sai thành 1 đơn. Lưu ý `GROUP BY c.customer_id, c.full_name`: không gom theo tên, vì hai khách 1 và 15 cùng tên `Nguyễn Văn An`.

</details>
