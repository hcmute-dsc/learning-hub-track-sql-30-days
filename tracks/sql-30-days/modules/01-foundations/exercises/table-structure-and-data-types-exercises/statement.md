> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Tất cả bài tập làm trong schema `nhap` (tạo bằng khối "Khu vực nháp" ở đầu bài học, chạy một lần). Nếu vừa mở phiên mới, chỉ chạy lại `SET search_path = nhap, shop, public;` (đừng chạy `DROP SCHEMA`, sẽ mất các bảng đã tạo ở bài trước).

### Cơ bản

**Bài 1.** Chọn kiểu dữ liệu PostgreSQL cho từng cột của bảng `employees` sắp mở rộng: (a) lương tháng (VNĐ); (b) ngày vào làm; (c) thời điểm nhân viên đăng nhập gần nhất; (d) còn đang làm việc hay không; (e) giới thiệu bản thân, dài tùy ý; (f) mã số thuế cá nhân, 10 hoặc 13 chữ số.

<details>
<summary>Đáp án</summary>

| Cột | Kiểu | Lý do |
| --- | --- | --- |
| (a) lương | `NUMERIC(12,0)` | Tiền, phải chính xác (`employees.salary` của DSC Shop dùng đúng kiểu này) |
| (b) ngày vào làm | `DATE` | Chỉ cần ngày |
| (c) lần đăng nhập gần nhất | `TIMESTAMPTZ` | Một thời điểm sự kiện |
| (d) đang làm việc | `BOOLEAN` | Chỉ có đúng/sai |
| (e) giới thiệu | `TEXT` | Nội dung tự do, không cần giới hạn |
| (f) mã số thuế | `VARCHAR(13)` | Là mã, không dùng để tính toán; lưu dạng số sẽ mất số 0 ở đầu |
</details>

**Bài 2.** Xem cấu trúc bảng `payments` và trả lời: (a) phương thức thanh toán nhận những giá trị nào; (b) có ghi được một khoản thanh toán số tiền 0 không; (c) xóa một đơn hàng đã có thanh toán thì chuyện gì xảy ra?

<details>
<summary>Đáp án</summary>

```sql
\d payments
```

```text
                                    Table "shop.payments"
   Column   |           Type           | Collation | Nullable |           Default
------------+--------------------------+-----------+----------+------------------------------
 payment_id | integer                  |           | not null | generated always as identity
 order_id   | integer                  |           | not null |
 amount     | numeric(12,0)            |           | not null |
 method     | character varying(20)    |           | not null |
 paid_at    | timestamp with time zone |           | not null |
Indexes:
    "payments_pkey" PRIMARY KEY, btree (payment_id)
    "payments_order_id_idx" btree (order_id)
Check constraints:
    "payments_amount_check" CHECK (amount > 0::numeric)
    "payments_method_check" CHECK (method::text = ANY (ARRAY['cash'::character varying, 'card'::character varying, 'momo'::character varying, 'bank_transfer'::character varying]::text[]))
Foreign-key constraints:
    "payments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(order_id)
```

(a) `cash`, `card`, `momo`, `bank_transfer`. (b) Không, `amount > 0`. (c) Khóa ngoại `payments_order_id_fkey` không ghi `ON DELETE` nên là `NO ACTION`: lệnh xóa đơn bị từ chối (Bài 8 thử thật).
</details>

**Bài 3.** Tạo bảng `suppliers` (nhà cung cấp) gồm: mã tự tăng làm khóa chính; tên (bắt buộc, tối đa 150 ký tự); mã số thuế (bắt buộc, không trùng, tối đa 13 ký tự); email (không trùng, được để trống); thành phố; trạng thái hoạt động (mặc định đang hoạt động); thời điểm tạo (mặc định là lúc thêm). Thêm hai nhà cung cấp, một có đủ thông tin, một chỉ có tên và mã số thuế, rồi xem lại bảng.

<details>
<summary>Đáp án</summary>

```sql
CREATE TABLE suppliers (
    supplier_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    tax_code    VARCHAR(13)  NOT NULL UNIQUE,
    email       VARCHAR(255) UNIQUE,
    city        VARCHAR(100),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
INSERT INTO suppliers (name, tax_code, email, city)
VALUES ('Công ty Phân phối Số Việt', '0301234567', 'sales@sovietdist.vn', 'TP. Hồ Chí Minh');
INSERT INTO suppliers (name, tax_code)
VALUES ('Nhà phân phối Linh Kiện Xanh', '0109876543');
SELECT supplier_id, name, tax_code, email, city, is_active FROM suppliers;
```

Kết quả:

| supplier_id | name | tax_code | email | city | is_active |
| --- | --- | --- | --- | --- | --- |
| 1 | Công ty Phân phối Số Việt | 0301234567 | sales@sovietdist.vn | TP. Hồ Chí Minh | t |
| 2 | Nhà phân phối Linh Kiện Xanh | 0109876543 | | | t |
</details>

### Vận dụng

**Bài 4.** Sửa bảng `suppliers` ở Bài 3: thêm cột số điện thoại (tối đa 20 ký tự) và đặt ràng buộc không trùng tên `suppliers_phone_key` cho nó; đổi tên cột `name` thành `supplier_name`; đặt thành phố mặc định là `TP. Hồ Chí Minh`. Kiểm tra bằng `\d`.

<details>
<summary>Đáp án</summary>

```sql
ALTER TABLE suppliers ADD COLUMN phone VARCHAR(20);
ALTER TABLE suppliers ADD CONSTRAINT suppliers_phone_key UNIQUE (phone);
ALTER TABLE suppliers RENAME COLUMN name TO supplier_name;
ALTER TABLE suppliers ALTER COLUMN city SET DEFAULT 'TP. Hồ Chí Minh';
\d suppliers
```

Kết quả:

```text
                                         Table "nhap.suppliers"
    Column     |           Type           | Collation | Nullable |               Default
---------------+--------------------------+-----------+----------+--------------------------------------
 supplier_id   | integer                  |           | not null | generated always as identity
 supplier_name | character varying(150)   |           | not null |
 tax_code      | character varying(13)    |           | not null |
 email         | character varying(255)   |           |          |
 city          | character varying(100)   |           |          | 'TP. Hồ Chí Minh'::character varying
 is_active     | boolean                  |           | not null | true
 created_at    | timestamp with time zone |           | not null | now()
 phone         | character varying(20)    |           |          |
Indexes:
    "suppliers_pkey" PRIMARY KEY, btree (supplier_id)
    "suppliers_email_key" UNIQUE CONSTRAINT, btree (email)
    "suppliers_phone_key" UNIQUE CONSTRAINT, btree (phone)
    "suppliers_tax_code_key" UNIQUE CONSTRAINT, btree (tax_code)
```

Đặt `DEFAULT` mới không làm thay đổi các dòng đã có: nhà cung cấp số 2 vẫn có `city` là NULL. `DEFAULT` chỉ áp dụng cho các lần `INSERT` sau.
</details>

**Bài 5.** Tạo bảng `product_reviews` (đánh giá sản phẩm của khách DSC Shop): mã tự tăng; sản phẩm và khách hàng (bắt buộc, là khóa ngoại tới `shop.products` và `shop.customers`); số sao từ 1 đến 5 (dùng `SMALLINT`); bình luận; thời điểm tạo. Mỗi khách chỉ được đánh giá mỗi sản phẩm một lần. Sau đó thử bốn lệnh: khách 1 đánh giá iPhone 15 (product 10) 5 sao kèm bình luận "Máy đẹp, pin ổn"; khách 2 đánh giá sản phẩm 10 với 6 sao; khách 1 đánh giá lại sản phẩm 10 với 4 sao; khách 1 đánh giá sản phẩm 99. Lệnh nào thành công, lệnh nào lỗi, vì sao?

<details>
<summary>Đáp án</summary>

```sql
CREATE TABLE product_reviews (
    review_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id  INT         NOT NULL REFERENCES shop.products (product_id),
    customer_id INT         NOT NULL REFERENCES shop.customers (customer_id),
    rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (product_id, customer_id)
);
INSERT INTO product_reviews (product_id, customer_id, rating, comment)
VALUES (10, 1, 5, 'Máy đẹp, pin ổn');
INSERT INTO product_reviews (product_id, customer_id, rating)
VALUES (10, 2, 6);
INSERT INTO product_reviews (product_id, customer_id, rating)
VALUES (10, 1, 4);
INSERT INTO product_reviews (product_id, customer_id, rating)
VALUES (99, 1, 4);
SELECT review_id, product_id, customer_id, rating, comment FROM product_reviews;
```

Kết quả: lệnh 1 thành công. Ba lệnh sau lỗi:

```text
ERROR:  new row for relation "product_reviews" violates check constraint "product_reviews_rating_check"
DETAIL:  Failing row contains (2, 10, 2, 6, null, 2026-10-17 16:11:54.227054+07).
ERROR:  duplicate key value violates unique constraint "product_reviews_product_id_customer_id_key"
DETAIL:  Key (product_id, customer_id)=(10, 1) already exists.
ERROR:  insert or update on table "product_reviews" violates foreign key constraint "product_reviews_product_id_fkey"
DETAIL:  Key (product_id)=(99) is not present in table "products".
```

| review_id | product_id | customer_id | rating | comment |
| --- | --- | --- | --- | --- |
| 1 | 10 | 1 | 5 | Máy đẹp, pin ổn |

Lệnh 2 vi phạm `CHECK` (6 sao), lệnh 3 vi phạm `UNIQUE (product_id, customer_id)`, lệnh 4 vi phạm khóa ngoại (không có sản phẩm 99).
</details>

**Bài 6.** Không chạy, hãy dự đoán kết quả của từng biểu thức, rồi chạy để kiểm tra: `18490000.5::NUMERIC(12,0)`, `0.075::NUMERIC(3,2)`, `1::NUMERIC(3,2)`, `10::NUMERIC(3,2)`. Biểu thức cuối cho biết điều gì về cột `order_items.discount`?

<details>
<summary>Đáp án</summary>

```sql
SELECT 18490000.5::NUMERIC(12,0) AS a,
       0.075::NUMERIC(3,2)       AS b,
       1::NUMERIC(3,2)           AS c;
```

| a | b | c |
| --- | --- | --- |
| 18490001 | 0.08 | 1.00 |

```sql
SELECT 10::NUMERIC(3,2);
```

```text
ERROR:  numeric field overflow
DETAIL:  A field with precision 3, scale 2 must round to an absolute value less than 10^1.
```

`NUMERIC` làm tròn nửa lên (`.5` thành 1), và luôn hiển thị đủ `s` chữ số lẻ (`1.00`). `NUMERIC(3,2)` không chứa nổi 10, nên nếu ai đó nhầm nhập `discount` là phần trăm (`10` thay vì `0.10`) thì bị chặn ngay ở kiểu dữ liệu; còn `CHECK (discount BETWEEN 0 AND 1)` chặn các giá trị từ 1.01 đến 9.99.
</details>

### Thử thách

**Bài 7.** Thiết kế bảng `shipments` (vận chuyển) cho đơn hàng DSC Shop:

- Mỗi đơn có tối đa một lần giao; xóa đơn thì thông tin giao hàng của đơn cũng mất.
- Đơn vị vận chuyển chỉ nhận `GHN`, `GHTK`, `ViettelPost`.
- Phí giao (VNĐ) không âm, mặc định 0.
- Thời điểm gửi hàng bắt buộc; thời điểm giao xong có thể chưa có, nhưng nếu có thì không được sớm hơn lúc gửi.

Thử thêm: đơn 1 gửi bằng GHN lúc `2025-01-13 09:00+07`, giao xong `2025-01-15 16:00+07`, phí 30.000; đơn 2 gửi bằng GHTK lúc `2025-01-21 08:00+07`, chưa giao xong; đơn 3 gửi lúc `2025-02-04 08:00+07` nhưng giao xong `2025-02-02 08:00+07`; đơn 1 gửi thêm lần nữa bằng GHTK.

<details>
<summary>Đáp án</summary>

```sql
CREATE TABLE shipments (
    shipment_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id     INT           NOT NULL UNIQUE
                 REFERENCES shop.orders (order_id) ON DELETE CASCADE,
    carrier      VARCHAR(20)   NOT NULL
                 CHECK (carrier IN ('GHN', 'GHTK', 'ViettelPost')),
    fee          NUMERIC(12,0) NOT NULL DEFAULT 0 CHECK (fee >= 0),
    shipped_at   TIMESTAMPTZ   NOT NULL,
    delivered_at TIMESTAMPTZ,
    CHECK (delivered_at >= shipped_at)
);
INSERT INTO shipments (order_id, carrier, fee, shipped_at, delivered_at)
VALUES (1, 'GHN', 30000, '2025-01-13 09:00+07', '2025-01-15 16:00+07');
INSERT INTO shipments (order_id, carrier, shipped_at)
VALUES (2, 'GHTK', '2025-01-21 08:00+07');
INSERT INTO shipments (order_id, carrier, shipped_at, delivered_at)
VALUES (3, 'GHN', '2025-02-04 08:00+07', '2025-02-02 08:00+07');
INSERT INTO shipments (order_id, carrier, shipped_at)
VALUES (1, 'GHTK', '2025-01-14 08:00+07');
SELECT shipment_id, order_id, carrier, fee, shipped_at, delivered_at FROM shipments;
```

Hai lệnh cuối lỗi:

```text
ERROR:  new row for relation "shipments" violates check constraint "shipments_check"
DETAIL:  Failing row contains (3, 3, GHN, 0, 2025-02-04 08:00:00+07, 2025-02-02 08:00:00+07).
ERROR:  duplicate key value violates unique constraint "shipments_order_id_key"
DETAIL:  Key (order_id)=(1) already exists.
```

| shipment_id | order_id | carrier | fee | shipped_at | delivered_at |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | GHN | 30000 | 2025-01-13 09:00:00+07 | 2025-01-15 16:00:00+07 |
| 2 | 2 | GHTK | 0 | 2025-01-21 08:00:00+07 | |

Các điểm mấu chốt:

- `UNIQUE` trên `order_id` biến quan hệ thành 1-1: mỗi đơn tối đa một lần giao.
- `CHECK (delivered_at >= shipped_at)` là ràng buộc **cấp bảng** vì liên quan hai cột, viết sau danh sách cột.
- Đơn 2 có `delivered_at` là NULL, điều kiện `NULL >= shipped_at` cho kết quả không xác định, và `CHECK` vẫn nhận dòng. Ở đây đó đúng là điều ta muốn (chưa giao xong), nhưng hãy nhớ hiện tượng này: `CHECK` không thay được `NOT NULL`. Ngày 3 giải thích logic ba trị đứng sau.
</details>

**Bài 8.** `order_items` và `payments` đều trỏ tới `orders`, nhưng chỉ `order_items` có `ON DELETE CASCADE`. Thử xóa đơn 1 trong một transaction rồi hủy (`BEGIN ... ROLLBACK`, để chắc chắn không mất dữ liệu). Chuyện gì xảy ra với các dòng `order_items` của đơn 1? Vì sao thiết kế này hợp lý?

<details>
<summary>Đáp án</summary>

```sql
BEGIN;
DELETE FROM shop.orders WHERE order_id = 1;
ROLLBACK;
```

```text
ERROR:  update or delete on table "orders" violates foreign key constraint "payments_order_id_fkey" on table "payments"
DETAIL:  Key (order_id)=(1) is still referenced from table "payments".
```

Đơn 1 đã có thanh toán, khóa ngoại `payments_order_id_fkey` (`NO ACTION`) chặn lệnh xóa. Cả câu lệnh thất bại, nên các dòng `order_items` của đơn 1 **cũng không bị xóa**: `CASCADE` chỉ chạy khi việc xóa dòng cha thành công. Một câu lệnh hoặc thành công trọn vẹn, hoặc không thay đổi gì.

Thiết kế hợp lý vì dòng hàng chỉ là chi tiết của đơn, nên đi cùng đơn. Còn thanh toán là tiền thật đã thu: database buộc người dùng xử lý thanh toán (hoàn tiền, ghi nhận) trước, thay vì để một lệnh xóa đơn làm biến mất dấu vết kế toán. Thực tế các cửa hàng thường không xóa đơn mà chuyển `status` thành `cancelled`.
</details>

### Dọn dẹp

Xong bài, xóa toàn bộ khu vực nháp và đưa `search_path` về mặc định:

```sql
DROP SCHEMA nhap CASCADE;
RESET search_path;
```
