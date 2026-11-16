---
uid: "989b8b1f-0750-5a71-aa0b-21f1ad8cc4d7"
slug: "triggers"
title: "Ngày 18: Trigger"
objectives:
  - "Viết được trigger function (`RETURNS trigger`) và gắn nó vào bảng bằng `CREATE TRIGGER`."
  - "Chọn đúng BEFORE hay AFTER, FOR EACH ROW hay FOR EACH STATEMENT, và dùng `NEW`, `OLD`, `TG_OP`, điều kiện `WHEN`."
  - "Viết được trigger trừ tồn kho khi thêm dòng hàng mà không bán vượt kho khi nhiều người mua cùng lúc."
  - "Viết được trigger ghi nhật ký thay đổi (audit log) và trigger chặn dữ liệu sai."
  - "Biết xem, tắt, xóa trigger và nhận ra khi nào ràng buộc (constraint) hoặc procedure là lựa chọn tốt hơn."
prerequisites:
  - "sql-30-days/database-objects/stored-procedures-functions"
  - "sql-30-days/database-objects/transactions-acid"
authors:
  - "github:TienNHM"
license: "MIT"
---

> **Tóm tắt:** Trigger là đoạn code database tự chạy mỗi khi bảng bị INSERT, UPDATE hoặc DELETE. Bài này viết trigger bằng PL/pgSQL trên DSC Shop: tự điền giá vào dòng hàng, tự trừ tồn kho an toàn, ghi lịch sử đổi giá, chặn chuyển trạng thái đơn sai, và bàn thẳng về lúc nào **không** nên dùng trigger.

**Sau bài này bạn có thể:**

- Viết được trigger function (`RETURNS trigger`) và gắn nó vào bảng bằng `CREATE TRIGGER`.
- Chọn đúng BEFORE hay AFTER, FOR EACH ROW hay FOR EACH STATEMENT, và dùng `NEW`, `OLD`, `TG_OP`, điều kiện `WHEN`.
- Viết được trigger trừ tồn kho khi thêm dòng hàng mà không bán vượt kho khi nhiều người mua cùng lúc.
- Viết được trigger ghi nhật ký thay đổi (audit log) và trigger chặn dữ liệu sai.
- Biết xem, tắt, xóa trigger và nhận ra khi nào ràng buộc (constraint) hoặc procedure là lựa chọn tốt hơn.

**Cần biết trước:** [Ngày 17](17-stored-procedures-functions.md) (PL/pgSQL, `RAISE EXCEPTION`, `FOUND`), [Ngày 16](16-transactions-acid.md) (transaction, khóa dòng).

> Bài này gắn trigger vào các bảng shop và sửa dữ liệu. Muốn gỡ hết và đưa dữ liệu về như cũ, chạy lại hai file init như trong [setup/README.md](../../../setup/README.md) mục "Làm lại từ đầu". Các ví dụ trong bài chạy nối tiếp nhau trên dữ liệu gốc.

---

## 1. Trigger là gì?

Trigger là một hàm được database **tự động gọi** khi có sự kiện trên một bảng. Bạn không gọi nó; bạn chỉ chạy `INSERT INTO order_items ...` như bình thường và trigger chạy theo.

Ví dụ đời thường: cửa hàng có cái chuông gắn ở cửa. Không ai bấm chuông, nhưng cứ mở cửa là chuông kêu. Trigger là cái chuông, `INSERT`/`UPDATE`/`DELETE` là việc mở cửa.

Dùng trigger hợp lý khi:

- Một việc **phải** xảy ra mỗi khi dữ liệu đổi, bất kể ai đổi và đổi bằng đường nào (ứng dụng web, script nhập liệu, người quản trị gõ tay trong psql).
- Ví dụ: ghi lịch sử thay đổi, chặn thay đổi sai mà `CHECK` không diễn đạt được, tự điền giá trị suy ra từ bảng khác.

## 2. Trigger trong PostgreSQL gồm hai phần

PostgreSQL tách trigger thành hai đối tượng:

1. **Trigger function**: một function PL/pgSQL không tham số, `RETURNS trigger`, chứa việc cần làm.
2. **Trigger**: gắn function đó vào một bảng, nói rõ chạy **khi nào**.

```text
CREATE OR REPLACE FUNCTION ten_ham()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    ...
    RETURN NEW;   -- hoặc OLD, hoặc NULL (xem bảng bên dưới)
END;
$$;

CREATE TRIGGER ten_trigger
{BEFORE | AFTER} {INSERT | UPDATE [OF cot, ...] | DELETE} [OR ...]
ON ten_bang
[REFERENCING {OLD | NEW} TABLE AS ten]   -- chỉ cho AFTER ... FOR EACH STATEMENT
FOR EACH {ROW | STATEMENT}
[WHEN (dieu_kien)]
EXECUTE FUNCTION ten_ham();
```

Các lựa chọn:

| Phần | Ý nghĩa |
| --- | --- |
| `BEFORE` | Chạy trước khi dòng được ghi. Có thể **sửa** dòng sắp ghi (`NEW`) hoặc **bỏ** dòng đó |
| `AFTER` | Chạy sau khi dòng đã ghi. Hợp để cập nhật bảng khác, ghi log |
| `FOR EACH ROW` | Chạy một lần cho **mỗi dòng** bị tác động |
| `FOR EACH STATEMENT` | Chạy **một lần cho cả câu lệnh**, kể cả khi câu lệnh không tác động dòng nào |
| `UPDATE OF price` | Chỉ chạy khi câu UPDATE có ghi vào cột `price` |
| `WHEN (...)` | Điều kiện lọc trước khi gọi hàm, ví dụ `WHEN (OLD.price IS DISTINCT FROM NEW.price)` |

(Còn `INSTEAD OF` dùng cho view, sẽ gặp ở [Ngày 19](19-views.md).)

Biến có sẵn trong trigger function (mức ROW):

| Biến | Có khi | Nội dung |
| --- | --- | --- |
| `NEW` | INSERT, UPDATE | Dòng mới (sắp ghi hoặc vừa ghi) |
| `OLD` | UPDATE, DELETE | Dòng cũ |
| `TG_OP` | luôn có | `'INSERT'`, `'UPDATE'`, `'DELETE'` hoặc `'TRUNCATE'` |
| `TG_TABLE_NAME`, `TG_WHEN` | luôn có | Tên bảng, `'BEFORE'` hoặc `'AFTER'` |

Giá trị trả về quan trọng hơn bạn nghĩ:

| Loại trigger | Trả về | Hệ quả |
| --- | --- | --- |
| BEFORE ROW | `NEW` (có thể đã sửa) | Dòng được ghi với giá trị trong `NEW` |
| BEFORE ROW | `NULL` | Dòng bị **bỏ qua lặng lẽ**, không báo lỗi |
| AFTER ROW, mọi STATEMENT | bất kỳ (thường `NULL`) | Bị bỏ qua |

> **Ghi chú dialect:** MySQL viết thân trigger ngay trong `CREATE TRIGGER ... FOR EACH ROW BEGIN ... END` (cần `DELIMITER` khi gõ trong client) và chỉ có trigger mức dòng. SQL Server không có `BEFORE` và không có `FOR EACH ROW`: trigger chạy một lần mỗi câu lệnh, đọc các dòng thay đổi qua hai bảng ảo `inserted` và `deleted`. Code trigger vì vậy gần như không mang được từ hệ này sang hệ khác.

## 3. Một câu INSERT đi qua các trigger theo thứ tự nào?

Giả sử bảng `order_items` có đủ các loại trigger, và ta chèn hai dòng một lúc:

![Thứ tự chạy trigger quanh câu INSERT INTO order_items hai dòng. Đầu tiên BEFORE STATEMENT chạy một lần, chưa có NEW. Sau đó lặp cho từng dòng: BEFORE ROW (điền unit_price, được sửa NEW) rồi ghi dòng và kiểm tra NOT NULL, CHECK, khóa chính bằng giá trị cuối cùng của NEW. Sau khi ghi đủ các dòng, AFTER ROW chạy cho từng dòng (trừ stock_quantity, NEW chỉ đọc), cuối cùng AFTER STATEMENT chạy một lần và có thể đọc bảng chuyển tiếp. Lỗi ở bất kỳ bước nào, do RAISE EXCEPTION hay vi phạm ràng buộc, đều hủy cả câu INSERT, kể cả phần kho đã trừ cho dòng trước. BEFORE ROW trả về NEW thì dòng được ghi, trả về NULL thì dòng bị bỏ qua mà không báo lỗi.](../../../assets/img/luong-trigger-insert.png#gh-light-mode-only)
![Thứ tự chạy trigger quanh câu INSERT INTO order_items hai dòng. Đầu tiên BEFORE STATEMENT chạy một lần, chưa có NEW. Sau đó lặp cho từng dòng: BEFORE ROW (điền unit_price, được sửa NEW) rồi ghi dòng và kiểm tra NOT NULL, CHECK, khóa chính bằng giá trị cuối cùng của NEW. Sau khi ghi đủ các dòng, AFTER ROW chạy cho từng dòng (trừ stock_quantity, NEW chỉ đọc), cuối cùng AFTER STATEMENT chạy một lần và có thể đọc bảng chuyển tiếp. Lỗi ở bất kỳ bước nào, do RAISE EXCEPTION hay vi phạm ràng buộc, đều hủy cả câu INSERT, kể cả phần kho đã trừ cho dòng trước. BEFORE ROW trả về NEW thì dòng được ghi, trả về NULL thì dòng bị bỏ qua mà không báo lỗi.](../../../assets/img/luong-trigger-insert-dark.png#gh-dark-mode-only)

<small>File gốc: [nền sáng](../../../assets/diagrams/triggers/luong-trigger-insert.html) · [nền tối](../../../assets/diagrams/triggers/luong-trigger-insert-dark.html)</small>

Ba điều rút ra:

- BEFORE ROW chạy **trước** khi kiểm tra `NOT NULL` và `CHECK`, nên nó có thể điền giá trị cho cột `NOT NULL` mà người chèn bỏ trống. Mục 4 dùng đúng điều này.
- AFTER ROW chạy khi mọi dòng của câu lệnh đã được ghi. Khóa ngoại cũng được kiểm tra ở giai đoạn này.
- Trigger chạy **bên trong** transaction của câu lệnh. Trigger báo lỗi thì cả câu lệnh bị hủy (và transaction bị hủy, như Ngày 16).

Nếu một bảng có nhiều trigger cùng loại (cùng BEFORE ROW chẳng hạn), PostgreSQL chạy chúng theo **thứ tự tên trigger** (bảng chữ cái). Đặt tên có chủ đích nếu thứ tự quan trọng.

## 4. BEFORE ROW: tự điền giá và chặn sản phẩm không hợp lệ

Khi thêm dòng hàng, nhân viên hay quên ghi `unit_price`. Ta muốn: nếu bỏ trống thì lấy giá bán hiện tại trong `products.price`; sản phẩm không tồn tại hoặc đã ngừng kinh doanh thì từ chối với thông báo dễ hiểu.

```sql
CREATE OR REPLACE FUNCTION order_items_fill_price()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_price     NUMERIC(12,0);
    v_is_active BOOLEAN;
BEGIN
    SELECT price, is_active INTO v_price, v_is_active
    FROM products
    WHERE product_id = NEW.product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không có sản phẩm %', NEW.product_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF NOT v_is_active THEN
        RAISE EXCEPTION 'Sản phẩm % đã ngừng kinh doanh', NEW.product_id
            USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.unit_price IS NULL THEN
        NEW.unit_price := v_price;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_items_fill_price
BEFORE INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION order_items_fill_price();
```

Thêm chuột G102 vào đơn 40 mà không ghi giá:

```sql
INSERT INTO order_items (order_id, product_id, quantity)
VALUES (40, 16, 1)
RETURNING *;
```

| order_id | product_id | quantity | unit_price | discount |
| --- | --- | --- | --- | --- |
| 40 | 16 | 1 | 399000 | 0.00 |

Cột `unit_price` là `NOT NULL` nhưng câu INSERT vẫn chạy, vì trigger đã điền giá trước khi ràng buộc được kiểm tra. Ghi giá tay thì trigger giữ nguyên:

```sql
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES (40, 22, 1, 800000)
RETURNING *;
```

| order_id | product_id | quantity | unit_price | discount |
| --- | --- | --- | --- | --- |
| 40 | 22 | 1 | 800000 | 0.00 |

Sản phẩm sai:

```sql
INSERT INTO order_items (order_id, product_id, quantity) VALUES (40, 13, 1);   -- Nokia 105 4G, ngừng bán
INSERT INTO order_items (order_id, product_id, quantity) VALUES (40, 999, 1);  -- không tồn tại
```

```text
ERROR:  Sản phẩm 13 đã ngừng kinh doanh
CONTEXT:  PL/pgSQL function order_items_fill_price() line 15 at RAISE
ERROR:  Không có sản phẩm 999
CONTEXT:  PL/pgSQL function order_items_fill_price() line 11 at RAISE
```

Chú ý dòng `IF NOT FOUND`: không có nó, sản phẩm 999 làm `v_price` và `v_is_active` thành NULL, `IF NOT v_is_active` thành `IF NULL` và bị coi là sai, trigger cho qua (mục "Lỗi thường gặp").

Dọn hai dòng thử nghiệm trước khi sang mục sau:

```sql
DELETE FROM order_items WHERE order_id = 40 AND product_id IN (16, 22);
```

## 5. AFTER ROW: trừ tồn kho an toàn

Mỗi khi thêm dòng hàng, trừ `products.stock_quantity`. Bài cũ hay viết "đọc tồn kho, so sánh, rồi trừ". Như đã thấy ở Ngày 16, cách đó bán vượt kho khi hai đơn đến cùng lúc. Ta dùng lại đúng mẫu an toàn: **một câu UPDATE có điều kiện**, vừa khóa dòng vừa trừ, rồi kiểm tra `FOUND`.

```sql
CREATE OR REPLACE FUNCTION order_items_decrease_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE product_id = NEW.product_id
      AND stock_quantity >= NEW.quantity;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sản phẩm % không đủ hàng (cần %)', NEW.product_id, NEW.quantity
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NULL;   -- AFTER trigger: giá trị trả về bị bỏ qua
END;
$$;

CREATE TRIGGER trg_order_items_decrease_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION order_items_decrease_stock();
```

Vì sao đặt ở AFTER chứ không BEFORE? Ở AFTER, dòng hàng đã qua mọi kiểm tra (`CHECK (quantity > 0)`, khóa chính, ...). Ta chỉ trừ kho cho dòng chắc chắn được ghi.

Giờ đặt hàng chỉ cần tạo đơn và thêm dòng hàng. Giá và tồn kho do trigger lo. Như ở [Ngày 16](16-transactions-acid.md), `currval('orders_order_id_seq')` lấy id đơn vừa tạo trong phiên này thay vì gõ cứng số 41:

```sql
BEGIN;

INSERT INTO orders (customer_id, order_date, status, channel, shipping_city)
VALUES (16, '2026-10-17 09:00+07', 'pending', 'online', 'Cần Thơ')
RETURNING order_id;   -- 41 trên dữ liệu gốc

INSERT INTO order_items (order_id, product_id, quantity) VALUES
    (currval('orders_order_id_seq'), 16, 2),
    (currval('orders_order_id_seq'), 22, 1);

COMMIT;

SELECT oi.product_id, p.name, oi.quantity, oi.unit_price, p.stock_quantity
FROM order_items oi
JOIN products p ON p.product_id = oi.product_id
WHERE oi.order_id = currval('orders_order_id_seq')
ORDER BY oi.product_id;
```

| product_id | name | quantity | unit_price | stock_quantity |
| --- | --- | --- | --- | --- |
| 16 | Chuột Logitech G102 | 2 | 399000 | 58 |
| 22 | Sạc Anker 65W | 1 | 890000 | 39 |

Chèn hai dòng mà dòng thứ hai thiếu hàng (ASUS còn 5, Acer Nitro hết hàng):

```sql
INSERT INTO order_items (order_id, product_id, quantity) VALUES (currval('orders_order_id_seq'), 1, 1), (currval('orders_order_id_seq'), 3, 1);
```

```text
ERROR:  Sản phẩm 3 không đủ hàng (cần 1)
CONTEXT:  PL/pgSQL function order_items_decrease_stock() line 9 at RAISE
```

```sql
SELECT product_id, stock_quantity FROM products WHERE product_id IN (1, 3) ORDER BY product_id;
```

| product_id | stock_quantity |
| --- | --- |
| 1 | 5 |
| 3 | 0 |

ASUS vẫn là 5: phần trừ kho của dòng đầu đã bị hủy cùng cả câu INSERT.

Trigger này mới xử lý INSERT. Xóa dòng hàng hay sửa số lượng cũng phải cập nhật kho: đó là Bài 3, Bài 4 cuối bài.

## 6. Ghi lịch sử đổi giá (audit log)

Kế toán muốn biết giá từng sản phẩm đã thay đổi thế nào, ai đổi, lúc nào. Ta tạo một bảng log riêng (không đụng tới cấu trúc bảng shop):

```sql
DROP TABLE IF EXISTS product_price_log;

CREATE TABLE product_price_log (
    log_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id INT           NOT NULL,
    old_price  NUMERIC(12,0) NOT NULL,
    new_price  NUMERIC(12,0) NOT NULL,
    changed_by TEXT          NOT NULL DEFAULT current_user,
    changed_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION log_price_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO product_price_log (product_id, old_price, new_price)
    VALUES (OLD.product_id, OLD.price, NEW.price);
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_products_log_price
AFTER UPDATE OF price ON products
FOR EACH ROW
WHEN (OLD.price IS DISTINCT FROM NEW.price)
EXECUTE FUNCTION log_price_change();
```

Hai bộ lọc làm việc cùng nhau:

- `UPDATE OF price`: câu UPDATE không ghi vào cột `price` (ví dụ chỉ đổi tên) thì trigger không chạy.
- `WHEN (OLD.price IS DISTINCT FROM NEW.price)`: có ghi vào `price` nhưng giá trị không đổi thì cũng không log. `IS DISTINCT FROM` giống `<>` nhưng xử lý NULL đúng (NULL so với NULL là "không khác").

```sql
UPDATE products SET price = 23990000 WHERE product_id = 5;                       -- đổi giá: có log
UPDATE products SET name = 'MacBook Air M2 13 inch 2022' WHERE product_id = 5;  -- chỉ đổi tên: không log
UPDATE products SET price = 23990000 WHERE product_id = 5;                       -- giá như cũ: không log
UPDATE products SET price = ROUND(price * 1.05, -3) WHERE category_id = 10;      -- tăng 5% nhóm chuột, bàn phím

SELECT log_id, product_id, old_price, new_price, changed_by
FROM product_price_log
ORDER BY log_id;
```

| log_id | product_id | old_price | new_price | changed_by |
| --- | --- | --- | --- | --- |
| 1 | 5 | 24990000 | 23990000 | postgres |
| 2 | 16 | 399000 | 419000 | postgres |
| 3 | 17 | 2490000 | 2615000 | postgres |
| 4 | 18 | 1890000 | 1985000 | postgres |
| 5 | 24 | 250000 | 263000 | postgres |

Bốn câu UPDATE, nhưng chỉ những dòng thật sự đổi giá mới có log. Cột `changed_at` không in ở đây vì phụ thuộc lúc bạn chạy.

## 7. Chặn dữ liệu sai mà CHECK không làm được

Bảng `orders` có `CHECK (status IN (...))`, nhưng CHECK chỉ nhìn được **giá trị mới**, không biết giá trị cũ. Quy tắc "đơn đã giao (`delivered`) thì không được quay về `pending`" cần so sánh `OLD.status` với `NEW.status`, nên phải dùng trigger.

```sql
CREATE OR REPLACE FUNCTION orders_check_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT (
           (OLD.status = 'pending' AND NEW.status IN ('paid', 'cancelled'))
        OR (OLD.status = 'paid'    AND NEW.status IN ('shipped', 'cancelled'))
        OR (OLD.status = 'shipped' AND NEW.status = 'delivered')
    ) THEN
        RAISE EXCEPTION 'Đơn %: không được chuyển từ % sang %', OLD.order_id, OLD.status, NEW.status
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_check_status
BEFORE UPDATE OF status ON orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION orders_check_status();
```

```sql
UPDATE orders SET status = 'paid' WHERE order_id = 40;                         -- pending -> paid: được
UPDATE orders SET status = 'pending' WHERE order_id = 1;                       -- delivered -> pending: bị chặn
UPDATE orders SET status = 'cancelled' WHERE status IN ('paid', 'shipped');    -- có đơn shipped: bị chặn cả câu
UPDATE orders SET note = 'Khách gọi lại' WHERE order_id = 1;                   -- không đổi status: trigger không chạy
```

```text
UPDATE 1
ERROR:  Đơn 1: không được chuyển từ delivered sang pending
ERROR:  Đơn 37: không được chuyển từ shipped sang cancelled
UPDATE 1
```

```sql
SELECT order_id, status, note
FROM orders
WHERE order_id IN (1, 37, 38, 39, 40)
ORDER BY order_id;
```

| order_id | status | note |
| --- | --- | --- |
| 1 | delivered | Khách gọi lại |
| 37 | shipped | NULL |
| 38 | paid | NULL |
| 39 | paid | NULL |
| 40 | paid | NULL |

Câu thứ ba định hủy các đơn 37, 38, 39, 40. Chỉ cần đơn 37 vi phạm, cả câu bị hủy, nên đơn 38, 39 vẫn là `paid`.

So với procedure `update_order_status` ở Bài 5 Ngày 17: procedure chỉ bảo vệ khi người ta **chịu gọi nó**. Ai đó gõ thẳng `UPDATE orders SET status = ...` là qua mặt. Trigger thì chạy với mọi câu UPDATE, từ bất kỳ đâu. Đó là lý do chính đáng để dùng trigger.

## 8. FOR EACH STATEMENT và bảng chuyển tiếp

Trigger mức câu lệnh chạy **một lần** cho cả câu, hợp cho việc tổng kết. Để biết câu lệnh đã đổi những dòng nào, khai báo **bảng chuyển tiếp (transition table)** bằng `REFERENCING NEW TABLE AS ...` (và/hoặc `OLD TABLE`). Trong hàm, bảng này đọc như một bảng bình thường.

```sql
DROP TABLE IF EXISTS product_update_log;

CREATE TABLE product_update_log (
    log_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rows_changed INT         NOT NULL,
    changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION log_product_update_statement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO product_update_log (rows_changed)
    SELECT count(*) FROM new_rows;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_products_update_statement
AFTER UPDATE ON products
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION log_product_update_statement();
```

```sql
UPDATE products SET stock_quantity = stock_quantity + 10 WHERE category_id = 11;  -- 3 tai nghe, loa
UPDATE products SET stock_quantity = stock_quantity + 1 WHERE product_id = 999;   -- không trúng dòng nào

SELECT log_id, rows_changed FROM product_update_log ORDER BY log_id;
```

| log_id | rows_changed |
| --- | --- |
| 1 | 3 |
| 2 | 0 |

Câu thứ hai không sửa dòng nào nhưng trigger mức câu lệnh vẫn chạy. Với UPDATE 10.000 dòng, trigger mức dòng chạy 10.000 lần, trigger mức câu lệnh chạy 1 lần: khác biệt hiệu năng đáng kể.

## 9. Xem, tắt, xóa trigger

Trong psql, `\d products` liệt kê trigger ở cuối:

```text
Triggers:
    trg_products_log_price AFTER UPDATE OF price ON products FOR EACH ROW WHEN (old.price IS DISTINCT FROM new.price) EXECUTE FUNCTION log_price_change()
    trg_products_update_statement AFTER UPDATE ON products REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION log_product_update_statement()
```

Bằng SQL, xem bảng hệ thống `pg_trigger` (bỏ các trigger nội bộ PostgreSQL tạo cho khóa ngoại):

```sql
SELECT tgrelid::regclass AS bang, tgname, tgenabled
FROM pg_trigger
WHERE NOT tgisinternal
ORDER BY bang, tgname;
```

| bang | tgname | tgenabled |
| --- | --- | --- |
| products | trg_products_log_price | O |
| products | trg_products_update_statement | O |
| orders | trg_orders_check_status | O |
| order_items | trg_order_items_decrease_stock | O |
| order_items | trg_order_items_fill_price | O |

`O` là đang bật, `D` là đã tắt. Các lệnh quản lý:

```sql
ALTER TABLE products DISABLE TRIGGER trg_products_update_statement;  -- tạm tắt
ALTER TABLE products ENABLE TRIGGER trg_products_update_statement;   -- bật lại
DROP TRIGGER IF EXISTS trg_products_update_statement ON products;    -- xóa trigger
DROP FUNCTION IF EXISTS log_product_update_statement();              -- xóa hàm (khi không trigger nào dùng)
```

`DROP TRIGGER` phải ghi kèm `ON ten_bang`, vì tên trigger chỉ cần duy nhất trong một bảng.

## 10. Khi nào KHÔNG nên dùng trigger

Trigger mạnh nhưng có giá:

- **Logic ẩn.** Người đọc câu `INSERT INTO order_items` không thấy rằng kho bị trừ. Khi kho sai, rất khó lần ra.
- **Khó debug và test**, vì lỗi xuất hiện ở câu lệnh người khác viết.
- **Chậm khi ghi hàng loạt.** Trigger mức dòng chạy cho từng dòng; nhập 1 triệu dòng là 1 triệu lần gọi hàm.
- **Hiệu ứng dây chuyền.** Trigger sửa bảng khác, bảng đó lại có trigger... Một trigger sửa chính bảng của nó có thể tự gọi lại mình vô hạn.

Thứ tự ưu tiên khi muốn bảo vệ dữ liệu:

| Nhu cầu | Dùng | Không cần trigger vì |
| --- | --- | --- |
| Giá trị trong một dòng hợp lệ (`price >= 0`, `discount BETWEEN 0 AND 1`) | `CHECK` | CHECK đơn giản, nhanh, ai cũng thấy trong `\d` |
| Không xóa sản phẩm đã có trong đơn | Khóa ngoại (mặc định `NO ACTION`/`RESTRICT`) | DSC Shop đã có sẵn, xem ví dụ bên dưới |
| Giá trị mặc định | `DEFAULT` | |
| Nghiệp vụ nhiều bước mà ứng dụng chủ động gọi | Procedure (Ngày 17) | Rõ ràng, nằm ở một chỗ |
| Phải xảy ra với **mọi** thay đổi, kể cả gõ tay; so sánh cũ/mới; ghi log | Trigger | Đây mới là đất của trigger |

Ví dụ: muốn "cấm xóa sản phẩm đã bán", không cần viết trigger, khóa ngoại `order_items.product_id` đã chặn:

```sql
DELETE FROM products WHERE product_id = 1;
```

```text
ERROR:  update or delete on table "products" violates foreign key constraint "order_items_product_id_fkey" on table "order_items"
DETAIL:  Key (product_id)=(1) is still referenced from table "order_items".
```

## Lỗi thường gặp

**1. BEFORE trigger quên `RETURN`.** Trigger chuẩn hóa email:

```sql
CREATE OR REPLACE FUNCTION customers_normalize_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.email := lower(trim(NEW.email));
END;
$$;

CREATE TRIGGER trg_customers_normalize_email
BEFORE INSERT OR UPDATE OF email ON customers
FOR EACH ROW
EXECUTE FUNCTION customers_normalize_email();

INSERT INTO customers (full_name, email) VALUES ('Lê Thị Vy', '  Vy.Le@Gmail.COM ');
```

```text
ERROR:  control reached end of trigger procedure without RETURN
```

**2. BEFORE trigger trả `NULL`: dòng biến mất không một lời báo.** Sửa vội bằng `RETURN NULL;` còn tệ hơn:

```sql
CREATE OR REPLACE FUNCTION customers_normalize_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.email := lower(trim(NEW.email));
    RETURN NULL;
END;
$$;

INSERT INTO customers (full_name, email) VALUES ('Lê Thị Vy', '  Vy.Le@Gmail.COM ');
SELECT count(*) FROM customers WHERE full_name = 'Lê Thị Vy';
```

```text
INSERT 0 0
```

| count |
| --- |
| 0 |

`INSERT 0 0`: không lỗi, không có dòng nào. Đúng: `RETURN NEW;` (Bài 1). Dọn dẹp trước khi đi tiếp:

```sql
DROP TRIGGER IF EXISTS trg_customers_normalize_email ON customers;
DROP FUNCTION IF EXISTS customers_normalize_email();
```

**3. So sánh với NULL khi không tìm thấy dòng.** Kiểu viết hay gặp trong bài cũ:

```text
SELECT stock_quantity INTO v_stock FROM products WHERE product_id = NEW.product_id;
IF v_stock < NEW.quantity THEN RAISE EXCEPTION ...; END IF;
```

Sản phẩm không tồn tại thì `v_stock` là NULL, `NULL < 1` ra NULL, `IF` coi là sai và cho qua:

```sql
SELECT (SELECT stock_quantity FROM products WHERE product_id = 999) < 2 AS het_hang;
```

| het_hang |
| --- |
| NULL |

Đúng: kiểm tra `IF NOT FOUND` ngay sau `SELECT ... INTO` như mục 4. Thêm nữa, mẫu "đọc rồi so sánh rồi trừ" còn bị race condition; dùng UPDATE có điều kiện như mục 5.

**4. Trừ kho hai lần.** Trigger ở mục 5 đã trừ kho. Nếu ứng dụng vẫn gọi procedure `place_order` của Ngày 17 (vốn cũng tự trừ kho), mỗi đơn bị trừ gấp đôi (Bài 7). Mỗi quy tắc nghiệp vụ chỉ nên nằm **một chỗ**: hoặc trigger, hoặc procedure.

**5. Sửa `NEW` trong AFTER trigger.** Không có tác dụng, dòng đã được ghi rồi. Muốn sửa giá trị sắp ghi, dùng BEFORE.

**6. Viết trigger cho việc ràng buộc đã làm** (cấm xóa sản phẩm đã bán, cấm giá âm). Xem mục 10.

## Bài tập

Phần bài tập của bài này nằm ở bài tập **Bài tập: Trigger** ngay sau bài học.

## Tóm tắt

- Trigger trong PostgreSQL = trigger function (`RETURNS trigger`) + `CREATE TRIGGER ... EXECUTE FUNCTION` gắn vào bảng.
- BEFORE ROW sửa được `NEW` và chạy trước khi kiểm tra `NOT NULL`/`CHECK`; trả `NEW` để ghi, trả `NULL` là bỏ dòng. AFTER ROW chạy khi dòng đã ghi, hợp để cập nhật bảng khác và ghi log.
- FOR EACH STATEMENT chạy một lần mỗi câu lệnh; dùng bảng chuyển tiếp (`REFERENCING ... TABLE`) để xem các dòng đã đổi.
- `UPDATE OF cot` và `WHEN (...)` giúp trigger chỉ chạy khi thật sự cần.
- Lỗi trong trigger hủy cả câu lệnh. Trừ kho trong trigger vẫn phải dùng UPDATE có điều kiện để an toàn khi nhiều người mua cùng lúc.
- Ưu tiên `CHECK`, khóa ngoại, `DEFAULT`, procedure; chỉ dùng trigger cho việc phải xảy ra với mọi thay đổi hoặc cần so sánh cũ/mới. Mỗi quy tắc chỉ đặt một chỗ.

## Đọc thêm

- Tài liệu PostgreSQL: [CREATE TRIGGER](https://www.postgresql.org/docs/16/sql-createtrigger.html), [Trigger Functions trong PL/pgSQL](https://www.postgresql.org/docs/16/plpgsql-trigger.html), [Overview of Trigger Behavior](https://www.postgresql.org/docs/16/trigger-definition.html).
