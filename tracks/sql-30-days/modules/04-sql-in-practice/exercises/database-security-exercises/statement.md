> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Chạy lại hai file init trước khi làm. Các role tạo trong bài tập nhớ dọn bằng `DROP OWNED BY ...; DROP ROLE ...;` khi xong.

### Cơ bản

**Bài 1.** Tạo nhóm `catalog_reader` chỉ được đọc `categories` và `products`, và user `intern_user` (đăng nhập được, mật khẩu tùy bạn) thuộc nhóm đó. Dùng `SET ROLE` để chứng minh: đọc được số sản phẩm đang hết hàng, nhưng không đọc được `orders`.

<details>
<summary>Đáp án</summary>

```sql
CREATE ROLE catalog_reader NOLOGIN;
CREATE ROLE intern_user LOGIN PASSWORD 'Thuc-tap#2026';
GRANT catalog_reader TO intern_user;
GRANT CONNECT ON DATABASE sql_challenge TO catalog_reader;
GRANT USAGE ON SCHEMA shop TO catalog_reader;
GRANT SELECT ON categories, products TO catalog_reader;

SET ROLE intern_user;
SELECT count(*) AS het_hang FROM products WHERE stock_quantity = 0;
RESET ROLE;
```

| het_hang |
| --- |
| 3 |

```sql
SET ROLE intern_user;
SELECT count(*) FROM orders;
RESET ROLE;
```

```text
ERROR:  permission denied for table orders
```
</details>

**Bài 2.** Kế toán cần đọc toàn bộ bảng `payments` và chỉ hai cột `order_id`, `status` của `orders`. Tạo role `accountant` (NOLOGIN) với đúng các quyền đó, rồi dùng `has_table_privilege` / `has_column_privilege` kiểm tra: đọc `payments` được, đọc `orders.status` được, đọc `orders.customer_id` không được.

<details>
<summary>Đáp án</summary>

```sql
CREATE ROLE accountant NOLOGIN;
GRANT USAGE ON SCHEMA shop TO accountant;
GRANT SELECT ON payments TO accountant;
GRANT SELECT (order_id, status) ON orders TO accountant;

SELECT has_table_privilege('accountant', 'shop.payments', 'SELECT')                AS payments,
       has_column_privilege('accountant', 'shop.orders', 'status', 'SELECT')       AS orders_status,
       has_column_privilege('accountant', 'shop.orders', 'customer_id', 'SELECT')  AS orders_customer;
```

| payments | orders_status | orders_customer |
| --- | --- | --- |
| t | t | f |
</details>

**Bài 3.** Thu hồi quyền đọc `products` của nhóm `catalog_reader` ở Bài 1, kiểm tra lại bằng `SET ROLE`, sau đó dọn hết role đã tạo ở Bài 1 và Bài 2.

<details>
<summary>Đáp án</summary>

```sql
REVOKE SELECT ON products FROM catalog_reader;

SET ROLE intern_user;
SELECT count(*) FROM products;
RESET ROLE;
```

```text
ERROR:  permission denied for table products
```

```sql
DROP OWNED BY catalog_reader, intern_user, accountant;
DROP ROLE intern_user, catalog_reader, accountant;
```
</details>

### Vận dụng

**Bài 4.** Đoạn Node.js sau xem chi tiết đơn hàng theo id lấy từ URL. Viết một giá trị `id` khiến API trả về mọi dòng hàng của mọi đơn, giải thích vì sao, rồi sửa lại.

```js
app.get('/orders/:id/items', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT product_id, quantity, unit_price FROM order_items WHERE order_id = ' + req.params.id
  );
  res.json(rows);
});
```

<details>
<summary>Đáp án</summary>

Gọi `/orders/0%20OR%201=1/items` (dấu cách mã hóa thành `%20` trong URL). `req.params.id` là `0 OR 1=1`, câu SQL thành:

```sql
SELECT product_id, quantity, unit_price FROM order_items WHERE order_id = 0 OR 1=1;
```

Ở đây không cần dấu nháy vì giá trị là số: ghép số vào SQL cũng nguy hiểm như ghép chuỗi. Truy vấn trả về đủ 60 dòng hàng. Sửa:

```js
app.get('/orders/:id/items', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT product_id, quantity, unit_price FROM order_items WHERE order_id = $1 ORDER BY product_id',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err); // id không phải số => lỗi 22P02, middleware trả 400
  }
});
```

Với `id = "0 OR 1=1"`, PostgreSQL báo `invalid input syntax for type integer: "0 OR 1=1"` thay vì chạy câu lệnh.
</details>

**Bài 5.** Dùng pgcrypto, viết function `check_login(p_username TEXT, p_password TEXT) RETURNS BOOLEAN` trả `true` khi đúng tên và mật khẩu. Tạo bảng `app_users` như trong bài, đăng ký `binh` / `matkhau123`, rồi thử: đúng mật khẩu, sai mật khẩu, tên không tồn tại, và tên là `binh' --`.

<details>
<summary>Đáp án</summary>

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS app_users;
CREATE TABLE app_users (
    user_id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username      VARCHAR(50) NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL
);
INSERT INTO app_users (username, password_hash)
VALUES ('binh', crypt('matkhau123', gen_salt('bf', 10)));

CREATE OR REPLACE FUNCTION check_login(p_username TEXT, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE sql AS $$
    SELECT EXISTS (
        SELECT 1
        FROM app_users
        WHERE username = p_username
          AND password_hash = crypt(p_password, password_hash)
    );
$$;

SELECT check_login('binh', 'matkhau123')  AS dung,
       check_login('binh', 'sai')         AS sai_mat_khau,
       check_login('khong-co', 'x')       AS khong_co_user,
       check_login('binh'' --', 'x')      AS thu_injection;
```

| dung | sai_mat_khau | khong_co_user | thu_injection |
| --- | --- | --- | --- |
| t | f | f | f |

Tham số của function là giá trị, không phải đoạn code, nên `binh' --` chỉ là một tên đăng nhập lạ. Nếu ứng dụng ghép chuỗi kiểu `"... WHERE username = '" + u + "' AND password_hash = crypt('" + p + "', password_hash)"` thì với `u = "binh' --"`, phần kiểm tra mật khẩu bị biến thành chú thích và kẻ tấn công đăng nhập được tài khoản `binh` mà không cần mật khẩu.

Lưu ý: `check_login` chỉ đúng với hash có prefix `$2a$` (do pgcrypto sinh). Hash `$2b$` mà thư viện bcrypt của Python/Node sinh mặc định thì `crypt()` không đọc được và hàm luôn trả `false` (xem Ngày 30, mục Cách 2).
</details>

**Bài 6.** Sao lưu schema `shop` bằng định dạng custom, khôi phục vào database `shop_restore`, rồi trong `shop_restore` xóa nhầm bảng `payments` và khôi phục lại chỉ bảng đó từ file dump. So sánh số dòng và cấu trúc bảng `payments` sau khi khôi phục với bản gốc. Dọn dẹp khi xong.

<details>
<summary>Đáp án</summary>

```sh
docker compose exec db pg_dump -U postgres -d sql_challenge -n shop -Fc -f /data/shop.dump
docker compose exec db createdb -U postgres shop_restore
docker compose exec db pg_restore -U postgres -d shop_restore /data/shop.dump
docker compose exec db psql -U postgres -d shop_restore -c "ALTER DATABASE shop_restore SET search_path = shop, public"
docker compose exec db psql -U postgres -d shop_restore -c "DROP TABLE payments"
docker compose exec db pg_restore -U postgres -d shop_restore -t payments /data/shop.dump
docker compose exec db psql -U postgres -d shop_restore -c "SELECT count(*) FROM payments" -c "\d payments"
```

```text
 count
-------
    37

                         Table "shop.payments"
   Column   |           Type           | Collation | Nullable | Default
------------+--------------------------+-----------+----------+---------
 payment_id | integer                  |           | not null |
 order_id   | integer                  |           | not null |
 amount     | numeric(12,0)            |           | not null |
 method     | character varying(20)    |           | not null |
 paid_at    | timestamp with time zone |           | not null |
Check constraints:
    "payments_amount_check" CHECK (amount > 0::numeric)
    "payments_method_check" CHECK (method::text = ANY (ARRAY['cash'::character varying::text, 'card'::character varying::text, 'momo'::character varying::text, 'bank_transfer'::character varying::text]))
```

Đủ 37 dòng, còn các CHECK, nhưng mất PRIMARY KEY, FOREIGN KEY tới `orders`, index trên `order_id` và IDENTITY của `payment_id` (so với `\d payments` trong `sql_challenge`). Trong `pg_restore`, ràng buộc khóa và index là các mục riêng, `-t` không kéo theo. Khi cần khôi phục một bảng đầy đủ, an toàn hơn là khôi phục cả schema vào database tạm rồi chép dữ liệu sang.

```sh
docker compose exec db dropdb -U postgres shop_restore
docker compose exec db rm /data/shop.dump
```
</details>

### Thử thách

**Bài 7.** Thiết kế và tạo bộ quyền cho ba nhóm của DSC Shop, kèm câu lệnh kiểm chứng mỗi nhóm bằng `SET ROLE`:

- `shop_sales`: đọc sản phẩm, danh mục, khách, đơn, dòng hàng; tạo đơn và dòng hàng; đổi trạng thái đơn; không được xem `customers.birth_date` và không được xóa gì.
- `shop_hr`: đọc và sửa `employees`, không đọc được bất kỳ bảng nào khác.
- `shop_analyst`: đọc mọi bảng trừ `employees.salary` và các cột liên lạc của khách (`email`, `phone`).

<details>
<summary>Đáp án</summary>

Một cách làm (ý chính là kết hợp quyền mức bảng và mức cột):

```sql
CREATE ROLE shop_sales NOLOGIN;
CREATE ROLE shop_hr NOLOGIN;
CREATE ROLE shop_analyst NOLOGIN;
GRANT USAGE ON SCHEMA shop TO shop_sales, shop_hr, shop_analyst;

-- shop_sales
GRANT SELECT ON categories, products, orders, order_items TO shop_sales;
GRANT SELECT (customer_id, full_name, email, phone, city, created_at) ON customers TO shop_sales;
GRANT INSERT ON orders, order_items TO shop_sales;
GRANT UPDATE (status) ON orders TO shop_sales;

-- shop_hr
GRANT SELECT, INSERT, UPDATE ON employees TO shop_hr;

-- shop_analyst
GRANT SELECT ON categories, products, orders, order_items, payments TO shop_analyst;
GRANT SELECT (customer_id, full_name, city, birth_date, created_at) ON customers TO shop_analyst;
GRANT SELECT (employee_id, full_name, title, manager_id, hire_date) ON employees TO shop_analyst;

SELECT has_column_privilege('shop_sales',   'shop.customers', 'birth_date', 'SELECT') AS sales_birth,
       has_table_privilege ('shop_sales',   'shop.orders', 'DELETE')                  AS sales_delete,
       has_table_privilege ('shop_hr',      'shop.orders', 'SELECT')                  AS hr_orders,
       has_column_privilege('shop_analyst', 'shop.employees', 'salary', 'SELECT')     AS analyst_salary,
       has_column_privilege('shop_analyst', 'shop.employees', 'title', 'SELECT')      AS analyst_title;
```

| sales_birth | sales_delete | hr_orders | analyst_salary | analyst_title |
| --- | --- | --- | --- | --- |
| f | f | f | f | t |

Kiểm chứng bằng truy vấn thật, ví dụ nhà phân tích đếm nhân viên theo chức danh:

```sql
SET ROLE shop_analyst;
SELECT title, count(*) AS so_nguoi FROM employees GROUP BY title ORDER BY so_nguoi DESC, title LIMIT 2;
RESET ROLE;
```

| title | so_nguoi |
| --- | --- |
| Nhân viên bán hàng | 3 |
| Giám đốc | 1 |

```sql
SET ROLE shop_analyst;
SELECT avg(salary) FROM employees;
RESET ROLE;
```

```text
ERROR:  permission denied for table employees
```

Nhân viên bán hàng đổi được trạng thái đơn (bọc trong `BEGIN ... ROLLBACK` để giữ dữ liệu gốc):

```sql
BEGIN;
SET ROLE shop_sales;
UPDATE orders SET status = 'cancelled' WHERE order_id = 40 RETURNING order_id, status;
RESET ROLE;
ROLLBACK;
```

| order_id | status |
| --- | --- |
| 40 | cancelled |

Nhưng không xem được ngày sinh, không xóa được đơn (mỗi lệnh chạy riêng):

```sql
SET ROLE shop_sales;
SELECT full_name, birth_date FROM customers WHERE customer_id = 1;
RESET ROLE;
```

```text
ERROR:  permission denied for table customers
```

```sql
SET ROLE shop_sales;
DELETE FROM orders WHERE order_id = 40;
RESET ROLE;
```

```text
ERROR:  permission denied for table orders
```

Nhân sự đọc được `employees` nhưng không đọc được bảng khác:

```sql
SET ROLE shop_hr;
SELECT count(*) AS so_nhan_vien FROM employees;
RESET ROLE;
```

| so_nhan_vien |
| --- |
| 8 |

```sql
SET ROLE shop_hr;
SELECT count(*) FROM orders;
RESET ROLE;
```

```text
ERROR:  permission denied for table orders
```

Dọn dẹp:

```sql
DROP OWNED BY shop_sales, shop_hr, shop_analyst;
DROP ROLE shop_sales, shop_hr, shop_analyst;
```
</details>
