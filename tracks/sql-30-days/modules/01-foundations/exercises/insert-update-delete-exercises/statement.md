> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Mỗi đáp án được chạy trên dữ liệu gốc. Mọi lệnh `INSERT`/`UPDATE`/`DELETE` chạy không có `BEGIN` đều được lưu ngay (autocommit), nên các đáp án sửa dữ liệu đều bọc trong `BEGIN; ... ROLLBACK;`. Bài nào cố ý `COMMIT` thì có ghi chú chạy lại init ngay sau đó. `ROLLBACK` không trả lại số IDENTITY đã cấp, nên nếu làm nhiều bài liên tiếp, id mới có thể lớn hơn trong đáp án.

### Cơ bản

**Bài 1.** Thêm khách hàng `Đoàn Minh Quân`, email `quan.doan@gmail.com`, thành phố `Huế`, không có số điện thoại. Trả về `customer_id`, `full_name`, `phone`, `city` của dòng vừa thêm.

<details>
<summary>Đáp án</summary>

```sql
BEGIN;
INSERT INTO customers (full_name, email, city)
VALUES ('Đoàn Minh Quân', 'quan.doan@gmail.com', 'Huế')
RETURNING customer_id, full_name, phone, city;
ROLLBACK;
```

Kết quả:

| customer_id | full_name | phone | city |
| --- | --- | --- | --- |
| 19 | Đoàn Minh Quân | NULL | Huế |

Không nhắc tới `phone` thì cột nhận `NULL` (psql hiện ô trống).
</details>

**Bài 2.** Khách `Hoàng Thị Em` (id 5) vừa cung cấp email `em.hoang@gmail.com`. Xem trước dòng cần sửa, rồi cập nhật theo khóa chính.

<details>
<summary>Đáp án</summary>

```sql
SELECT customer_id, full_name, email FROM customers WHERE customer_id = 5;

BEGIN;
UPDATE customers
SET email = 'em.hoang@gmail.com'
WHERE customer_id = 5
RETURNING customer_id, full_name, email;
ROLLBACK;  -- làm thật thì dùng COMMIT
```

Kết quả (lệnh UPDATE, psql báo `UPDATE 1`):

| customer_id | full_name | email |
| --- | --- | --- |
| 5 | Hoàng Thị Em | em.hoang@gmail.com |
</details>

**Bài 3.** Thêm cùng lúc 3 sản phẩm vào danh mục `Sạc & Cáp` (id 12) và trả về id được sinh:

| sku | name | price | cost_price | stock_quantity |
| --- | --- | --- | --- | --- |
| ACC-013 | Sạc Ugreen 30W | 390000 | 250000 | 50 |
| ACC-014 | Cáp Lightning 1m | 190000 | 90000 | 80 |
| ACC-015 | Pin dự phòng 10000mAh | 590000 | 400000 | 30 |

<details>
<summary>Đáp án</summary>

```sql
BEGIN;
INSERT INTO products (sku, name, category_id, price, cost_price, stock_quantity)
VALUES
    ('ACC-013', 'Sạc Ugreen 30W',        12, 390000, 250000, 50),
    ('ACC-014', 'Cáp Lightning 1m',      12, 190000,  90000, 80),
    ('ACC-015', 'Pin dự phòng 10000mAh', 12, 590000, 400000, 30)
RETURNING product_id, sku, name, price;
ROLLBACK;
```

Kết quả:

| product_id | sku | name | price |
| --- | --- | --- | --- |
| 25 | ACC-013 | Sạc Ugreen 30W | 390000 |
| 26 | ACC-014 | Cáp Lightning 1m | 190000 |
| 27 | ACC-015 | Pin dự phòng 10000mAh | 590000 |
</details>

### Vận dụng

**Bài 4.** Cột `city` có khách ghi `đà nẵng` (chữ thường). Theo đúng quy trình an toàn (SELECT xem trước, `BEGIN`, `UPDATE ... RETURNING`, `COMMIT`), sửa thành `Đà Nẵng`. Sau đó kiểm tra bằng `SELECT DISTINCT city ... WHERE city ILIKE 'đà nẵng'`.

<details>
<summary>Đáp án</summary>

```sql
SELECT customer_id, full_name, city
FROM customers
WHERE city = 'đà nẵng';

BEGIN;

UPDATE customers
SET city = 'Đà Nẵng'
WHERE city = 'đà nẵng'
RETURNING customer_id, full_name, city;

COMMIT;

SELECT DISTINCT city FROM customers WHERE city ILIKE 'đà nẵng';
```

Kết quả SELECT xem trước:

| customer_id | full_name | city |
| --- | --- | --- |
| 8 | Bùi Văn Hùng | đà nẵng |

Kết quả `RETURNING` (`UPDATE 1`, đúng 1 dòng như lúc xem trước):

| customer_id | full_name | city |
| --- | --- | --- |
| 8 | Bùi Văn Hùng | Đà Nẵng |

Kết quả kiểm tra cuối:

| city |
| --- |
| Đà Nẵng |

Chạy lại hai file init ([setup/README.md](../../../../setup/README.md#làm-lại-từ-đầu), mục Làm lại từ đầu) trước khi làm tiếp để kết quả khớp.
</details>

**Bài 5.** Lô hàng mới về: 10 chiếc `LAP-003` (Acer Nitro V 15, đang hết hàng) và 5 chiếc `LAP-007` Lenovo IdeaPad Slim 5 (danh mục 4, giá 17.490.000, giá nhập 15.200.000, chưa có trong hệ thống). Viết một lệnh duy nhất: mã đã có thì cộng tồn kho, mã chưa có thì thêm mới.

> Gợi ý: `INSERT ... ON CONFLICT (sku) DO UPDATE SET ...`; giá trị định chèn nằm trong `EXCLUDED`.

<details>
<summary>Đáp án</summary>

```sql
BEGIN;
INSERT INTO products (sku, name, category_id, price, cost_price, stock_quantity)
VALUES
    ('LAP-003', 'Acer Nitro V 15',       3, 21990000, 19000000, 10),
    ('LAP-007', 'Lenovo IdeaPad Slim 5', 4, 17490000, 15200000,  5)
ON CONFLICT (sku) DO UPDATE
SET stock_quantity = products.stock_quantity + EXCLUDED.stock_quantity
RETURNING product_id, sku, name, price, stock_quantity;
ROLLBACK;
```

Kết quả:

| product_id | sku | name | price | stock_quantity |
| --- | --- | --- | --- | --- |
| 3 | LAP-003 | Acer Nitro V 15 | 21990000 | 10 |
| 26 | LAP-007 | Lenovo IdeaPad Slim 5 | 17490000 | 5 |

`LAP-003` giữ nguyên `product_id = 3`, tồn kho `0 + 10`. `LAP-007` là dòng mới. Id 26 chứ không phải 25 vì dòng `LAP-003` đi vào nhánh xung đột nhưng vẫn đã tiêu một số IDENTITY.
</details>

**Bài 6.** Giảm 10% (làm tròn nghìn) cho các sản phẩm danh mục `Laptop gaming`, dùng `UPDATE ... FROM categories` để lọc theo tên danh mục. Chạy trong `BEGIN`, xem `RETURNING`, rồi `ROLLBACK` (đây chỉ là chạy thử).

<details>
<summary>Đáp án</summary>

Xem trước:

```sql
SELECT category_id, name FROM categories WHERE name = 'Laptop gaming';   -- category_id = 3
SELECT sku, name, price FROM products WHERE category_id = 3;
```

| sku | name | price |
| --- | --- | --- |
| LAP-001 | ASUS ROG Strix G16 | 32990000 |
| LAP-002 | Lenovo Legion 5 | 29990000 |
| LAP-003 | Acer Nitro V 15 | 21990000 |

Chạy thử:

```sql
BEGIN;

UPDATE products
SET price = ROUND(products.price * 0.9, -3)
FROM categories
WHERE categories.category_id = products.category_id
  AND categories.name = 'Laptop gaming'
RETURNING products.sku, products.name, products.price;

ROLLBACK;
```

Kết quả `RETURNING` (`UPDATE 3`, sau `ROLLBACK` giá trở lại như cũ):

| sku | name | price |
| --- | --- | --- |
| LAP-001 | ASUS ROG Strix G16 | 29691000 |
| LAP-002 | Lenovo Legion 5 | 26991000 |
| LAP-003 | Acer Nitro V 15 | 19791000 |
</details>

**Bài 7.** Tạo bảng nháp `product_archive (product_id INT PRIMARY KEY, sku, name, price, archived_at TIMESTAMPTZ DEFAULT now())`, rồi dùng `INSERT ... SELECT` chép vào đó các sản phẩm đã ngừng kinh doanh hoặc hết hàng.

<details>
<summary>Đáp án</summary>

```sql
BEGIN;
CREATE TABLE product_archive (
    product_id  INT           PRIMARY KEY,
    sku         VARCHAR(20)   NOT NULL,
    name        VARCHAR(200)  NOT NULL,
    price       NUMERIC(12,0) NOT NULL,
    archived_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

INSERT INTO product_archive (product_id, sku, name, price)
SELECT product_id, sku, name, price
FROM products
WHERE is_active = FALSE OR stock_quantity = 0
RETURNING product_id, sku, name, price;
ROLLBACK;  -- hủy cả bảng nháp lẫn dữ liệu vừa chép
```

Kết quả (`INSERT 0 3`):

| product_id | sku | name | price |
| --- | --- | --- | --- |
| 3 | LAP-003 | Acer Nitro V 15 | 21990000 |
| 13 | PHN-004 | Nokia 105 4G | 690000 |
| 21 | ACC-006 | Loa JBL Flip 6 | 2690000 |

`CREATE TABLE` cũng nằm trong transaction, nên `ROLLBACK` xóa luôn bảng nháp, không cần `DROP TABLE`.
</details>

### Thử thách

**Bài 8.** Khách `Châu Ngọc Trâm` (id 17) và `Trần Thị Bình` (id 2) đều yêu cầu xóa tài khoản. Thử xóa cả hai theo khóa chính, mỗi người một lệnh. Lệnh nào thành công, lệnh nào lỗi, vì sao? Đề xuất cách xử lý cho trường hợp bị lỗi.

<details>
<summary>Đáp án</summary>

```sql
SELECT customer_id, full_name, email FROM customers WHERE customer_id IN (2, 17);

BEGIN;
DELETE FROM customers WHERE customer_id = 17 RETURNING customer_id, full_name;
ROLLBACK;  -- làm thật thì dùng COMMIT

DELETE FROM customers WHERE customer_id = 2;
```

Kết quả lệnh xóa khách 17 (`DELETE 1`):

| customer_id | full_name |
| --- | --- |
| 17 | Châu Ngọc Trâm |

Lệnh xóa khách 2 lỗi:

```text
ERROR:  update or delete on table "customers" violates foreign key constraint "orders_customer_id_fkey" on table "orders"
DETAIL:  Key (customer_id)=(2) is still referenced from table "orders".
```

Khách 17 chưa mua đơn nào nên xóa được. Khách 2 đã có đơn, khóa ngoại chặn xóa để giữ lịch sử bán hàng. Cách xử lý thường gặp: không xóa dòng mà ẩn danh hóa thông tin cá nhân, ví dụ `UPDATE customers SET full_name = 'Khách đã xóa #2', email = NULL, phone = NULL, birth_date = NULL, city = NULL WHERE customer_id = 2;` (đổi cả họ tên, vì tên cũng là thông tin cá nhân), hoặc thêm một cột trạng thái tài khoản (cần sửa cấu trúc bảng, chỉ làm trên bảng nháp).
</details>

**Bài 9.** Khách hủy đơn 39 (đang `paid`). Trong một transaction: (a) đổi `status` thành `cancelled`, ghi `note` là `Khách hủy, chờ hoàn tiền`; (b) cộng trả lại tồn kho cho mọi sản phẩm trong đơn, lấy số lượng từ `order_items` bằng `UPDATE ... FROM` (không gõ tay id sản phẩm). Xem trước đơn và các dòng hàng của nó trước khi sửa.

> Gợi ý: dùng `UPDATE products ... FROM order_items WHERE ...` để lấy số lượng từ dòng hàng của đơn 39; hai lệnh `UPDATE` nằm giữa cùng một cặp `BEGIN`/`COMMIT`.

<details>
<summary>Đáp án</summary>

```sql
SELECT order_id, status, note FROM orders WHERE order_id = 39;
SELECT order_id, product_id, quantity FROM order_items WHERE order_id = 39;
```

| order_id | status | note |
| --- | --- | --- |
| 39 | paid | NULL |

| order_id | product_id | quantity |
| --- | --- | --- |
| 39 | 10 | 2 |

```sql
BEGIN;

UPDATE orders
SET status = 'cancelled',
    note   = 'Khách hủy, chờ hoàn tiền'
WHERE order_id = 39
RETURNING order_id, status, note;

UPDATE products
SET stock_quantity = products.stock_quantity + order_items.quantity
FROM order_items
WHERE order_items.product_id = products.product_id
  AND order_items.order_id = 39
RETURNING products.product_id, products.name, products.stock_quantity;

COMMIT;
```

Kết quả hai lệnh UPDATE:

| order_id | status | note |
| --- | --- | --- |
| 39 | cancelled | Khách hủy, chờ hoàn tiền |

| product_id | name | stock_quantity |
| --- | --- | --- |
| 10 | iPhone 15 128GB | 17 |

iPhone 15 từ 15 lên 17. Hai lệnh nằm trong cùng transaction nên hoặc cả hai được lưu, hoặc không lệnh nào: không thể có cảnh đơn đã hủy mà kho chưa được cộng lại. Đây là ý tưởng cốt lõi của [Ngày 16](../../../03-database-objects/lessons/16-transactions-acid.md). (Việc hoàn tiền trong `payments` chưa xét ở bài này.)

Chạy lại hai file init ([setup/README.md](../../../../setup/README.md#làm-lại-từ-đầu), mục Làm lại từ đầu) trước khi làm tiếp để kết quả khớp.
</details>
