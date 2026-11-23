---
uid: "cede657f-6c2f-5ddd-b27d-f5b9f8933690"
slug: "intro-to-sql-and-dbms"
title: "Ngày 1: Giới thiệu SQL, RDBMS và môi trường thực hành"
objectives:
  - "Giải thích SQL, database, RDBMS là gì và vì sao khóa học chọn PostgreSQL."
  - "Dựng môi trường thực hành bằng Docker (hoặc cài trực tiếp) và kết nối được bằng `psql` và Adminer."
  - "Dùng `\\dt`, `\\d tên_bảng` để xem danh sách bảng và cấu trúc một bảng của DSC Shop."
  - "Viết câu `SELECT` đơn giản để xem dữ liệu của một bảng."
  - "Xếp một câu lệnh SQL vào đúng nhóm DDL, DML, DCL hoặc TCL."
prerequisites: []
authors:
  - "github:TienNHM"
license: "MIT"
terms: [SQL, query, database, DBMS, RDBMS, DDL, DML]
---

> **Tóm tắt:** SQL là ngôn ngữ để làm việc với dữ liệu trong database quan hệ. Hôm nay bạn tìm hiểu SQL và hệ quản trị database quan hệ (RDBMS) là gì, dựng PostgreSQL 16 cùng bộ dữ liệu DSC Shop trên máy, rồi chạy những câu lệnh đầu tiên để khám phá dữ liệu.

**Sau bài này bạn có thể:**

- Giải thích SQL, database, RDBMS là gì và vì sao khóa học chọn PostgreSQL.
- Dựng môi trường thực hành bằng Docker (hoặc cài trực tiếp) và kết nối được bằng `psql` và Adminer.
- Dùng `\dt`, `\d tên_bảng` để xem danh sách bảng và cấu trúc một bảng của DSC Shop.
- Viết câu `SELECT` đơn giản để xem dữ liệu của một bảng.
- Xếp một câu lệnh SQL vào đúng nhóm DDL, DML, DCL hoặc TCL.

## SQL là gì

Hãy hình dung một cửa hàng đồ công nghệ ghi chép mọi thứ vào sổ: sổ khách hàng, sổ sản phẩm, sổ đơn hàng. Khi cửa hàng lớn lên, sổ giấy không còn đủ: cần tìm nhanh "khách nào mua iPhone tháng trước", cần nhiều nhân viên cùng ghi mà không giẫm chân nhau, cần không mất dữ liệu khi mất điện. Phần mềm làm những việc đó gọi là **hệ quản trị cơ sở dữ liệu** (DBMS, Database Management System).

**SQL** (Structured Query Language) là ngôn ngữ bạn dùng để "nói chuyện" với DBMS: tạo bảng, thêm dữ liệu, hỏi dữ liệu, phân quyền. SQL là ngôn ngữ **khai báo**: bạn mô tả *muốn lấy gì*, còn DBMS tự quyết định *lấy như thế nào*. Ví dụ "cho tôi tên và thành phố của mọi khách hàng" viết thành:

```sql
SELECT full_name, city FROM customers;
```

SQL được dùng ở hầu hết mọi nơi có dữ liệu: backend web và mobile, phân tích dữ liệu, báo cáo kinh doanh, kho dữ liệu (BigQuery, Snowflake). SQL có chuẩn quốc tế (ISO/IEC 9075), nhưng mỗi DBMS thêm phần mở rộng riêng, gọi là **dialect**. Khóa học viết theo dialect của PostgreSQL và ghi chú khi các hệ khác viết khác.

## Database quan hệ và RDBMS

**Database quan hệ** (relational database, cơ sở dữ liệu quan hệ) lưu dữ liệu thành các **bảng** (table). Mỗi bảng có các **cột** (column) cố định, mỗi **dòng** (row) là một bản ghi. Các bảng liên kết với nhau qua giá trị chung: dòng trong bảng `orders` ghi `customer_id = 1` nghĩa là đơn đó của khách có mã 1 trong bảng `customers`.

Hai khái niệm cốt lõi (Ngày 2 học kỹ):

- **Khóa chính** (primary key): cột xác định duy nhất mỗi dòng, ví dụ `customers.customer_id`.
- **Khóa ngoại** (foreign key): cột trỏ tới khóa chính của bảng khác, ví dụ `orders.customer_id`.

**RDBMS** là phần mềm quản lý database quan hệ. Khi bạn gửi một câu SQL, RDBMS phân tích câu lệnh, chọn cách thực hiện mà nó ước lượng là rẻ nhất (Ngày 20 học cách đọc query plan), rồi đọc/ghi dữ liệu trên đĩa:

```mermaid
flowchart LR
    subgraph RDBMS["RDBMS (hệ quản trị database quan hệ)"]
        C["Parser + Optimizer"] --> D["Bộ máy thực thi"] --> E["Quản lý lưu trữ"]
    end
    A["Client / Ứng dụng"] -->|"Gửi câu lệnh SQL"| C
    E --> F[("Bảng dữ liệu trên đĩa")]
    F -->|"Tập kết quả"| A
```

### Các RDBMS phổ biến

| RDBMS | Điểm mạnh | Cần lưu ý | Hay gặp ở |
| --- | --- | --- | --- |
| PostgreSQL | Mã nguồn mở, bám sát chuẩn SQL, nhiều kiểu dữ liệu (JSONB, mảng, khoảng thời gian), mở rộng được | Cấu hình và vận hành có nhiều thứ cần học hơn MySQL | Backend, phân tích dữ liệu, tài chính, GIS |
| MySQL | Mã nguồn mở, phổ biến, dễ bắt đầu | Window function và CTE chỉ có từ bản 8.0; có kiểu JSON nhưng ít toán tử hơn JSONB | Web (WordPress, nhiều hệ thống PHP) |
| SQL Server | Công cụ quản trị tốt, tích hợp hệ sinh thái Microsoft | Bản thương mại tốn phí bản quyền (có bản Express/Developer miễn phí) | Doanh nghiệp dùng .NET |
| SQLite | Không cần server, cả database là một file | Không có quản lý user/quyền, không có stored procedure; ghi đồng thời bị giới hạn | Ứng dụng mobile, desktop, thử nghiệm nhanh |

Khóa học chỉ dùng **PostgreSQL 16**: có đủ mọi tính năng mà 30 ngày cần (CTE, window function, `FULL JOIN`, `INTERSECT`/`EXCEPT`, JSONB, partition, `EXPLAIN ANALYZE`, PL/pgSQL), miễn phí và chạy được trên mọi hệ điều hành. Học vững một hệ thì chuyển sang hệ khác rất nhanh, vì phần lớn SQL là giống nhau.

## Dựng môi trường thực hành

Hướng dẫn đầy đủ (kể cả xử lý sự cố, nạp dữ liệu lớn, làm lại từ đầu) ở [setup/README.md](../../../setup/README.md). Dưới đây là các bước chính.

### Cách 1: Docker (khuyến nghị)

Docker chạy PostgreSQL trong một "container" tách biệt, không đụng tới máy bạn, và dữ liệu mẫu được nạp tự động.

1. Cài [Docker Desktop](https://www.docker.com/products/docker-desktop/) và mở nó lên.
2. Tải khóa học về và mở terminal ở thư mục `tracks/sql-30-days` (nơi có file `docker-compose.yml`):

```sh
git clone https://github.com/hcmute-dsc/learning-hub-content.git
cd learning-hub-content/tracks/sql-30-days
```

Mọi lệnh `docker compose ...` và đường dẫn `setup/...` trong khóa học đều chạy từ thư mục này.

3. Chạy:

```sh
docker compose up -d
```

Lần đầu Docker tải image nên mất vài phút. Xong, bạn có hai dịch vụ:

| Dịch vụ | Địa chỉ | Thông tin đăng nhập |
| --- | --- | --- |
| PostgreSQL 16 | `localhost:5432` | user `postgres`, mật khẩu `postgres`, database `sql_challenge` |
| Adminer (giao diện web) | <http://localhost:8080> | System: PostgreSQL, Server: `db`, user/mật khẩu như trên, Database: `sql_challenge` |

Kiểm tra container đang chạy:

```sh
docker compose ps
```

### Cách 2: Cài PostgreSQL trực tiếp

Nếu máy không chạy được Docker:

1. Tải và cài PostgreSQL 16 trở lên từ <https://www.postgresql.org/download/>. Trên Windows, trình cài đặt hỏi mật khẩu cho user `postgres`: hãy ghi nhớ nó. Nhớ chọn cài kèm "Command Line Tools" để có `psql`.
2. Tải khóa học về như bước 2 của Cách 1, rồi ở thư mục `tracks/sql-30-days`, tạo database và nạp dữ liệu:

```sh
createdb -U postgres sql_challenge
psql -U postgres -d sql_challenge -f setup/init/01_schema.sql -f setup/init/02_seed.sql
```

Với cách này, bỏ phần `docker compose exec db` ở các lệnh trong khóa học và gõ thẳng `psql -U postgres -d sql_challenge`.

## Kết nối bằng psql

`psql` là chương trình dòng lệnh đi kèm PostgreSQL. Với Docker:

```sh
docker compose exec db psql -U postgres -d sql_challenge
```

Bạn thấy dấu nhắc `sql_challenge=#`. Gõ câu lệnh SQL, kết thúc bằng dấu `;` rồi Enter:

```sql
SELECT version();
```

| version |
| --- |
| PostgreSQL 16.15 (Debian 16.15-1.pgdg13+2) on x86_64-pc-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit |

Số phiên bản phụ (16.x) trên máy bạn có thể khác, miễn là bắt đầu bằng 16.

Ngoài câu lệnh SQL, `psql` có các **lệnh meta** bắt đầu bằng dấu `\`. Chúng do `psql` xử lý chứ không gửi lên server, nên **không cần dấu `;`**:

| Lệnh | Tác dụng |
| --- | --- |
| `\dt` | Liệt kê các bảng |
| `\d tên_bảng` | Xem cấu trúc một bảng |
| `\dn` | Liệt kê các schema |
| `\l` | Liệt kê các database |
| `\c tên_db` | Chuyển sang database khác |
| `\conninfo` | Xem đang kết nối tới đâu |
| `\x` | Bật/tắt hiển thị dọc (tiện khi bảng nhiều cột) |
| `\pset null 'NULL'` | In giá trị NULL thành chữ `NULL` thay vì ô trống |
| `\?` | Danh sách mọi lệnh meta |
| `\q` | Thoát `psql` |

Mẹo: phím mũi tên lên để gọi lại lệnh cũ, phím Tab để tự hoàn thành tên bảng, tên cột.

### Adminer và các công cụ đồ họa

Nếu thích giao diện đồ họa, mở <http://localhost:8080>, đăng nhập theo bảng ở trên, bấm "SQL command" để gõ lệnh. Bạn cũng có thể dùng DBeaver, pgAdmin, DataGrip hoặc extension PostgreSQL của VS Code, kết nối tới `localhost:5432`. Khóa học in kết quả theo kiểu `psql`, nhưng mọi câu SQL chạy giống nhau trên các công cụ này.

## Khám phá DSC Shop

DSC Shop là cửa hàng đồ công nghệ giả lập, dùng cho cả khóa. Các bảng nằm trong **schema** `shop` (schema là một "thư mục" chứa bảng bên trong database). Database đã được cấu hình để bạn viết `customers` thay vì `shop.customers`.

```sql
\dn
```

| Name | Owner |
| --- | --- |
| perf | postgres |
| public | pg_database_owner |
| shop | postgres |

Schema `perf` chứa dữ liệu lớn cho các bài hiệu năng; nếu bạn chưa chạy `setup/perf_seed.sql` thì chưa có dòng này. Xem các bảng của cửa hàng:

```sql
\dt
```

| Schema | Name | Type | Owner |
| --- | --- | --- | --- |
| shop | categories | table | postgres |
| shop | customers | table | postgres |
| shop | employees | table | postgres |
| shop | order_items | table | postgres |
| shop | orders | table | postgres |
| shop | payments | table | postgres |
| shop | products | table | postgres |

Bảy bảng, ý nghĩa như sau:

| Bảng | Số dòng | Chứa gì |
| --- | --- | --- |
| `categories` | 13 | Danh mục sản phẩm, dạng cây (`Máy tính` > `Laptop` > `Laptop gaming`) |
| `products` | 24 | Sản phẩm, giá bán (VNĐ), tồn kho, thông số kỹ thuật |
| `customers` | 18 | Khách hàng |
| `employees` | 8 | Nhân viên, ai quản lý ai |
| `orders` | 40 | Đơn hàng từ 01/2025 đến 10/2026 |
| `order_items` | 60 | Từng dòng hàng trong mỗi đơn |
| `payments` | 37 | Các lần thanh toán |

Sơ đồ quan hệ giữa các bảng có ở [setup/README.md](../../../setup/README.md#bộ-dữ-liệu-dsc-shop). Xem cấu trúc bảng `customers`:

```sql
\d customers
```

```text
                                    Table "shop.customers"
   Column    |           Type           | Collation | Nullable |           Default
-------------+--------------------------+-----------+----------+------------------------------
 customer_id | integer                  |           | not null | generated always as identity
 full_name   | character varying(100)   |           | not null |
 email       | character varying(255)   |           |          |
 phone       | character varying(20)    |           |          |
 city        | character varying(100)   |           |          |
 birth_date  | date                     |           |          |
 created_at  | timestamp with time zone |           | not null | now()
Indexes:
    "customers_pkey" PRIMARY KEY, btree (customer_id)
    "customers_email_key" UNIQUE CONSTRAINT, btree (email)
Referenced by:
    TABLE "orders" CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
```

Đọc nhanh: mỗi cột có một kiểu dữ liệu (`integer`, `character varying(100)` tức `VARCHAR(100)`, `date`, ...). Cột `Nullable` ghi `not null` nghĩa là bắt buộc có giá trị. `customer_id` là khóa chính và tự sinh số; `email` không được trùng; bảng `orders` trỏ tới bảng này qua `customer_id`. Ngày 2 sẽ giải thích từng chi tiết.

### Câu SELECT đầu tiên

`SELECT ... FROM ...` lấy dữ liệu từ một bảng. Dấu `*` nghĩa là "mọi cột":

```sql
SELECT * FROM categories;
```

| category_id | name | parent_id |
| --- | --- | --- |
| 1 | Máy tính | NULL |
| 2 | Laptop | 1 |
| 3 | Laptop gaming | 2 |
| 4 | Laptop văn phòng | 2 |
| 5 | PC & Màn hình | 1 |
| 6 | Điện thoại & Tablet | NULL |
| 7 | Điện thoại | 6 |
| 8 | Máy tính bảng | 6 |
| 9 | Phụ kiện | NULL |
| 10 | Chuột & Bàn phím | 9 |
| 11 | Tai nghe & Loa | 9 |
| 12 | Sạc & Cáp | 9 |
| 13 | Thiết bị mạng | NULL |

Ô `NULL` ở `parent_id` nghĩa là "không có giá trị": danh mục gốc thì không có cha. `psql` mặc định in NULL thành ô trống, rất dễ nhầm với chuỗi rỗng; khóa học luôn ghi rõ chữ `NULL` trong bảng kết quả, và bạn gõ `\pset null 'NULL'` để `psql` hiển thị giống vậy. NULL rất quan trọng và sẽ được học kỹ ở Ngày 3.

Chỉ lấy vài cột thì liệt kê tên cột, cách nhau bởi dấu phẩy:

```sql
SELECT full_name, email, city FROM customers;
```

| full_name | email | city |
| --- | --- | --- |
| Nguyễn Văn An | an.nguyen@gmail.com | TP. Hồ Chí Minh |
| Trần Thị Bình | binh.tran@gmail.com | Hà Nội |
| Lê Hoàng Cường | cuong.le@outlook.com | Đà Nẵng |
| Phạm Minh Duy | duy.pham@gmail.com | TP. Hồ Chí Minh |
| Hoàng Thị Em | NULL | Cần Thơ |
| Võ Quốc Phong | phong.vo@student.hcmute.edu.vn | Hồ Chí Minh |
| ... | ... | ... |

(... tổng 18 dòng)

Để ý: cùng là TP. Hồ Chí Minh nhưng có dòng ghi `TP. Hồ Chí Minh`, có dòng ghi `Hồ Chí Minh`; có khách không có email. Dữ liệu thật thường "bẩn" như vậy, và DSC Shop cố ý giữ những điểm này để bạn luyện cách xử lý ở các bài sau.

> Khi không có `ORDER BY` (Ngày 4), PostgreSQL không hứa trả về các dòng theo thứ tự nào. Trên dữ liệu gốc, bạn thường thấy thứ tự như trên, nhưng đừng dựa vào điều đó.

## Các nhóm lệnh SQL

Câu lệnh SQL chia thành bốn nhóm theo việc chúng làm:

| Nhóm | Viết tắt của | Làm gì | Lệnh tiêu biểu | Học ở |
| --- | --- | --- | --- | --- |
| DDL | Data Definition Language | Định nghĩa cấu trúc: tạo, sửa, xóa bảng và các đối tượng khác | `CREATE`, `ALTER`, `DROP`, `TRUNCATE` | Ngày 2, 6 |
| DML | Data Manipulation Language | Đọc và thay đổi dữ liệu trong bảng | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | Ngày 3-14 |
| DCL | Data Control Language | Cấp và thu hồi quyền | `GRANT`, `REVOKE` | Ngày 30 |
| TCL | Transaction Control Language | Gom nhiều lệnh thành một transaction (giao dịch): hoặc tất cả thành công, hoặc không gì cả | `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT` | Ngày 6, 16 |

Nhiều tài liệu tách `SELECT` ra một nhóm riêng là **DQL** (Data Query Language), vì nó chỉ đọc chứ không thay đổi dữ liệu. Hai cách chia đều gặp, bạn chỉ cần biết cả hai.

Chạy thử khối dưới đây để thấy ba nhóm DDL, DML, TCL làm việc cùng nhau. Chưa cần hiểu từng lệnh, chỉ cần quan sát:

```sql
BEGIN;                                          -- TCL: mở transaction
CREATE TABLE thu_nghiem (ghi_chu TEXT);         -- DDL: tạo bảng
INSERT INTO thu_nghiem VALUES ('Xin chào SQL'); -- DML: thêm dữ liệu
SELECT * FROM thu_nghiem;                       -- DML/DQL: đọc dữ liệu
ROLLBACK;                                       -- TCL: hủy mọi thứ từ BEGIN
```

Câu `SELECT` trả về:

| ghi_chu |
| --- |
| Xin chào SQL |

Sau `ROLLBACK`, cả bảng lẫn dữ liệu biến mất như chưa từng tồn tại:

```sql
SELECT * FROM thu_nghiem;
```

```text
ERROR:  relation "thu_nghiem" does not exist
LINE 1: SELECT * FROM thu_nghiem;
                      ^
```

PostgreSQL cho phép hủy cả lệnh tạo bảng trong transaction, điều mà không phải RDBMS nào cũng làm được (MySQL tự động commit khi gặp `CREATE TABLE`). Mẹo `BEGIN ... ROLLBACK` này sẽ giúp bạn thử nghiệm an toàn ở Ngày 6.

`--` bắt đầu một **chú thích** (comment): phần còn lại của dòng bị bỏ qua khi chạy.

## Lỗi thường gặp

**Quên dấu `;`.** Trong `psql`, câu SQL chỉ được gửi đi khi gặp `;`. Nếu quên, dấu nhắc đổi từ `sql_challenge=#` thành `sql_challenge-#` và `psql` chờ bạn gõ tiếp. Chỉ cần gõ `;` rồi Enter. Ngược lại, lệnh meta như `\dt` không cần `;`.

**Dùng nháy kép cho chuỗi.** Trong SQL chuẩn, chuỗi ký tự nằm trong nháy đơn `'...'`; nháy kép `"..."` dành cho **tên** cột, tên bảng.

```sql
SELECT "Hà Nội";
```

```text
ERROR:  column "Hà Nội" does not exist
LINE 1: SELECT "Hà Nội";
               ^
```

Cách đúng:

```sql
SELECT 'Hà Nội';
```

| ?column? |
| --- |
| Hà Nội |

> **Ghi chú dialect:** MySQL mặc định chấp nhận cả nháy kép cho chuỗi, nên thói quen này hay mang sang PostgreSQL và gây lỗi.

**Kết nối nhầm database hoặc mất `search_path`.** Nếu bạn kết nối vào database `postgres` (mặc định) thay vì `sql_challenge`, hoặc đổi `search_path`, PostgreSQL không tìm thấy bảng:

```sql
SET search_path = public;
SELECT * FROM customers;
```

```text
ERROR:  relation "customers" does not exist
LINE 1: SELECT * FROM customers;
                      ^
```

Kiểm tra bằng `\conninfo`, chuyển database bằng `\c sql_challenge`, hoặc đưa `search_path` về mặc định:

```sql
RESET search_path;
```

**Tên database, bảng có chữ hoa.** PostgreSQL tự đổi tên không nằm trong nháy kép thành chữ thường: `CREATE DATABASE ShopDB;` tạo ra database tên `shopdb`. Nhưng `\c ShopDB` của `psql` dùng đúng chuỗi bạn gõ, nên báo database "ShopDB" không tồn tại. Cách tránh đơn giản nhất: luôn đặt tên bằng chữ thường, nối các từ bằng dấu gạch dưới (`snake_case`), như mọi bảng trong DSC Shop. Ngày 2 có ví dụ chi tiết.

**Cổng 5432 đã bị chiếm.** Nếu máy đã cài sẵn PostgreSQL, `docker compose up -d` có thể báo lỗi cổng 5432 đang dùng. Tắt dịch vụ PostgreSQL cài sẵn, hoặc đổi dòng `"5432:5432"` trong `docker-compose.yml` thành `"5433:5432"` và kết nối công cụ đồ họa qua cổng 5433 (lệnh `docker compose exec db psql ...` không bị ảnh hưởng).

## Bài tập

Phần bài tập của bài này nằm ở bài tập **Bài tập: Giới thiệu SQL, RDBMS và môi trường thực hành** ngay sau bài học.

## Tóm tắt

- SQL là ngôn ngữ khai báo để làm việc với database quan hệ; RDBMS là phần mềm lưu trữ và thực thi SQL.
- Khóa học dùng PostgreSQL 16 và bộ dữ liệu DSC Shop (7 bảng trong schema `shop`), dựng bằng `docker compose up -d` hoặc cài trực tiếp theo [setup/README.md](../../../setup/README.md).
- `psql`: câu SQL kết thúc bằng `;`; lệnh meta bắt đầu bằng `\` (`\dt`, `\d bảng`, `\conninfo`, `\q`) không cần `;`.
- `SELECT cột1, cột2 FROM bảng;` lấy dữ liệu; `*` là mọi cột; NULL là "không có giá trị" (`\pset null 'NULL'` để `psql` in rõ chữ NULL).
- Bốn nhóm lệnh: DDL (cấu trúc), DML (dữ liệu), DCL (quyền), TCL (transaction).
- Chuỗi dùng nháy đơn; tên đặt bằng chữ thường `snake_case`.

## Đọc thêm

- [setup/README.md](../../../setup/README.md): chi tiết cài đặt và mô tả bộ dữ liệu DSC Shop.
- [PostgreSQL Tutorial (tài liệu chính thức)](https://www.postgresql.org/docs/16/tutorial.html).
- [psql: danh sách lệnh meta](https://www.postgresql.org/docs/16/app-psql.html).
- Silberschatz, Korth, Sudarshan. *Database System Concepts*. McGraw-Hill.
