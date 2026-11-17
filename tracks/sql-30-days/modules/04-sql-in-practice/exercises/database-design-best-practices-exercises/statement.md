> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Các đáp án tạo bảng trong schema `bai_tap`, mỗi đáp án tự tạo lại schema nên chạy độc lập được.

### Cơ bản

**Bài 1.** Với mỗi cặp bảng trong DSC Shop, cho biết loại quan hệ (1-1, 1-n, n-n, tự tham chiếu) và khóa ngoại nằm ở đâu: (a) `customers` và `orders`; (b) `orders` và `products`; (c) `orders` và `payments`; (d) `employees` với chính nó; (e) `employees` và `orders`.

<details>
<summary>Đáp án</summary>

(a) 1-n, `orders.customer_id`. (b) n-n, qua bảng trung gian `order_items` (`order_id`, `product_id`). (c) 1-n, `payments.order_id` (một đơn có 0, 1 hoặc nhiều lần thanh toán). (d) tự tham chiếu 1-n, `employees.manager_id`. (e) `0..1`-n, `orders.employee_id` cho phép NULL vì đơn online không có nhân viên.
</details>

**Bài 2.** Liệu `customer_id → shipping_city` có đúng trong `orders` không? Viết truy vấn kiểm tra trên dữ liệu, rồi cho biết có nên chuyển `shipping_city` sang bảng `customers` không.

> Gợi ý: Đếm `count(DISTINCT shipping_city)` theo `customer_id` rồi `HAVING ... > 1`, như mục 4.2 của bài học.

<details>
<summary>Đáp án</summary>

```sql
SELECT customer_id, count(DISTINCT shipping_city) AS so_thanh_pho
FROM orders
GROUP BY customer_id
HAVING count(DISTINCT shipping_city) > 1;
```

Kết quả: 0 dòng. Dữ liệu hiện tại không bác bỏ phụ thuộc này, nhưng nó **không phải quy tắc nghiệp vụ**: khách hoàn toàn có thể đặt đơn giao về quê hoặc tới công ty. Dữ liệu chỉ bác bỏ được, không chứng minh được một phụ thuộc hàm. Vì vậy giữ `shipping_city` trong `orders`.
</details>

### Vận dụng

**Bài 3.** Bảng sau có những lỗi thiết kế nào? Viết lại bằng DDL PostgreSQL và thử một truy vấn liệt kê nhân viên, phòng ban, quản lý.

```text
employees(id, name, department, manager_name)
```

<details>
<summary>Đáp án</summary>

- `department` là chữ tự do: tên phòng lặp ở mọi nhân viên (dị thường cập nhật khi đổi tên phòng), không thêm được phòng chưa có người. Tách bảng `departments`.
- `manager_name` tham chiếu bằng tên: trùng tên thì mơ hồ, không có khóa ngoại kiểm tra. Đổi thành `manager_id` tự tham chiếu.

```sql
DROP SCHEMA IF EXISTS bai_tap CASCADE;
CREATE SCHEMA bai_tap;

CREATE TABLE bai_tap.departments (
    department_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE bai_tap.employees (
    employee_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    department_id INT NOT NULL REFERENCES bai_tap.departments (department_id),
    manager_id    INT REFERENCES bai_tap.employees (employee_id)
);
CREATE INDEX ON bai_tap.employees (department_id);
CREATE INDEX ON bai_tap.employees (manager_id);

INSERT INTO bai_tap.departments (name) VALUES ('Kinh doanh'), ('Kỹ thuật');
INSERT INTO bai_tap.employees (full_name, department_id, manager_id) VALUES
    ('Lê Thị Hạnh',   1, NULL),
    ('Phạm Thị Thu',  1, 1),
    ('Trần Quốc Bảo', 2, NULL),
    ('Lâm Gia Huy',   2, 3);

SELECT e.full_name, d.name AS phong_ban, m.full_name AS quan_ly
FROM bai_tap.employees AS e
JOIN bai_tap.departments AS d ON d.department_id = e.department_id
LEFT JOIN bai_tap.employees AS m ON m.employee_id = e.manager_id
ORDER BY e.employee_id;
```

Kết quả:

| full_name | phong_ban | quan_ly |
| --- | --- | --- |
| Lê Thị Hạnh | Kinh doanh | NULL |
| Phạm Thị Thu | Kinh doanh | Lê Thị Hạnh |
| Trần Quốc Bảo | Kỹ thuật | NULL |
| Lâm Gia Huy | Kỹ thuật | Trần Quốc Bảo |
</details>

**Bài 4.** Chuẩn hóa bảng sau về 3NF. Viết ra các phụ thuộc hàm, DDL đầy đủ có khóa ngoại, rồi chứng minh thiết kế giữ được giá lúc mua khi giá sản phẩm thay đổi.

```text
orders(order_id, order_date, customer_name, customer_phone, product_name, product_price, quantity)
-- một đơn có thể có nhiều sản phẩm, mỗi sản phẩm một dòng
```

> Gợi ý: Khóa của bảng gốc không còn là `order_id`. Liệt kê mỗi cột phụ thuộc vào cột nào trước khi tách bảng.

<details>
<summary>Đáp án</summary>

Một đơn nhiều dòng nên `order_id` không còn là khóa; khóa thật là `(order_id, product_name)`. Phụ thuộc hàm (giả sử thêm mã khách, mã sản phẩm làm khóa thay thế): `order_id → order_date, customer_id`; `customer_id → customer_name, customer_phone`; `product_id → product_name, price`; `(order_id, product_id) → quantity, unit_price`.

Bẫy hay gặp: `product_price` trong bảng gốc là giá lúc mua hay giá hiện tại? Phải có **cả hai**: `products.price` (giá hiện tại) và `order_items.unit_price` (giá lúc mua). Và đừng quên bảng `orders` nối khách với các dòng hàng.

```sql
DROP SCHEMA IF EXISTS bai_tap CASCADE;
CREATE SCHEMA bai_tap;

CREATE TABLE bai_tap.customers (
    customer_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name   VARCHAR(100) NOT NULL,
    phone       VARCHAR(20)
);

CREATE TABLE bai_tap.products (
    product_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(200)  NOT NULL,
    price      NUMERIC(12,0) NOT NULL CHECK (price >= 0)
);

CREATE TABLE bai_tap.orders (
    order_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id INT         NOT NULL REFERENCES bai_tap.customers (customer_id),
    order_date  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bai_tap.order_items (
    order_id   INT           NOT NULL REFERENCES bai_tap.orders (order_id),
    product_id INT           NOT NULL REFERENCES bai_tap.products (product_id),
    quantity   INT           NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,0) NOT NULL CHECK (unit_price >= 0),
    PRIMARY KEY (order_id, product_id)
);
CREATE INDEX ON bai_tap.orders (customer_id);
CREATE INDEX ON bai_tap.order_items (product_id);

INSERT INTO bai_tap.customers (full_name, phone) VALUES ('Trần Thị Bình', '0912345678');
INSERT INTO bai_tap.products (name, price) VALUES ('iPhone 15 128GB', 19990000), ('Cáp USB-C to USB-C 1m', 150000);
INSERT INTO bai_tap.orders (customer_id, order_date) VALUES (1, '2025-04-22 10:00');
INSERT INTO bai_tap.order_items (order_id, product_id, quantity, unit_price)
SELECT 1, product_id, 1, price FROM bai_tap.products;

-- iPhone giảm giá sau khi đơn đã đặt
UPDATE bai_tap.products SET price = 17990000 WHERE product_id = 1;

SELECT p.name, oi.quantity, oi.unit_price AS gia_luc_mua, p.price AS gia_hien_tai
FROM bai_tap.order_items AS oi
JOIN bai_tap.products AS p ON p.product_id = oi.product_id
WHERE oi.order_id = 1
ORDER BY p.product_id;
```

Kết quả:

| name | quantity | gia_luc_mua | gia_hien_tai |
| --- | --- | --- | --- |
| iPhone 15 128GB | 1 | 19990000 | 17990000 |
| Cáp USB-C to USB-C 1m | 1 | 150000 | 150000 |

Không có cột tổng tiền: đó là dữ liệu dẫn xuất. Nếu muốn lưu sẵn thì là phi chuẩn hóa có chủ đích (mục 6), phải đồng bộ bằng trigger hoặc transaction.
</details>

**Bài 5.** DSC Shop thêm hai tính năng: (a) mỗi khách có nhiều địa chỉ giao hàng, tối đa một địa chỉ mặc định; (b) khách đánh giá sản phẩm từ 1 tới 5 sao, mỗi khách chỉ một đánh giá cho mỗi sản phẩm. Thiết kế bảng (trỏ tới `shop.customers`, `shop.products`) sao cho cơ sở dữ liệu tự chặn dữ liệu sai, rồi thử chèn dữ liệu vi phạm.

> Gợi ý: "Tối đa một địa chỉ mặc định" là `UNIQUE` chỉ áp dụng cho các dòng `is_default`: nghĩ tới partial unique index (Ngày 15).

<details>
<summary>Đáp án</summary>

(a) là quan hệ 1-n; "tối đa một địa chỉ mặc định" dùng partial unique index (Ngày 15). (b) là quan hệ n-n giữa khách và sản phẩm, bảng trung gian `reviews` có khóa chính ghép, chính khóa này giữ quy tắc "một đánh giá mỗi sản phẩm".

```sql
DROP SCHEMA IF EXISTS bai_tap CASCADE;
CREATE SCHEMA bai_tap;

CREATE TABLE bai_tap.addresses (
    address_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id INT          NOT NULL REFERENCES shop.customers (customer_id) ON DELETE CASCADE,
    line        VARCHAR(200) NOT NULL,
    city        VARCHAR(100) NOT NULL,
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE
);
CREATE INDEX ON bai_tap.addresses (customer_id);
CREATE UNIQUE INDEX ON bai_tap.addresses (customer_id) WHERE is_default;

CREATE TABLE bai_tap.reviews (
    customer_id INT         NOT NULL REFERENCES shop.customers (customer_id),
    product_id  INT         NOT NULL REFERENCES shop.products (product_id),
    rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (customer_id, product_id)
);
CREATE INDEX ON bai_tap.reviews (product_id);

INSERT INTO bai_tap.addresses (customer_id, line, city, is_default) VALUES
    (2, '12 Láng Hạ',      'Hà Nội', TRUE),
    (2, '5 Trần Duy Hưng', 'Hà Nội', FALSE);

INSERT INTO bai_tap.reviews (customer_id, product_id, rating, content) VALUES
    (2, 23, 5, 'Cáp chắc chắn'),
    (1, 23, 4, NULL),
    (8, 12, 3, 'Tạm ổn');
```

Thử dữ liệu sai, từng lệnh một:

```sql
INSERT INTO bai_tap.addresses (customer_id, line, city, is_default)
VALUES (2, '1 Đại Cồ Việt', 'Hà Nội', TRUE);                               -- địa chỉ mặc định thứ hai
```

```text
ERROR:  duplicate key value violates unique constraint "addresses_customer_id_idx1"
DETAIL:  Key (customer_id)=(2) already exists.
```

```sql
INSERT INTO bai_tap.reviews (customer_id, product_id, rating) VALUES (2, 23, 1);   -- đánh giá lần hai
```

```text
ERROR:  duplicate key value violates unique constraint "reviews_pkey"
DETAIL:  Key (customer_id, product_id)=(2, 23) already exists.
```

```sql
INSERT INTO bai_tap.reviews (customer_id, product_id, rating) VALUES (3, 12, 6);   -- 6 sao
```

```text
ERROR:  new row for relation "reviews" violates check constraint "reviews_rating_check"
DETAIL:  Failing row contains (3, 12, 6, null, 2026-10-17 16:21:30.626+07).
```

(Thời điểm trong `DETAIL` sẽ khác trên máy bạn.) Điểm trung bình mỗi sản phẩm:

```sql
SELECT p.sku, p.name, count(*) AS so_danh_gia, round(avg(r.rating), 2) AS diem_tb
FROM bai_tap.reviews AS r
JOIN products AS p ON p.product_id = r.product_id
GROUP BY p.sku, p.name
ORDER BY p.sku;
```

| sku | name | so_danh_gia | diem_tb |
| --- | --- | --- | --- |
| ACC-008 | Cáp USB-C to USB-C 1m | 2 | 4.50 |
| PHN-003 | Xiaomi Redmi Note 13 | 1 | 3.00 |

Quy tắc "chỉ khách đã mua mới được đánh giá" không diễn đạt được bằng khóa ngoại, vì phải nhìn qua `orders` và `order_items`. Cần trigger (Ngày 18) hoặc kiểm tra trong transaction của ứng dụng. Truy vấn tìm đánh giá vi phạm (ở đây trả về 0 dòng):

```sql
SELECT r.customer_id, r.product_id
FROM bai_tap.reviews AS r
WHERE NOT EXISTS (
    SELECT 1
    FROM orders AS o
    JOIN order_items AS oi ON oi.order_id = o.order_id
    WHERE o.customer_id = r.customer_id AND oi.product_id = r.product_id
);
```
</details>

### Thử thách

**Bài 6.** Bảng `nguon_hang(sku, nha_cung_cap, nguoi_lien_he)` ghi mỗi sản phẩm được nhập từ nhà cung cấp nào, qua người liên hệ nào. Quy tắc: mỗi người liên hệ chỉ làm cho một nhà cung cấp (`nguoi_lien_he → nha_cung_cap`); với mỗi sản phẩm, mỗi nhà cung cấp chỉ cử một người liên hệ (`(sku, nha_cung_cap) → nguoi_lien_he`). Tìm các khóa ứng viên. Bảng đạt dạng chuẩn cao nhất nào? Nếu tách lên BCNF thì mất gì?

> Gợi ý: Tìm mọi tập cột xác định được cả ba cột, rồi xét phụ thuộc `nguoi_lien_he → nha_cung_cap` theo định nghĩa 3NF và BCNF ở mục 5.

<details>
<summary>Đáp án</summary>

- Khóa ứng viên: `{sku, nha_cung_cap}` (theo phụ thuộc thứ hai) và `{sku, nguoi_lien_he}` (vì `nguoi_lien_he → nha_cung_cap`, nên `{sku, nguoi_lien_he}` xác định cả ba cột). Mọi cột đều là thuộc tính khóa.
- 2NF: không có cột không khóa nào, nên không thể có phụ thuộc bộ phận. 3NF: phụ thuộc `nguoi_lien_he → nha_cung_cap` có vế phải là thuộc tính khóa, nên vẫn đạt 3NF.
- BCNF: không đạt, vì `nguoi_lien_he` không phải siêu khóa. Hệ quả: "chị A làm cho công ty X" lặp lại ở mọi sản phẩm chị A phụ trách.
- Tách lên BCNF: `lien_he(nguoi_lien_he PRIMARY KEY, nha_cung_cap)` và `nguon_hang(sku, nguoi_lien_he, PRIMARY KEY (sku, nguoi_lien_he))`. Mất đi: quy tắc `(sku, nha_cung_cap) → nguoi_lien_he` không còn kiểm tra được bằng một `UNIQUE`, vì `nha_cung_cap` nằm ở bảng khác. Đây đúng là tình huống của mục 5.6: chọn giữ 3NF với ràng buộc đơn giản, hoặc lên BCNF và giữ quy tắc bằng trigger.
</details>

**Bài 7.** Trang quản trị cần tổng tiền của mọi đơn, mở hàng trăm lần mỗi phút, chấp nhận số liệu cũ vài phút. Hãy phi chuẩn hóa bằng materialized view (không sửa bảng `orders`), kiểm tra tổng của đơn 12 và 31, và cho thấy view không tự cập nhật khi dữ liệu gốc đổi.

> Gợi ý: Sửa dữ liệu gốc trong `BEGIN ... ROLLBACK` rồi đọc view trước và sau `REFRESH`.

<details>
<summary>Đáp án</summary>

```sql
DROP SCHEMA IF EXISTS bai_tap CASCADE;
CREATE SCHEMA bai_tap;

CREATE MATERIALIZED VIEW bai_tap.order_totals AS
SELECT order_id,
       sum(quantity * unit_price * (1 - discount)) AS tong_tien
FROM order_items
GROUP BY order_id;

-- Bắt buộc có UNIQUE index để REFRESH ... CONCURRENTLY (không khóa người đọc)
CREATE UNIQUE INDEX ON bai_tap.order_totals (order_id);

SELECT * FROM bai_tap.order_totals WHERE order_id IN (12, 31) ORDER BY order_id;
```

| order_id | tong_tien |
| --- | --- |
| 12 | 31880000.00 |
| 31 | 4779000.00 |

Đổi dữ liệu gốc trong transaction rồi `ROLLBACK` để không làm hỏng bộ dữ liệu:

```sql
BEGIN;

UPDATE order_items SET quantity = 2 WHERE order_id = 31 AND product_id = 16;

SELECT * FROM bai_tap.order_totals WHERE order_id = 31;   -- vẫn số cũ

REFRESH MATERIALIZED VIEW CONCURRENTLY bai_tap.order_totals;

SELECT * FROM bai_tap.order_totals WHERE order_id = 31;   -- số mới

ROLLBACK;
```

| order_id | tong_tien |
| --- | --- |
| 31 | 4779000.00 |

| order_id | tong_tien |
| --- | --- |
| 31 | 5178000.00 |

Trước `REFRESH`, view vẫn trả 4.779.000 dù đơn đã thêm một chuột G102 (399.000). Đó là cái giá của phi chuẩn hóa: phải lên lịch `REFRESH`. Nếu cần số mới tức thì, dùng cột lưu sẵn cập nhật bằng trigger, đổi lại ghi chậm hơn và phức tạp hơn.
</details>

### Dọn dẹp

```sql
DROP SCHEMA IF EXISTS thiet_ke CASCADE;
DROP SCHEMA IF EXISTS bai_tap CASCADE;
```
