> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Khôi phục dữ liệu gốc trước khi làm. Bài 3 và Bài 4 bổ sung những trường hợp mà trigger `trg_order_items_decrease_stock` ([Ngày 18](../../lessons/18-triggers.md) mục 5) chưa xử lý, và tự tạo trigger riêng. Bài 7 cần trigger đó cùng procedure `place_order` của [Ngày 17](../../lessons/17-stored-procedures-functions.md) mục 6.

### Cơ bản

**Bài 1.** Viết trigger BEFORE INSERT OR UPDATE OF email trên `customers`, tự đổi email về chữ thường và bỏ khoảng trắng hai đầu. Thử thêm khách "Lê Thị Vy" với email `'  Vy.Le@Gmail.COM '`, thêm một khách không có email, rồi sửa email khách 2 thành `' Binh.Tran@GMAIL.com'`.

<details>
<summary>Đáp án</summary>

```sql
CREATE OR REPLACE FUNCTION customers_normalize_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.email := lower(trim(NEW.email));
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customers_normalize_email
BEFORE INSERT OR UPDATE OF email ON customers
FOR EACH ROW
EXECUTE FUNCTION customers_normalize_email();

INSERT INTO customers (full_name, email) VALUES ('Lê Thị Vy', '  Vy.Le@Gmail.COM ')
RETURNING customer_id, full_name, email;

INSERT INTO customers (full_name, email) VALUES ('Lý Văn Tèo', NULL)
RETURNING customer_id, email;

UPDATE customers SET email = ' Binh.Tran@GMAIL.com' WHERE customer_id = 2
RETURNING customer_id, email;
```

Kết quả:

| customer_id | full_name | email |
| --- | --- | --- |
| 19 | Lê Thị Vy | vy.le@gmail.com |

| customer_id | email |
| --- | --- |
| 20 | NULL |

| customer_id | email |
| --- | --- |
| 2 | binh.tran@gmail.com |

`lower(trim(NULL))` vẫn là NULL nên khách không có email không bị ảnh hưởng.

</details>

**Bài 2.** Quy định mới: đơn online được giảm tối đa 50% mỗi dòng hàng, đơn tại cửa hàng (`offline`) tối đa 70%. Vì sao `CHECK` trên `order_items` không làm được việc này? Viết trigger BEFORE INSERT OR UPDATE OF discount trên `order_items` để áp quy định. Thử đặt giảm 60% cho dòng hàng của đơn 40 (online, sản phẩm 12) và của đơn 2 (offline, sản phẩm 5).

<details>
<summary>Đáp án</summary>

`CHECK` chỉ nhìn được các cột của chính dòng đang ghi, còn kênh bán (`channel`) nằm ở bảng `orders`. Cần trigger để tra bảng khác.

```sql
CREATE OR REPLACE FUNCTION order_items_check_discount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_channel VARCHAR;
    v_max     NUMERIC;
BEGIN
    SELECT channel INTO v_channel FROM orders WHERE order_id = NEW.order_id;
    v_max := CASE WHEN v_channel = 'offline' THEN 0.70 ELSE 0.50 END;
    IF NEW.discount > v_max THEN
        RAISE EXCEPTION 'Đơn % (%): giảm % vượt mức tối đa %', NEW.order_id, v_channel, NEW.discount, v_max
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_items_check_discount
BEFORE INSERT OR UPDATE OF discount ON order_items
FOR EACH ROW
EXECUTE FUNCTION order_items_check_discount();

UPDATE order_items SET discount = 0.60 WHERE order_id = 40 AND product_id = 12;
UPDATE order_items SET discount = 0.60 WHERE order_id = 2 AND product_id = 5;

SELECT order_id, product_id, discount
FROM order_items
WHERE order_id IN (2, 40)
ORDER BY order_id;
```

Kết quả:

```text
ERROR:  Đơn 40 (online): giảm 0.60 vượt mức tối đa 0.50
UPDATE 1
```

| order_id | product_id | discount |
| --- | --- | --- |
| 2 | 5 | 0.60 |
| 40 | 12 | 0.00 |

Nếu đơn không tồn tại, `v_channel` là NULL và hàm áp mức 50%; còn việc chặn đơn không tồn tại đã có khóa ngoại lo.

</details>

### Vận dụng

**Bài 3.** Trigger ở Ngày 18, mục 5 chỉ trừ kho khi thêm dòng hàng. Viết trigger AFTER DELETE trên `order_items` để trả lại kho khi xóa dòng hàng. Thử xóa toàn bộ dòng hàng của đơn 40 (một Xiaomi Redmi Note 13, sản phẩm 12) và so sánh tồn kho trước và sau.

<details>
<summary>Đáp án</summary>

```sql
CREATE OR REPLACE FUNCTION order_items_return_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE products
    SET stock_quantity = stock_quantity + OLD.quantity
    WHERE product_id = OLD.product_id;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_order_items_return_stock
AFTER DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION order_items_return_stock();

SELECT stock_quantity FROM products WHERE product_id = 12;
DELETE FROM order_items WHERE order_id = 40;
SELECT stock_quantity FROM products WHERE product_id = 12;
```

Kết quả: trước khi xóa

| stock_quantity |
| --- |
| 25 |

sau khi xóa (`DELETE 1`)

| stock_quantity |
| --- |
| 26 |

Ở DELETE chỉ có `OLD`, không có `NEW`.

</details>

**Bài 4.** Viết trigger AFTER UPDATE OF quantity trên `order_items` để điều chỉnh kho theo chênh lệch số lượng: tăng số lượng thì trừ thêm kho (không đủ hàng thì báo lỗi), giảm số lượng thì trả lại kho. Chỉ chạy khi số lượng thật sự đổi. Thử: đơn 39 sản phẩm 10 (iPhone 15, tồn 15) từ 2 lên 3 rồi xuống 1; đơn 36 sản phẩm 2 (Lenovo, tồn 3) từ 1 lên 5.

> Gợi ý: phần chênh lệch là `NEW.quantity - OLD.quantity`; điều kiện `WHEN (...)` trong `CREATE TRIGGER` giúp trigger chỉ chạy khi số lượng thật sự đổi.

<details>
<summary>Đáp án</summary>

```sql
CREATE OR REPLACE FUNCTION order_items_adjust_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_delta INT := NEW.quantity - OLD.quantity;   -- > 0: lấy thêm hàng
BEGIN
    UPDATE products
    SET stock_quantity = stock_quantity - v_delta
    WHERE product_id = NEW.product_id
      AND stock_quantity >= v_delta;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sản phẩm % không đủ hàng để tăng thêm %', NEW.product_id, v_delta
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_order_items_adjust_stock
AFTER UPDATE OF quantity ON order_items
FOR EACH ROW
WHEN (OLD.quantity <> NEW.quantity)
EXECUTE FUNCTION order_items_adjust_stock();

UPDATE order_items SET quantity = 3 WHERE order_id = 39 AND product_id = 10;
UPDATE order_items SET quantity = 1 WHERE order_id = 39 AND product_id = 10;
UPDATE order_items SET quantity = 5 WHERE order_id = 36 AND product_id = 2;

SELECT product_id, stock_quantity FROM products WHERE product_id IN (2, 10) ORDER BY product_id;
```

Kết quả:

```text
UPDATE 1
UPDATE 1
ERROR:  Sản phẩm 2 không đủ hàng để tăng thêm 4
```

| product_id | stock_quantity |
| --- | --- |
| 2 | 3 |
| 10 | 16 |

iPhone: 15 → 14 (lấy thêm 1) → 16 (trả lại 2). Khi `v_delta` âm, điều kiện `stock_quantity >= v_delta` luôn đúng nên kho được cộng lại. Trigger này không xử lý trường hợp đổi `product_id` của dòng hàng; cách an toàn là cấm đổi (thêm một BEFORE trigger báo lỗi) và bắt người dùng xóa rồi thêm dòng mới.

</details>

**Bài 5.** Viết một trigger audit tổng quát cho bảng `orders`: mọi INSERT, UPDATE, DELETE đều ghi vào bảng `audit_log` gồm tên bảng, loại thao tác, `order_id`, toàn bộ dòng cũ và dòng mới. Dùng `to_jsonb(OLD)` / `to_jsonb(NEW)` để biến cả dòng thành JSON (JSONB sẽ học kỹ ở [Ngày 22](../../../04-sql-in-practice/lessons/22-sql-json-practice.md)). Thử thêm một đơn, đổi trạng thái, rồi xóa nó.

<details>
<summary>Đáp án</summary>

```sql
DROP TABLE IF EXISTS audit_log;

CREATE TABLE audit_log (
    log_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name TEXT        NOT NULL,
    operation  TEXT        NOT NULL,
    row_id     INT         NOT NULL,
    old_data   JSONB,
    new_data   JSONB,
    changed_by TEXT        NOT NULL DEFAULT current_user,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION audit_orders()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, row_id, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.order_id, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, row_id, old_data, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.order_id, to_jsonb(OLD), to_jsonb(NEW));
    ELSE
        INSERT INTO audit_log (table_name, operation, row_id, old_data)
        VALUES (TG_TABLE_NAME, TG_OP, OLD.order_id, to_jsonb(OLD));
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_orders_audit
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION audit_orders();

INSERT INTO orders (customer_id, order_date, status, channel, shipping_city)
VALUES (16, '2026-10-17 09:00+07', 'pending', 'online', 'Cần Thơ');
UPDATE orders SET status = 'paid' WHERE order_id = currval('orders_order_id_seq');
DELETE FROM orders WHERE order_id = currval('orders_order_id_seq');

SELECT log_id, operation, row_id,
       old_data ->> 'status' AS status_cu,
       new_data ->> 'status' AS status_moi
FROM audit_log
ORDER BY log_id;
```

Kết quả:

| log_id | operation | row_id | status_cu | status_moi |
| --- | --- | --- | --- | --- |
| 1 | INSERT | 41 | NULL | pending |
| 2 | UPDATE | 41 | pending | paid |
| 3 | DELETE | 41 | paid | NULL |

`->>` lấy một trường trong JSON ra dạng chữ. Đơn 41 đã bị xóa khỏi `orders` nhưng lịch sử vẫn còn đủ trong `audit_log`.

</details>

### Thử thách

**Bài 6.** Để tránh tai nạn "quên WHERE", viết trigger mức câu lệnh trên `products`: nếu một câu UPDATE đổi giá của hơn 10 sản phẩm thì báo lỗi và hủy cả câu. Đổi số lượng tồn kho hàng loạt vẫn được phép. Gợi ý: cần cả `OLD TABLE` và `NEW TABLE`.

<details>
<summary>Đáp án</summary>

```sql
CREATE OR REPLACE FUNCTION products_limit_price_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_changed INT;
BEGIN
    SELECT count(*) INTO v_changed
    FROM old_rows o
    JOIN new_rows n ON n.product_id = o.product_id
    WHERE n.price <> o.price;

    IF v_changed > 10 THEN
        RAISE EXCEPTION 'Một câu lệnh đổi giá % sản phẩm, vượt giới hạn 10', v_changed
            USING HINT = 'Chia nhỏ theo danh mục hoặc xin duyệt';
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_products_limit_price_update
AFTER UPDATE ON products
REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION products_limit_price_update();

UPDATE products SET price = ROUND(price * 1.1, -3);                          -- quên WHERE
UPDATE products SET price = ROUND(price * 1.1, -3) WHERE category_id = 10;   -- 4 sản phẩm
UPDATE products SET stock_quantity = stock_quantity + 1;                     -- không đổi giá

SELECT product_id, price FROM products WHERE category_id = 10 ORDER BY product_id;
```

Kết quả:

```text
ERROR:  Một câu lệnh đổi giá 24 sản phẩm, vượt giới hạn 10
HINT:  Chia nhỏ theo danh mục hoặc xin duyệt
UPDATE 4
UPDATE 24
```

| product_id | price |
| --- | --- |
| 16 | 439000 |
| 17 | 2739000 |
| 18 | 2079000 |
| 24 | 275000 |

Trigger mức câu lệnh chạy một lần sau khi mọi dòng đã sửa, nhìn được toàn bộ thay đổi để quyết định. Trigger mức dòng không làm được việc này vì mỗi lần chỉ thấy một dòng.

</details>

**Bài 7.** Khôi phục dữ liệu gốc, tạo trigger `trg_order_items_decrease_stock` (Ngày 18, mục 5) và procedure `place_order` (Ngày 17, mục 6). Dự đoán tồn kho chuột G102 (sản phẩm 16, đang có 60) sau `CALL place_order(16, 16, 2, NULL);`, chạy thử, giải thích và đề xuất cách sửa.

<details>
<summary>Đáp án</summary>

```sql
CALL place_order(16, 16, 2, NULL);
SELECT stock_quantity FROM products WHERE product_id = 16;
```

Kết quả:

| o_order_id |
| --- |
| 41 |

| stock_quantity |
| --- |
| 56 |

Mua 2 mà kho giảm 4: procedure tự trừ 2, rồi câu `INSERT INTO order_items` bên trong procedure kích hoạt trigger trừ thêm 2. Không có lỗi nào báo ra, nên kiểu sai này rất khó phát hiện.

Cách sửa: chọn **một** chỗ giữ quy tắc trừ kho.

- Giữ trigger: bỏ câu UPDATE trừ kho trong `place_order`, procedure chỉ còn kiểm tra đầu vào, tạo đơn và thêm dòng hàng. Lợi thế: mọi đường thêm dòng hàng (kể cả gõ tay) đều trừ kho.
- Giữ procedure: xóa trigger (`DROP TRIGGER trg_order_items_decrease_stock ON order_items;`) và quy định mọi đơn phải đi qua `place_order`. Lợi thế: logic hiện ra rõ ràng ở một chỗ.

</details>
