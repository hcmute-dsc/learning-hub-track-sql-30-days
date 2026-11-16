> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Nhớ khôi phục dữ liệu gốc trước mỗi bài (xem [setup/README.md](../../../../setup/README.md) mục "Làm lại từ đầu").

### Cơ bản

**Bài 1.** Khách 17 (Châu Ngọc Trâm) đặt online, giao về Hà Nội, 1 bàn phím cơ Keychron K2 (sản phẩm 18, giá 1.890.000) và 1 lót chuột DSC XXL (sản phẩm 24, giá 250.000). Viết transaction tạo đơn, thêm hai dòng hàng, trừ tồn kho, rồi kiểm tra tồn kho hai sản phẩm.

<details>
<summary>Đáp án</summary>

```sql
BEGIN;

INSERT INTO orders (customer_id, order_date, status, channel, shipping_city)
VALUES (17, '2026-10-17 10:00+07', 'pending', 'online', 'Hà Nội')
RETURNING order_id;   -- 41 trên dữ liệu gốc

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    (currval('orders_order_id_seq'), 18, 1, 1890000),
    (currval('orders_order_id_seq'), 24, 1,  250000);

UPDATE products SET stock_quantity = stock_quantity - 1 WHERE product_id IN (18, 24);  -- UPDATE 2

COMMIT;

SELECT product_id, name, stock_quantity
FROM products
WHERE product_id IN (18, 24)
ORDER BY product_id;
```

Kết quả:

| product_id | name | stock_quantity |
| --- | --- | --- |
| 18 | Bàn phím cơ Keychron K2 | 14 |
| 24 | Lót chuột DSC XXL | 29 |

</details>

**Bài 2.** Trong một transaction, giảm giá MacBook Air M2 (sản phẩm 5) 10%, xem giá mới, rồi đổi ý và hủy. Chứng minh giá đã về như cũ.

<details>
<summary>Đáp án</summary>

```sql
BEGIN;
UPDATE products SET price = price * 0.9 WHERE product_id = 5;
SELECT name, price FROM products WHERE product_id = 5;
ROLLBACK;
SELECT name, price FROM products WHERE product_id = 5;
```

Kết quả (trong transaction):

| name | price |
| --- | --- |
| MacBook Air M2 13 inch | 22491000 |

Kết quả (sau ROLLBACK):

| name | price |
| --- | --- |
| MacBook Air M2 13 inch | 24990000 |

</details>

**Bài 3.** Dự đoán thông báo của từng câu, rồi chạy thử. Acer Nitro V 15 (sản phẩm 3) đang hết hàng.

```sql
BEGIN;
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE product_id = 3;
SELECT name, stock_quantity FROM products WHERE product_id = 3;
COMMIT;
```

<details>
<summary>Đáp án</summary>

```text
BEGIN
ERROR:  new row for relation "products" violates check constraint "products_stock_quantity_check"
ERROR:  current transaction is aborted, commands ignored until end of transaction block
ROLLBACK
```

Câu UPDATE vi phạm `CHECK (stock_quantity >= 0)`. Từ đó transaction ở trạng thái aborted nên câu SELECT bị từ chối, và `COMMIT` thực chất trở thành `ROLLBACK`. Tồn kho vẫn là 0.

</details>

### Vận dụng

**Bài 4.** Khách 5 mua tại cửa hàng (nhân viên 4, trạng thái `paid`) ba món: iPad Air M2 (sản phẩm 14, 16.990.000), Nokia 105 4G (sản phẩm 13, 690.000, đang hết hàng) và sạc Anker 65W (sản phẩm 22, 890.000). Dùng SAVEPOINT để món nào hết hàng thì bỏ món đó, các món còn lại vẫn được lưu.

<details>
<summary>Đáp án</summary>

```sql
BEGIN;

INSERT INTO orders (customer_id, employee_id, order_date, status, channel)
VALUES (5, 4, '2026-10-17 14:00+07', 'paid', 'offline')
RETURNING order_id;   -- 41 trên dữ liệu gốc

SAVEPOINT mon_1;
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (currval('orders_order_id_seq'), 14, 1, 16990000);
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE product_id = 14;

SAVEPOINT mon_2;
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (currval('orders_order_id_seq'), 13, 1, 690000);
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE product_id = 13;
-- ERROR: ... violates check constraint "products_stock_quantity_check"
ROLLBACK TO SAVEPOINT mon_2;

SAVEPOINT mon_3;
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (currval('orders_order_id_seq'), 22, 1, 890000);
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE product_id = 22;

COMMIT;

SELECT oi.product_id, p.name, oi.quantity, p.stock_quantity
FROM order_items oi
JOIN products p ON p.product_id = oi.product_id
WHERE oi.order_id = currval('orders_order_id_seq')
ORDER BY oi.product_id;
```

Kết quả:

| product_id | name | quantity | stock_quantity |
| --- | --- | --- | --- |
| 14 | iPad Air M2 11 inch | 1 | 4 |
| 22 | Sạc Anker 65W | 1 | 39 |

Trong thực tế, ứng dụng chỉ chạy `ROLLBACK TO SAVEPOINT` khi thấy lỗi; ở đây ta biết trước Nokia hết hàng.

</details>

**Bài 5.** Tạo lại bảng `wallets` như mục 9 (1: 1.000.000, 2: 500.000, 3: 0). Viết transaction chuyển 200.000 đ từ khách 1 sang khách 3, có khóa hai ví theo đúng thứ tự. Vì sao phải khóa theo thứ tự `customer_id` mà không khóa "người gửi trước, người nhận sau"?

<details>
<summary>Đáp án</summary>

```sql
BEGIN;

SELECT customer_id, balance
FROM wallets
WHERE customer_id IN (1, 3)
ORDER BY customer_id
FOR UPDATE;

UPDATE wallets SET balance = balance - 200000 WHERE customer_id = 1;
UPDATE wallets SET balance = balance + 200000 WHERE customer_id = 3;

COMMIT;

SELECT * FROM wallets ORDER BY customer_id;
```

Kết quả:

| customer_id | balance |
| --- | --- |
| 1 | 800000 |
| 2 | 500000 |
| 3 | 200000 |

Nếu khóa "người gửi trước", lệnh chuyển 1 → 3 khóa ví 1 rồi ví 3, còn lệnh chuyển 3 → 1 chạy cùng lúc khóa ví 3 rồi ví 1: đúng kịch bản deadlock ở mục 8. Khóa theo `customer_id` tăng dần thì mọi lệnh chuyển đều khóa ví 1 trước ví 3, nên không thể chờ vòng tròn.

</details>

**Bài 6.** Hai phiên. Phiên A mở transaction rồi đếm số đơn `pending` (dữ liệu gốc có 1). Phiên B (autocommit) thêm một đơn `pending` mới cho khách 16. Phiên A đếm lại rồi COMMIT. Dự đoán kết quả lần đếm thứ hai khi A dùng READ COMMITTED và khi A dùng REPEATABLE READ. Sau khi A COMMIT, đếm lại thì được bao nhiêu?

<details>
<summary>Đáp án</summary>

| Bước | Phiên A | Phiên B |
| --- | --- | --- |
| 1 | `BEGIN ISOLATION LEVEL READ COMMITTED;` (hoặc `REPEATABLE READ`)<br>`SELECT count(*) FROM orders WHERE status = 'pending';` → **1** | |
| 2 | | `INSERT INTO orders (customer_id, order_date, status, channel, shipping_city) VALUES (16, '2026-10-17 11:00+07', 'pending', 'online', 'Cần Thơ');` |
| 3 | đếm lại, rồi `COMMIT;` | |

Kết quả lần đếm thứ hai:

| Mức của phiên A | Lần đếm 2 | Đếm sau COMMIT |
| --- | --- | --- |
| READ COMMITTED | 2 (phantom read) | 2 |
| REPEATABLE READ | 1 (vẫn dùng ảnh chụp cũ) | 2 |

</details>

### Thử thách

**Bài 7.** Flash sale: Lenovo Legion 5 (sản phẩm 2) chỉ còn 3 máy, mỗi khách mua 1. Viết **một câu lệnh** trừ kho cho một lượt mua sao cho: không bao giờ âm, hai khách bấm cùng lúc không làm mất lượt trừ, và ứng dụng biết lượt đó thành công hay hết hàng. Chạy câu đó 4 lần liên tiếp và giải thích kết quả.

<details>
<summary>Đáp án</summary>

```sql
UPDATE products
SET stock_quantity = stock_quantity - 1
WHERE product_id = 2 AND stock_quantity >= 1
RETURNING stock_quantity;
```

Kết quả bốn lần chạy:

| Lần | Kết quả |
| --- | --- |
| 1 | `stock_quantity = 2`, `UPDATE 1` |
| 2 | `stock_quantity = 1`, `UPDATE 1` |
| 3 | `stock_quantity = 0`, `UPDATE 1` |
| 4 | `(0 rows)`, `UPDATE 0` |

- Phép trừ nằm trong UPDATE nên dòng bị khóa trong lúc trừ; lượt đến sau phải chờ rồi đọc lại giá trị mới (mục 6.2), không mất lượt trừ.
- Điều kiện `stock_quantity >= 1` làm lượt thứ 4 không trúng dòng nào. `UPDATE 0` (hoặc không có dòng RETURNING) là tín hiệu "hết hàng" để ứng dụng ROLLBACK cả đơn.
- `CHECK (stock_quantity >= 0)` là lưới an toàn thứ hai nếu ai đó quên điều kiện.

</details>

**Bài 8.** Một đơn mua ASUS (1) và Lenovo (2), đơn khác mua Lenovo (2) và ASUS (1), cả hai trừ kho theo thứ tự các món trong giỏ. Giải thích vì sao có thể deadlock, và viết lại phần trừ kho để không còn deadlock giữa các đơn.

<details>
<summary>Đáp án</summary>

Đơn thứ nhất khóa dòng 1 rồi chờ dòng 2, đơn thứ hai khóa dòng 2 rồi chờ dòng 1: chờ vòng tròn (mục 8). Sửa bằng cách khóa mọi sản phẩm của đơn trong một câu, theo thứ tự `product_id` tăng dần, trước khi trừ:

```sql
BEGIN;

SELECT product_id, stock_quantity
FROM products
WHERE product_id IN (1, 2)
ORDER BY product_id
FOR UPDATE;

UPDATE products SET stock_quantity = stock_quantity - 1 WHERE product_id IN (1, 2);

COMMIT;
```

Kết quả của câu SELECT (dữ liệu gốc):

| product_id | stock_quantity |
| --- | --- |
| 1 | 5 |
| 2 | 3 |

Dù giỏ hàng xếp theo thứ tự nào, mọi đơn đều khóa dòng 1 trước dòng 2, nên đơn đến sau chỉ chờ chứ không deadlock. Ứng dụng vẫn nên thử lại khi gặp SQLSTATE `40P01`.

</details>
