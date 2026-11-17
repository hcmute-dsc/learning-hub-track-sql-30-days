> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

### Cơ bản

**Bài 1.** Kết nối vào `sql_challenge` bằng `psql`, kiểm tra bạn đang kết nối tới database nào và phiên bản PostgreSQL là bao nhiêu.

<details>
<summary>Đáp án</summary>

```sql
\conninfo
SELECT version();
```

Kết quả: `\conninfo` in dòng `You are connected to database "sql_challenge" as user "postgres" ...`; `SELECT version();` trả về một dòng bắt đầu bằng `PostgreSQL 16`.
</details>

**Bài 2.** Xem cấu trúc bảng `products`. Trả lời: (a) cột giá bán tên gì, kiểu gì; (b) những cột nào được phép để trống (NULL); (c) cột nào không được trùng giá trị giữa các sản phẩm.

<details>
<summary>Đáp án</summary>

```sql
\d products
```

Kết quả:

```text
                                      Table "shop.products"
     Column     |           Type           | Collation | Nullable |           Default
----------------+--------------------------+-----------+----------+------------------------------
 product_id     | integer                  |           | not null | generated always as identity
 sku            | character varying(20)    |           | not null |
 name           | character varying(200)   |           | not null |
 category_id    | integer                  |           | not null |
 price          | numeric(12,0)            |           | not null |
 cost_price     | numeric(12,0)            |           |          |
 stock_quantity | integer                  |           | not null | 0
 attributes     | jsonb                    |           |          |
 is_active      | boolean                  |           | not null | true
 created_at     | timestamp with time zone |           | not null | now()
Indexes:
    "products_pkey" PRIMARY KEY, btree (product_id)
    "products_category_id_idx" btree (category_id)
    "products_sku_key" UNIQUE CONSTRAINT, btree (sku)
Check constraints:
    "products_cost_price_check" CHECK (cost_price >= 0::numeric)
    "products_price_check" CHECK (price >= 0::numeric)
    "products_stock_quantity_check" CHECK (stock_quantity >= 0)
Foreign-key constraints:
    "products_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(category_id)
Referenced by:
    TABLE "order_items" CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(product_id)
```

(a) `price`, kiểu `numeric(12,0)`. (b) `cost_price` và `attributes` (cột `Nullable` để trống). (c) `sku` (có `UNIQUE CONSTRAINT`), và tất nhiên cả khóa chính `product_id`.
</details>

**Bài 3.** Liệt kê họ tên, chức danh và ngày vào làm của mọi nhân viên.

<details>
<summary>Đáp án</summary>

```sql
SELECT full_name, title, hire_date FROM employees;
```

Kết quả:

| full_name | title | hire_date |
| --- | --- | --- |
| Nguyễn Thành Long | Giám đốc | 2020-01-15 |
| Lê Thị Hạnh | Trưởng phòng Kinh doanh | 2021-03-01 |
| Trần Quốc Bảo | Trưởng phòng Kỹ thuật | 2021-06-15 |
| Phạm Thị Thu | Nhân viên bán hàng | 2022-02-10 |
| Đỗ Minh Tuấn | Nhân viên bán hàng | 2023-07-01 |
| Vũ Hoài Nam | Nhân viên bán hàng | 2024-09-01 |
| Lâm Gia Huy | Kỹ thuật viên | 2022-11-20 |
| Kiều Anh Thư | Thực tập sinh bán hàng | 2026-06-01 |
</details>

### Vận dụng

**Bài 4.** Xem tên, giá bán và số lượng tồn kho của mọi sản phẩm. Nhìn kết quả và cho biết có bao nhiêu sản phẩm đang hết hàng (tồn kho bằng 0).

<details>
<summary>Đáp án</summary>

```sql
SELECT name, price, stock_quantity FROM products;
```

Kết quả (vài dòng đầu):

| name | price | stock_quantity |
| --- | --- | --- |
| ASUS ROG Strix G16 | 32990000 | 5 |
| Lenovo Legion 5 | 29990000 | 3 |
| Acer Nitro V 15 | 21990000 | 0 |
| Dell Inspiron 14 | 18490000 | 8 |
| MacBook Air M2 13 inch | 24990000 | 6 |

(... tổng 24 dòng)

Có 3 sản phẩm hết hàng: `Acer Nitro V 15`, `Nokia 105 4G`, `Loa JBL Flip 6`. Đếm bằng mắt chỉ ổn với 24 dòng; Ngày 3 bạn sẽ dùng `WHERE stock_quantity = 0` để lọc, Ngày 8 dùng `COUNT` để đếm.
</details>

**Bài 5.** Chạy `SELECT * FROM categories;` (kết quả có ở mục [Câu SELECT đầu tiên](../../lessons/01-intro-to-sql-and-dbms.md#câu-select-đầu-tiên) của bài học), rồi vẽ cây danh mục ra giấy. Danh mục nào là gốc (không có cha)? `Laptop gaming` nằm dưới những danh mục nào?

<details>
<summary>Đáp án</summary>

Bốn danh mục gốc có `parent_id` là NULL: `Máy tính` (1), `Điện thoại & Tablet` (6), `Phụ kiện` (9), `Thiết bị mạng` (13). `Laptop gaming` (3) có cha là `Laptop` (2), và `Laptop` có cha là `Máy tính` (1): `Máy tính` > `Laptop` > `Laptop gaming`. Ngày 29 bạn sẽ viết truy vấn đệ quy để máy tự đi theo cây này.
</details>

**Bài 6.** Xếp mỗi câu lệnh sau vào nhóm DDL, DML, DCL hoặc TCL:
`DROP TABLE carts;` · `UPDATE products SET price = 0;` · `COMMIT;` · `GRANT SELECT ON customers TO intern;` · `ALTER TABLE customers ADD COLUMN gender TEXT;` · `SELECT * FROM orders;`

<details>
<summary>Đáp án</summary>

| Câu lệnh | Nhóm |
| --- | --- |
| `DROP TABLE carts;` | DDL |
| `UPDATE products SET price = 0;` | DML |
| `COMMIT;` | TCL |
| `GRANT SELECT ON customers TO intern;` | DCL |
| `ALTER TABLE customers ADD COLUMN gender TEXT;` | DDL |
| `SELECT * FROM orders;` | DML (hoặc DQL theo cách chia tách riêng) |

Bài này chỉ phân loại, đừng chạy các câu lệnh trên vào database.
</details>

### Thử thách

**Bài 7.** Dùng lệnh meta để tìm: bảng nào trỏ tới bảng `orders` qua khóa ngoại, và khi xóa một đơn hàng thì bảng nào được cấu hình để tự xóa các dòng liên quan? (Gợi ý: xem phần "Referenced by".)

<details>
<summary>Đáp án</summary>

```sql
\d orders
```

Phần cuối của kết quả:

```text
Referenced by:
    TABLE "order_items" CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
    TABLE "payments" CONSTRAINT "payments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(order_id)
```

Hai bảng `order_items` và `payments` trỏ tới `orders`. Chỉ `order_items` có `ON DELETE CASCADE`: xóa đơn thì các dòng hàng của đơn bị xóa theo. Ngày 2 giải thích vì sao `payments` không được thiết kế như vậy.
</details>

**Bài 8.** Mở Adminer (<http://localhost:8080>), đăng nhập vào `sql_challenge`, chọn schema `shop` và xem dữ liệu bảng `payments`. Sau đó vào "SQL command", chạy câu lệnh lấy mã đơn, số tiền và phương thức thanh toán của mọi lần thanh toán. So sánh số dòng với bảng tổng quan ở mục [Khám phá DSC Shop](../../lessons/01-intro-to-sql-and-dbms.md#khám-phá-dsc-shop) của bài học.

<details>
<summary>Đáp án</summary>

```sql
SELECT order_id, amount, method FROM payments;
```

Kết quả: 37 dòng, khớp với bảng tổng quan. Ba dòng đầu:

| order_id | amount | method |
| --- | --- | --- |
| 1 | 699000 | momo |
| 2 | 26990000 | cash |
| 3 | 5780000 | bank_transfer |

(... tổng 37 dòng)
</details>
