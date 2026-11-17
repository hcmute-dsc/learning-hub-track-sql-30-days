> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Các bài tập dùng `order_totals` và `customer_spending` bản ở đầu bài. Nếu cần làm lại từ đầu, chạy lại script init (xem mục "Làm lại từ đầu" trong [setup/README.md](../../../../setup/README.md)) rồi tạo lại hai view đó.

### Cơ bản

**Bài 1.** Tạo view `product_catalog` gồm `sku`, tên sản phẩm (`product_name`), tên danh mục (`category_name`), `price`, `stock_quantity`, chỉ lấy sản phẩm đang kinh doanh và còn hàng. Dùng view để liệt kê điện thoại (danh mục `Điện thoại`), giá giảm dần.

<details>
<summary>Đáp án</summary>

```sql
CREATE VIEW product_catalog AS
SELECT
    p.sku,
    p.name AS product_name,
    c.name AS category_name,
    p.price,
    p.stock_quantity
FROM products AS p
JOIN categories AS c ON c.category_id = p.category_id
WHERE p.is_active
  AND p.stock_quantity > 0;

SELECT sku, product_name, price, stock_quantity
FROM product_catalog
WHERE category_name = 'Điện thoại'
ORDER BY price DESC;
```

Kết quả:

| sku | product_name | price | stock_quantity |
| --- | --- | --- | --- |
| PHN-001 | iPhone 15 128GB | 19990000 | 15 |
| PHN-002 | Samsung Galaxy S24 | 18990000 | 9 |
| PHN-003 | Xiaomi Redmi Note 13 | 4890000 | 25 |

Nokia 105 4G không xuất hiện vì vừa ngừng kinh doanh vừa hết hàng.
</details>

**Bài 2.** Tạo view `employee_sales` cho biết mỗi nhân viên đã bán bao nhiêu đơn offline (không tính đơn `pending` và `cancelled`) và tổng doanh thu, giữ cả nhân viên chưa bán đơn nào (doanh thu 0). Sắp xếp theo doanh thu giảm dần.

<details>
<summary>Đáp án</summary>

```sql
CREATE VIEW employee_sales AS
SELECT
    e.employee_id,
    e.full_name,
    COUNT(t.order_id)                AS order_count,
    COALESCE(SUM(t.total_amount), 0) AS revenue
FROM employees AS e
LEFT JOIN orders AS o
       ON o.employee_id = e.employee_id
      AND o.channel = 'offline'
LEFT JOIN order_totals AS t
       ON t.order_id = o.order_id
      AND t.status NOT IN ('pending', 'cancelled')
GROUP BY e.employee_id, e.full_name;

SELECT * FROM employee_sales ORDER BY revenue DESC;
```

Kết quả:

| employee_id | full_name | order_count | revenue |
| --- | --- | --- | --- |
| 6 | Vũ Hoài Nam | 4 | 82907500 |
| 4 | Phạm Thị Thu | 5 | 63700000 |
| 5 | Đỗ Minh Tuấn | 5 | 63401000 |
| 8 | Kiều Anh Thư | 1 | 1640000 |
| 2 | Lê Thị Hạnh | 0 | 0 |
| 3 | Trần Quốc Bảo | 0 | 0 |
| 7 | Lâm Gia Huy | 0 | 0 |
| 1 | Nguyễn Thành Long | 0 | 0 |

Cả hai lần JOIN đều phải là `LEFT JOIN`; chỉ cần một `JOIN` thường là bốn nhân viên chưa bán hàng biến mất. Điều kiện `o.channel = 'offline'` đặt ở `ON` (không ở `WHERE`) để vẫn giữ nhân viên không có đơn offline. Trong dữ liệu mẫu chỉ đơn offline mới có `employee_id`, nên bỏ điều kiện này kết quả cũng không đổi, nhưng viết rõ ra thì view vẫn đúng khi dữ liệu thay đổi.
</details>

**Bài 3.** Thêm cột `channel` vào view `order_totals` mà không làm lỗi và không phải xóa `customer_spending`. Sau đó dùng view tính số đơn và doanh thu (không tính đơn `pending` và `cancelled`) theo kênh bán.

<details>
<summary>Đáp án</summary>

Thêm `channel` ở **cuối** danh sách cột:

```sql
CREATE OR REPLACE VIEW order_totals AS
SELECT
    o.order_id,
    o.customer_id,
    o.order_date,
    o.status,
    ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))) AS total_amount,
    o.channel
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.order_id
GROUP BY o.order_id, o.customer_id, o.order_date, o.status, o.channel;

SELECT channel, COUNT(*) AS order_count, SUM(total_amount) AS revenue
FROM order_totals
WHERE status NOT IN ('pending', 'cancelled')
GROUP BY channel;
```

Kết quả:

| channel | order_count | revenue |
| --- | --- | --- |
| online | 21 | 324642500 |
| offline | 15 | 211648500 |

`customer_spending` vẫn chạy bình thường vì các cột nó dùng không đổi.
</details>

### Vận dụng

**Bài 4.** Tạo view `hcm_customers` gồm `customer_id`, `full_name`, `email`, `phone`, `city` của khách ở TP. Hồ Chí Minh (dữ liệu có ba cách viết: `TP. Hồ Chí Minh`, `Hồ Chí Minh`, `TP.HCM`). View phải chặn việc thêm qua nó một khách ở thành phố khác. Thử thêm khách `Lê Thị Hoa` ở `Hà Nội` rồi ở `TP. Hồ Chí Minh`.

<details>
<summary>Đáp án</summary>

```sql
CREATE VIEW hcm_customers AS
SELECT customer_id, full_name, email, phone, city
FROM customers
WHERE city IN ('TP. Hồ Chí Minh', 'Hồ Chí Minh', 'TP.HCM')
WITH CHECK OPTION;

SELECT customer_id, full_name, city FROM hcm_customers ORDER BY customer_id;
```

| customer_id | full_name | city |
| --- | --- | --- |
| 1 | Nguyễn Văn An | TP. Hồ Chí Minh |
| 4 | Phạm Minh Duy | TP. Hồ Chí Minh |
| 6 | Võ Quốc Phong | Hồ Chí Minh |
| 10 | Dương Minh Khoa | TP. Hồ Chí Minh |
| 14 | Huỳnh Tấn Phát | TP.HCM |

```sql
INSERT INTO hcm_customers (full_name, email, city)
VALUES ('Lê Thị Hoa', 'hoa.le@gmail.com', 'Hà Nội');
```

```text
ERROR:  new row violates check option for view "hcm_customers"
```

```sql
BEGIN;

INSERT INTO hcm_customers (full_name, email, city)
VALUES ('Lê Thị Hoa', 'hoa.le@gmail.com', 'TP. Hồ Chí Minh')
RETURNING customer_id, full_name, city;

ROLLBACK;
```

Lệnh thứ hai thành công (trả về một dòng với `city = 'TP. Hồ Chí Minh'`); `ROLLBACK` hủy nó để giữ dữ liệu gốc.
</details>

**Bài 5.** Dựa trên `customer_spending`, tạo view `vip_customers` gồm khách có tổng chi tiêu từ 50 triệu trở lên. Liệt kê theo chi tiêu giảm dần.

<details>
<summary>Đáp án</summary>

```sql
CREATE VIEW vip_customers AS
SELECT *
FROM customer_spending
WHERE total_spent >= 50000000;

SELECT * FROM vip_customers ORDER BY total_spent DESC;
```

Kết quả:

| customer_id | full_name | order_count | total_spent |
| --- | --- | --- | --- |
| 10 | Dương Minh Khoa | 2 | 63220500 |
| 15 | Nguyễn Văn An | 2 | 58970000 |
| 2 | Trần Thị Bình | 4 | 58262500 |

Lưu ý: `SELECT *` ở đây được PostgreSQL thay bằng 4 cột của `customer_spending` lúc tạo view (lỗi thường gặp số 3).
</details>

**Bài 6.** Không cần thử từng lệnh `UPDATE`, hãy liệt kê mọi view trong schema `shop` và cho biết view nào cập nhật được, view nào `INSERT` được. Giải thích vì sao `customer_directory` cập nhật được dù có cột tính toán.

<details>
<summary>Đáp án</summary>

```sql
SELECT table_name, is_updatable, is_insertable_into
FROM information_schema.views
WHERE table_schema = 'shop'
ORDER BY table_name;
```

Kết quả (nếu bạn đã tạo đủ các view trong bài):

| table_name | is_updatable | is_insertable_into |
| --- | --- | --- |
| active_products | YES | YES |
| cheap_products | YES | YES |
| customer_directory | YES | YES |
| customer_spending | NO | NO |
| employee_sales | NO | NO |
| hcm_customers | YES | YES |
| order_totals | NO | NO |
| product_catalog | NO | NO |
| vip_customers | NO | NO |

`customer_directory` chỉ đọc từ một bảng, không JOIN, không GROUP BY, nên mỗi dòng view ứng với đúng một dòng `customers`. Bạn sửa được `full_name`, `city` qua view; chỉ riêng `email_hint` và `birth_year` là cột tính toán nên không ghi vào được. `product_catalog` không cập nhật được vì có JOIN, các view còn lại vì có GROUP BY (hoặc dựng trên view có GROUP BY).
</details>

### Thử thách

**Bài 7.** Tạo materialized view `product_sales` gồm `product_id`, `sku`, `name`, `units_sold`, `revenue` cho **mọi** sản phẩm (sản phẩm chưa bán có 0), chỉ tính đơn đã thanh toán (không tính `pending` và `cancelled`). Tạo index để làm mới được bằng `CONCURRENTLY`. In top 5 theo doanh thu. Sau đó, trong một transaction, thêm 2 cái `Lót chuột DSC XXL` (product_id 24, giá 250.000) vào đơn 38 (đơn đã thanh toán), cho thấy materialized view chỉ cập nhật sau khi `REFRESH`, rồi `ROLLBACK`.

<details>
<summary>Đáp án</summary>

Lọc trạng thái đơn trong subquery trước, rồi mới `LEFT JOIN` vào `products`. Nếu `LEFT JOIN` thẳng `order_items` và `orders` rồi lọc `status` ở `WHERE`, sản phẩm chưa bán (có `status` NULL) sẽ bị loại.

```sql
CREATE MATERIALIZED VIEW product_sales AS
SELECT
    p.product_id,
    p.sku,
    p.name,
    COALESCE(s.units_sold, 0) AS units_sold,
    COALESCE(s.revenue, 0)    AS revenue
FROM products AS p
LEFT JOIN (
    SELECT
        oi.product_id,
        SUM(oi.quantity) AS units_sold,
        ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))) AS revenue
    FROM order_items AS oi
    JOIN orders AS o ON o.order_id = oi.order_id
    WHERE o.status NOT IN ('pending', 'cancelled')
    GROUP BY oi.product_id
) AS s ON s.product_id = p.product_id;

CREATE UNIQUE INDEX ON product_sales (product_id);

SELECT sku, name, units_sold, revenue
FROM product_sales
ORDER BY revenue DESC
LIMIT 5;
```

| sku | name | units_sold | revenue |
| --- | --- | --- | --- |
| PHN-001 | iPhone 15 128GB | 4 | 78960500 |
| LAP-002 | Lenovo Legion 5 | 2 | 59980000 |
| LAP-005 | MacBook Air M2 13 inch | 2 | 50730500 |
| LAP-003 | Acer Nitro V 15 | 2 | 43830500 |
| LAP-004 | Dell Inspiron 14 | 2 | 36980000 |

```sql
BEGIN;

INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES (38, 24, 2, 250000);

SELECT sku, units_sold, revenue FROM product_sales WHERE sku = 'ACC-009';

REFRESH MATERIALIZED VIEW CONCURRENTLY product_sales;

SELECT sku, units_sold, revenue FROM product_sales WHERE sku = 'ACC-009';

ROLLBACK;
```

Trước `REFRESH`:

| sku | units_sold | revenue |
| --- | --- | --- |
| ACC-009 | 0 | 0 |

Sau `REFRESH`:

| sku | units_sold | revenue |
| --- | --- | --- |
| ACC-009 | 2 | 500000 |
</details>

**Bài 8.** Trên schema `perf`, tạo view `perf.city_revenue_v` tính số đơn và doanh thu (không tính đơn `pending` và `cancelled`) theo thành phố của khách (JOIN `perf.orders` với `perf.customers`), và materialized view `perf.city_revenue_mv` từ view đó. Dùng `\timing` so sánh thời gian lấy top 3 thành phố qua hai cách và thời gian `REFRESH`. Xong thì xóa cả hai.

<details>
<summary>Đáp án</summary>

```sql
CREATE VIEW perf.city_revenue_v AS
SELECT
    c.city,
    COUNT(*)            AS order_count,
    SUM(o.total_amount) AS revenue
FROM perf.orders AS o
JOIN perf.customers AS c ON c.customer_id = o.customer_id
WHERE o.status NOT IN ('pending', 'cancelled')
GROUP BY c.city;

CREATE MATERIALIZED VIEW perf.city_revenue_mv AS
SELECT * FROM perf.city_revenue_v;

\timing on
SELECT * FROM perf.city_revenue_v  ORDER BY revenue DESC LIMIT 3;
SELECT * FROM perf.city_revenue_mv ORDER BY revenue DESC LIMIT 3;
REFRESH MATERIALIZED VIEW perf.city_revenue_mv;
\timing off

DROP MATERIALIZED VIEW perf.city_revenue_mv;
DROP VIEW perf.city_revenue_v;
```

Hai truy vấn trả cùng kết quả:

| city | order_count | revenue |
| --- | --- | --- |
| Quy Nhơn | 92899 | 1399739509000 |
| Vũng Tàu | 91947 | 1390873509000 |
| Nha Trang | 91954 | 1387547305000 |

Thời gian trên máy mình: qua view khoảng 180-215 ms, qua materialized view khoảng 0,2-0,5 ms, `REFRESH` khoảng 210 ms. Máy bạn sẽ ra số khác. Kết luận: nếu báo cáo này được mở hàng nghìn lần mỗi ngày và chấp nhận số liệu trễ vài phút, materialized view làm mới định kỳ tiết kiệm rất nhiều; nếu cần số liệu tức thời, dùng view thường (và tối ưu truy vấn bên dưới).
</details>
