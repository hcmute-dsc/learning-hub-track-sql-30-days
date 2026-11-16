> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Chạy lại hai file init trước khi làm để kết quả khớp với đáp án. Các file đầu vào đã có sẵn trong `setup/data`.

### Cơ bản

**Bài 1.** Xuất danh sách sản phẩm đang hết hàng (`stock_quantity = 0`) gồm `sku`, `name`, `stock_quantity`, sắp theo `sku`, ra file `/data/out_of_stock.csv` có header. Dùng `\copy`.

<details>
<summary>Đáp án</summary>

```sql
\copy (SELECT sku, name, stock_quantity FROM products WHERE stock_quantity = 0 ORDER BY sku) TO '/data/out_of_stock.csv' WITH (FORMAT csv, HEADER true)
```

Kết quả: `COPY 3`, file `setup/data/out_of_stock.csv`:

```text
sku,name,stock_quantity
ACC-006,Loa JBL Flip 6,0
LAP-003,Acer Nitro V 15,0
PHN-004,Nokia 105 4G,0
```
</details>

**Bài 2.** File `new_employees.tsv` phân cách bằng tab và ghi `N/A` cho ô không có giá trị. Nạp file vào bảng `employees`, rồi xem các nhân viên mới.

```text
full_name	title	manager_id	hire_date	salary
Trương Mỹ Linh	Nhân viên bán hàng	2	2026-10-01	10500000
Hồ Đức Thịnh	Kỹ thuật viên	3	2026-10-01	12500000
Lưu Bảo Ngọc	Thực tập sinh kỹ thuật	N/A	2026-10-15	5000000
```

<details>
<summary>Đáp án</summary>

`E'\t'` là cách viết ký tự tab trong chuỗi PostgreSQL.

```sql
\copy employees (full_name, title, manager_id, hire_date, salary) FROM '/data/new_employees.tsv' WITH (FORMAT csv, HEADER true, DELIMITER E'\t', NULL 'N/A')

SELECT employee_id, full_name, title, manager_id, hire_date, salary
FROM employees
WHERE employee_id > 8
ORDER BY employee_id;
```

Kết quả: `COPY 3`

| employee_id | full_name | title | manager_id | hire_date | salary |
| --- | --- | --- | --- | --- | --- |
| 9 | Trương Mỹ Linh | Nhân viên bán hàng | 2 | 2026-10-01 | 10500000 |
| 10 | Hồ Đức Thịnh | Kỹ thuật viên | 3 | 2026-10-01 | 12500000 |
| 11 | Lưu Bảo Ngọc | Thực tập sinh kỹ thuật | NULL | 2026-10-15 | 5000000 |
</details>

**Bài 3.** Xuất các đơn hàng từ 01/01/2026 ra `/data/orders_2026.csv` gồm `order_id`, ngày đặt (kiểu date), tên khách, `status` và tổng tiền đơn (làm tròn đến đồng). Mỗi đơn một dòng, sắp theo `order_id`.

<details>
<summary>Đáp án</summary>

```sql
\copy (SELECT o.order_id, o.order_date::date AS order_date, c.full_name, o.status, ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))) AS total FROM orders o JOIN customers c ON c.customer_id = o.customer_id JOIN order_items oi ON oi.order_id = o.order_id WHERE o.order_date >= '2026-01-01' GROUP BY o.order_id, c.full_name ORDER BY o.order_id) TO '/data/orders_2026.csv' WITH (FORMAT csv, HEADER true)
```

Kết quả: `COPY 15`. Năm dòng đầu của file:

```text
order_id,order_date,full_name,status,total
26,2026-01-08,Đặng Thu Giang,delivered,2690000
27,2026-01-20,Dương Minh Khoa,delivered,31340500
28,2026-02-02,Hoàng Thị Em,cancelled,2490000
29,2026-02-25,Bùi Văn Hùng,delivered,11560000
30,2026-03-15,Lý Thanh Mai,delivered,18490000
```

(... tổng 15 đơn)
</details>

### Vận dụng

**Bài 4.** Xuất bảng sản phẩm thuộc danh mục `Tai nghe & Loa` (`category_id = 11`) cho một đồng nghiệp dùng Excel cài định dạng Việt Nam: phân cách bằng `;`, cột `name` luôn đặt trong nháy kép. Gợi ý: tùy chọn `FORCE_QUOTE (ten_cot)`.

<details>
<summary>Đáp án</summary>

```sql
\copy (SELECT sku, name, price, stock_quantity FROM products WHERE category_id = 11 ORDER BY sku) TO '/data/headphones_excel.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';', FORCE_QUOTE (name))
```

Kết quả: `COPY 3`

```text
sku;name;price;stock_quantity
ACC-004;"Tai nghe Sony WH-1000XM5";7990000;8
ACC-005;"Tai nghe AirPods Pro 2";5990000;12
ACC-006;"Loa JBL Flip 6";2690000;0
```
</details>

**Bài 5.** Nhân viên kho gửi file kiểm kê `stock_count.csv`:

```text
sku,counted_quantity
ACC-001,57
ACC-002,20
ACC-007, 38
acc-008,195
PHN-003,2O
XYZ-999,3
LAP-002,3
```

Nạp vào bảng staging. Viết truy vấn báo cáo từng dòng: SKU, số đếm được, lý do lỗi (nếu có), tồn kho trên hệ thống và chênh lệch. Sau đó cập nhật `stock_quantity` theo số kiểm kê cho các dòng hợp lệ có chênh lệch, trong một transaction.

<details>
<summary>Đáp án</summary>

Dòng `PHN-003` gõ nhầm chữ O thay cho số 0, dòng `XYZ-999` không có trong shop, dòng `acc-008` viết thường và `ACC-007` có dấu cách thừa (hai dòng này sửa được bằng `upper(trim(...))`).

```sql
DROP TABLE IF EXISTS stg_stock_count;
CREATE TABLE stg_stock_count (
    line_no          INT GENERATED ALWAYS AS IDENTITY,
    sku              TEXT,
    counted_quantity TEXT
);

\copy stg_stock_count (sku, counted_quantity) FROM '/data/stock_count.csv' WITH (FORMAT csv, HEADER true)

SELECT s.line_no + 1 AS dong,
       s.sku,
       s.counted_quantity,
       CASE
           WHEN trim(s.counted_quantity) !~ '^[0-9]+$' THEN 'số lượng không hợp lệ'
           WHEN p.product_id IS NULL                 THEN 'không có SKU này'
       END AS error,
       p.stock_quantity AS ton_he_thong,
       CASE WHEN trim(s.counted_quantity) ~ '^[0-9]+$' AND p.product_id IS NOT NULL
            THEN trim(s.counted_quantity)::int - p.stock_quantity END AS chenh_lech
FROM stg_stock_count s
LEFT JOIN products p ON p.sku = upper(trim(s.sku))
ORDER BY s.line_no;
```

| dong | sku | counted_quantity | error | ton_he_thong | chenh_lech |
| --- | --- | --- | --- | --- | --- |
| 2 | ACC-001 | 57 | NULL | 60 | -3 |
| 3 | ACC-002 | 20 | NULL | 20 | 0 |
| 4 | ACC-007 |  38 | NULL | 40 | -2 |
| 5 | acc-008 | 195 | NULL | 200 | -5 |
| 6 | PHN-003 | 2O | số lượng không hợp lệ | 25 | NULL |
| 7 | XYZ-999 | 3 | không có SKU này | NULL | NULL |
| 8 | LAP-002 | 3 | NULL | 3 | 0 |

```sql
BEGIN;

UPDATE products p
SET stock_quantity = trim(s.counted_quantity)::int
FROM stg_stock_count s
WHERE p.sku = upper(trim(s.sku))
  AND trim(s.counted_quantity) ~ '^[0-9]+$'
  AND p.stock_quantity <> trim(s.counted_quantity)::int
RETURNING p.sku, p.stock_quantity;

COMMIT;
```

| sku | stock_quantity |
| --- | --- |
| ACC-001 | 57 |
| ACC-007 | 38 |
| ACC-008 | 195 |
</details>

**Bài 6.** Sao lưu bảng `customers` ra CSV rồi nạp lại vào bảng mới `customers_restore` có cùng cấu trúc. Chứng minh hai bảng giống hệt nhau, kể cả các giá trị NULL.

<details>
<summary>Đáp án</summary>

`CREATE TABLE ... (LIKE customers)` tạo bảng cùng cột và kiểu dữ liệu (không kèm IDENTITY), nên nạp được cả cột `customer_id`. So sánh hai chiều bằng `EXCEPT` (Ngày 12): nếu không có dòng nào khác nhau thì hai bảng giống nhau.

```sql
\copy customers TO '/data/customers_backup.csv' WITH (FORMAT csv, HEADER true)

DROP TABLE IF EXISTS customers_restore;
CREATE TABLE customers_restore (LIKE customers);

\copy customers_restore FROM '/data/customers_backup.csv' WITH (FORMAT csv, HEADER true)

SELECT (SELECT count(*) FROM customers) AS goc,
       (SELECT count(*) FROM customers_restore) AS khoi_phuc;

SELECT count(*) AS khac_nhau FROM (
    (SELECT * FROM customers EXCEPT SELECT * FROM customers_restore)
    UNION ALL
    (SELECT * FROM customers_restore EXCEPT SELECT * FROM customers)
) d;
```

| goc | khoi_phuc |
| --- | --- |
| 18 | 18 |

| khac_nhau |
| --- |
| 0 |

`EXCEPT` coi hai NULL là giống nhau, nên kết quả 0 chứng tỏ cả các ô NULL (email của khách 5 và 17, ...) cũng được giữ nguyên qua vòng xuất rồi nhập.
</details>

### Thử thách

**Bài 7.** Đổi quy tắc nhập file nhà cung cấp: SKU đã có trong shop thì **không** coi là lỗi, mà cập nhật giá theo file và cộng thêm số lượng vào tồn kho. Viết lại bước 3 và bước 4 của quy trình staging (bắt đầu lại từ bước 1 trên dữ liệu gốc). Vì sao vẫn phải giữ kiểm tra "SKU trùng trong file"?

<details>
<summary>Đáp án</summary>

Bỏ điều kiện `SKU đã có trong shop` khỏi bước 3, và dùng UPSERT `ON CONFLICT (sku) DO UPDATE` (Ngày 6) ở bước 4. Trong `DO UPDATE`, `EXCLUDED` là dòng định chèn, `products` là dòng đang có.

```sql
UPDATE stg_supplier_products s
SET error = CASE
        WHEN s.name IS NULL                       THEN 'thiếu tên sản phẩm'
        WHEN s.price !~ '^[0-9]+$'                THEN 'giá không phải số'
        WHEN s.stock_quantity !~ '^-?[0-9]+$'     THEN 'tồn kho không phải số'
        WHEN s.stock_quantity::int < 0            THEN 'tồn kho âm'
        WHEN NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = s.category)
                                                  THEN 'không có danh mục ' || s.category
        WHEN EXISTS (SELECT 1 FROM stg_supplier_products d
                     WHERE d.sku = s.sku AND d.line_no < s.line_no)
                                                  THEN 'SKU trùng trong file'
    END;

BEGIN;

INSERT INTO products (sku, name, category_id, price, stock_quantity)
SELECT s.sku, s.name, c.category_id, s.price::numeric, s.stock_quantity::int
FROM stg_supplier_products s
JOIN categories c ON c.name = s.category
WHERE s.error IS NULL
ORDER BY s.line_no
ON CONFLICT (sku) DO UPDATE
SET price          = EXCLUDED.price,
    stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity
RETURNING product_id, sku, price, stock_quantity;

COMMIT;
```

| product_id | sku | price | stock_quantity |
| --- | --- | --- | --- |
| 25 | LAP-007 | 15490000 | 10 |
| 26 | PHN-005 | 8990000 | 12 |
| 27 | ACC-010 | 1590000 | 25 |
| 28 | ACC-011 | 1290000 | 30 |
| 1 | LAP-001 | 34990000 | 7 |
| 30 | NET-001 | 1290000 | 15 |

`LAP-001` giữ `product_id = 1`, giá thành 34.990.000 và tồn kho 5 + 2 = 7. Id 29 bị bỏ qua: PostgreSQL đã lấy sẵn một giá trị IDENTITY cho dòng LAP-001 trước khi phát hiện xung đột.

Vẫn phải loại SKU trùng trong file vì một lệnh `INSERT ... ON CONFLICT DO UPDATE` không được cập nhật cùng một dòng hai lần. Nếu để cả hai dòng `PHN-005` lọt vào, lệnh báo lỗi và không nạp gì:

```text
ERROR:  ON CONFLICT DO UPDATE command cannot affect row a second time
HINT:  Ensure that no rows proposed for insertion within the same command have duplicate constrained values.
```
</details>
