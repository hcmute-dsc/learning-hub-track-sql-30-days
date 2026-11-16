> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Nhớ khôi phục dữ liệu gốc trước khi làm (file init cũng xóa các function của bài trước). Bài nào dùng `order_total` thì tạo lại nó theo mục 2.

### Cơ bản

**Bài 1.** Viết function `line_total(p_quantity, p_unit_price, p_discount)` tính tiền một dòng hàng, `p_discount` mặc định 0, làm tròn tới đồng. Dùng nó để liệt kê các dòng hàng của đơn 22.

<details>
<summary>Đáp án</summary>

```sql
CREATE OR REPLACE FUNCTION line_total(
    p_quantity   INT,
    p_unit_price NUMERIC,
    p_discount   NUMERIC DEFAULT 0
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT ROUND(p_quantity * p_unit_price * (1 - p_discount));
$$;

SELECT line_total(2, 399000) AS khong_giam, line_total(1, 5990000, 0.15) AS giam_15;

SELECT product_id, quantity, unit_price, discount,
       line_total(quantity, unit_price, discount) AS thanh_tien
FROM order_items
WHERE order_id = 22;
```

Kết quả:

| khong_giam | giam_15 |
| --- | --- |
| 798000 | 5091500 |

| product_id | quantity | unit_price | discount | thanh_tien |
| --- | --- | --- | --- | --- |
| 20 | 1 | 5990000 | 0.15 | 5091500 |
| 12 | 1 | 4890000 | 0.10 | 4401000 |

`IMMUTABLE` vì kết quả chỉ phụ thuộc tham số, không đọc bảng.

</details>

**Bài 2.** Viết function `customer_order_count(p_customer_id)` đếm số đơn của một khách (tính cả đơn hủy). Dùng nó để tìm những khách chưa có đơn nào.

<details>
<summary>Đáp án</summary>

```sql
CREATE OR REPLACE FUNCTION customer_order_count(p_customer_id INT)
RETURNS BIGINT
LANGUAGE sql
STABLE
AS $$
    SELECT count(*) FROM orders WHERE customer_id = p_customer_id;
$$;

SELECT customer_id, full_name
FROM customers
WHERE customer_order_count(customer_id) = 0
ORDER BY customer_id;
```

Kết quả:

| customer_id | full_name |
| --- | --- |
| 16 | Tạ Quang Sơn |
| 17 | Châu Ngọc Trâm |

Chạy được, nhưng hàm bị gọi 18 lần, mỗi lần một truy vấn. Với bảng lớn, `NOT EXISTS` (Ngày 11) hay `LEFT JOIN ... IS NULL` (Ngày 10) hiệu quả hơn.

</details>

**Bài 3.** Viết function `orders_of_customer(p_customer_id)` trả về bảng gồm `order_id`, `order_day` (ngày đặt, kiểu DATE), `status`, `total` (dùng `order_total`), xếp theo ngày đặt. Liệt kê đơn của khách 4, rồi tính tổng tiền các đơn không bị hủy của khách này bằng chính function đó.

<details>
<summary>Đáp án</summary>

```sql
CREATE OR REPLACE FUNCTION orders_of_customer(p_customer_id INT)
RETURNS TABLE (order_id INT, order_day DATE, status VARCHAR, total NUMERIC)
LANGUAGE sql
STABLE
AS $$
    SELECT o.order_id, o.order_date::DATE, o.status, order_total(o.order_id)
    FROM orders o
    WHERE o.customer_id = p_customer_id
    ORDER BY o.order_date;
$$;

SELECT * FROM orders_of_customer(4);

SELECT SUM(total) AS tong_khong_huy
FROM orders_of_customer(4)
WHERE status <> 'cancelled';
```

Kết quả:

| order_id | order_day | status | total |
| --- | --- | --- | --- |
| 5 | 2025-03-02 | cancelled | 32990000 |
| 16 | 2025-08-16 | delivered | 8980000 |
| 31 | 2026-04-01 | delivered | 4779000 |

| tong_khong_huy |
| --- |
| 13759000 |

</details>

### Vận dụng

**Bài 4.** Viết function PL/pgSQL `shipping_fee(p_order_id)`: đơn `offline` hoặc đơn có tổng tiền từ 5.000.000 đ được miễn phí, còn lại 30.000 đ. Đơn không tồn tại thì báo lỗi với mã `no_data_found`. Thử với các đơn 1, 2, 3, 8 và 999.

<details>
<summary>Đáp án</summary>

```sql
CREATE OR REPLACE FUNCTION shipping_fee(p_order_id INT)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_channel VARCHAR;
BEGIN
    SELECT channel INTO v_channel
    FROM orders
    WHERE order_id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không có đơn %', p_order_id
            USING ERRCODE = 'no_data_found';
    END IF;

    IF v_channel = 'offline' OR order_total(p_order_id) >= 5000000 THEN
        RETURN 0;
    END IF;
    RETURN 30000;
END;
$$;

SELECT order_id, channel, order_total(order_id) AS tong_tien, shipping_fee(order_id) AS phi_ship
FROM orders
WHERE order_id IN (1, 2, 3, 8)
ORDER BY order_id;

SELECT shipping_fee(999);
```

Kết quả:

| order_id | channel | tong_tien | phi_ship |
| --- | --- | --- | --- |
| 1 | online | 699000 | 30000 |
| 2 | offline | 26990000 | 0 |
| 3 | online | 5780000 | 0 |
| 8 | online | 20140000 | 0 |

```text
ERROR:  Không có đơn 999
CONTEXT:  PL/pgSQL function shipping_fee(integer) line 10 at RAISE
```

</details>

**Bài 5.** Viết procedure `update_order_status(p_order_id, p_new_status)` chỉ cho phép các bước chuyển: `pending → paid`, `pending → cancelled`, `paid → shipped`, `paid → cancelled`, `shipped → delivered`. Bước chuyển khác thì báo lỗi `check_violation`. Khóa dòng đơn hàng trong lúc kiểm tra để hai người không cùng đổi trạng thái. Thử: đơn 40 sang `paid`, rồi đơn 40 sang `delivered`, rồi đơn 1 sang `pending`.

<details>
<summary>Đáp án</summary>

```sql
CREATE OR REPLACE PROCEDURE update_order_status(p_order_id INT, p_new_status VARCHAR)
LANGUAGE plpgsql
AS $$
DECLARE
    v_old VARCHAR;
BEGIN
    SELECT status INTO v_old
    FROM orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không có đơn %', p_order_id USING ERRCODE = 'no_data_found';
    END IF;

    IF NOT (
           (v_old = 'pending' AND p_new_status IN ('paid', 'cancelled'))
        OR (v_old = 'paid'    AND p_new_status IN ('shipped', 'cancelled'))
        OR (v_old = 'shipped' AND p_new_status = 'delivered')
    ) THEN
        RAISE EXCEPTION 'Không thể chuyển đơn % từ % sang %', p_order_id, v_old, p_new_status
            USING ERRCODE = 'check_violation';
    END IF;

    UPDATE orders SET status = p_new_status WHERE order_id = p_order_id;
    RAISE NOTICE 'Đơn %: % -> %', p_order_id, v_old, p_new_status;
END;
$$;

CALL update_order_status(40, 'paid');
CALL update_order_status(40, 'delivered');
CALL update_order_status(1, 'pending');

SELECT order_id, status FROM orders WHERE order_id IN (1, 40) ORDER BY order_id;
```

Kết quả:

```text
NOTICE:  Đơn 40: pending -> paid
ERROR:  Không thể chuyển đơn 40 từ paid sang delivered
ERROR:  Không thể chuyển đơn 1 từ delivered sang pending
```

| order_id | status |
| --- | --- |
| 1 | delivered |
| 40 | paid |

</details>

**Bài 6.** Viết procedure `restock(p_sku, p_add, OUT o_new_stock)` nhập thêm hàng theo mã SKU và trả về tồn kho mới. Báo lỗi khi số lượng nhập không dương hoặc không có SKU đó. Thử với `('ACC-006', 20)`, `('ACC-999', 5)` và `('ACC-006', -1)`.

<details>
<summary>Đáp án</summary>

```sql
CREATE OR REPLACE PROCEDURE restock(p_sku VARCHAR, p_add INT, OUT o_new_stock INT)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_add IS NULL OR p_add <= 0 THEN
        RAISE EXCEPTION 'Số lượng nhập phải lớn hơn 0' USING ERRCODE = 'check_violation';
    END IF;

    UPDATE products
    SET stock_quantity = stock_quantity + p_add
    WHERE sku = p_sku
    RETURNING stock_quantity INTO o_new_stock;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không có sản phẩm mã %', p_sku USING ERRCODE = 'no_data_found';
    END IF;
END;
$$;

CALL restock('ACC-006', 20, NULL);
CALL restock('ACC-999', 5, NULL);
CALL restock('ACC-006', -1, NULL);
```

Kết quả:

| o_new_stock |
| --- |
| 20 |

```text
ERROR:  Không có sản phẩm mã ACC-999
ERROR:  Số lượng nhập phải lớn hơn 0
```

</details>

### Thử thách

**Bài 7.** Tạo lại bảng `wallets` của Ngày 16 (1: 1.000.000, 2: 500.000, 3: 0). Viết procedure `transfer(p_from, p_to, p_amount)` chuyển tiền an toàn: số tiền phải dương, không tự chuyển cho mình, cả hai ví phải tồn tại, khóa hai ví theo thứ tự `customer_id` để tránh deadlock, không đủ tiền thì báo lỗi rõ ràng. Thử: 2 → 1 300.000; 2 → 3 300.000; 1 → 99 1.000; 1 → 1 1.000.

<details>
<summary>Đáp án</summary>

```sql
DROP TABLE IF EXISTS wallets;

CREATE TABLE wallets (
    customer_id INT PRIMARY KEY REFERENCES customers (customer_id),
    balance     NUMERIC(12,0) NOT NULL CHECK (balance >= 0)
);

INSERT INTO wallets (customer_id, balance) VALUES (1, 1000000), (2, 500000), (3, 0);

CREATE OR REPLACE PROCEDURE transfer(p_from INT, p_to INT, p_amount NUMERIC)
LANGUAGE plpgsql
AS $$
DECLARE
    v_locked  INT;
    v_balance NUMERIC;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Số tiền phải lớn hơn 0' USING ERRCODE = 'check_violation';
    END IF;
    IF p_from = p_to THEN
        RAISE EXCEPTION 'Không thể tự chuyển cho chính mình' USING ERRCODE = 'check_violation';
    END IF;

    -- Khóa cả hai ví theo thứ tự customer_id để tránh deadlock
    PERFORM 1
    FROM wallets
    WHERE customer_id IN (p_from, p_to)
    ORDER BY customer_id
    FOR UPDATE;
    GET DIAGNOSTICS v_locked = ROW_COUNT;
    IF v_locked <> 2 THEN
        RAISE EXCEPTION 'Không tìm thấy ví % hoặc ví %', p_from, p_to
            USING ERRCODE = 'no_data_found';
    END IF;

    SELECT balance INTO v_balance FROM wallets WHERE customer_id = p_from;
    IF v_balance < p_amount THEN
        RAISE EXCEPTION 'Ví % chỉ còn %, không đủ chuyển %', p_from, v_balance, p_amount
            USING ERRCODE = 'check_violation';
    END IF;

    UPDATE wallets SET balance = balance - p_amount WHERE customer_id = p_from;
    UPDATE wallets SET balance = balance + p_amount WHERE customer_id = p_to;
END;
$$;

CALL transfer(2, 1, 300000);
CALL transfer(2, 3, 300000);
CALL transfer(1, 99, 1000);
CALL transfer(1, 1, 1000);

SELECT * FROM wallets ORDER BY customer_id;
```

Kết quả:

```text
CALL
ERROR:  Ví 2 chỉ còn 200000, không đủ chuyển 300000
ERROR:  Không tìm thấy ví 1 hoặc ví 99
ERROR:  Không thể tự chuyển cho chính mình
```

| customer_id | balance |
| --- | --- |
| 1 | 1300000 |
| 2 | 200000 |
| 3 | 0 |

- `PERFORM` chạy một câu SELECT mà bỏ kết quả (PL/pgSQL không cho `SELECT` trần không có `INTO`). Ở đây ta chỉ cần nó để khóa dòng.
- `GET DIAGNOSTICS v_locked = ROW_COUNT` lấy số dòng câu vừa rồi tác động: phải đúng 2 ví.
- Đọc số dư **sau** khi đã khóa nên không ai chen vào giữa lúc kiểm tra và lúc trừ. `CHECK (balance >= 0)` vẫn là lưới an toàn cuối.

</details>

**Bài 8.** Viết procedure `cancel_order(p_order_id)`: chỉ hủy được đơn `pending` hoặc `paid`; khi hủy phải trả lại tồn kho cho mọi sản phẩm trong đơn (gợi ý: `UPDATE ... FROM`, Ngày 6) và đổi trạng thái thành `cancelled`, tất cả trong một transaction. Thử với đơn 39 (`paid`) và đơn 37 (`shipped`), so sánh tồn kho trước và sau.

<details>
<summary>Đáp án</summary>

```sql
CREATE OR REPLACE PROCEDURE cancel_order(p_order_id INT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    SELECT status INTO v_status
    FROM orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không có đơn %', p_order_id USING ERRCODE = 'no_data_found';
    END IF;
    IF v_status NOT IN ('pending', 'paid') THEN
        RAISE EXCEPTION 'Đơn % đang ở trạng thái %, không hủy được', p_order_id, v_status
            USING ERRCODE = 'check_violation';
    END IF;

    UPDATE products p
    SET stock_quantity = p.stock_quantity + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
      AND oi.product_id = p.product_id;

    UPDATE orders SET status = 'cancelled' WHERE order_id = p_order_id;
END;
$$;

CALL cancel_order(39);
CALL cancel_order(37);

SELECT o.order_id, o.status, oi.product_id, oi.quantity, p.stock_quantity
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
JOIN products p ON p.product_id = oi.product_id
WHERE o.order_id IN (37, 39)
ORDER BY o.order_id;
```

Kết quả:

```text
ERROR:  Đơn 37 đang ở trạng thái shipped, không hủy được
CONTEXT:  PL/pgSQL function cancel_order(integer) line 14 at RAISE
```

| order_id | status | product_id | quantity | stock_quantity |
| --- | --- | --- | --- | --- |
| 37 | shipped | 15 | 1 | 7 |
| 37 | shipped | 23 | 1 | 200 |
| 39 | cancelled | 10 | 2 | 17 |

Trước khi hủy, iPhone 15 (sản phẩm 10) có tồn kho 15, đơn 39 trả lại 2 nên còn 17. Đơn 39 đã thanh toán, nên ngoài đời còn phải hoàn tiền (bảng `payments`); bài này bỏ qua phần đó.

</details>
