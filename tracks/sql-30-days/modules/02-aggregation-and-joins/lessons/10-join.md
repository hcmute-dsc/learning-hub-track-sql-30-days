---
uid: "ec9b758d-47df-55b9-bece-b913cdda65f7"
slug: "join"
title: "Ngày 10: Kết hợp nhiều bảng với JOIN"
objectives:
  - "Viết được truy vấn `INNER JOIN` và `LEFT JOIN` có alias bảng để lấy thông tin từ 2-4 bảng liên quan."
  - "Chọn đúng kiểu JOIN (INNER, LEFT, RIGHT, FULL, CROSS) và dự đoán được số dòng kết quả."
  - "Viết được SELF JOIN trên bảng `employees` để lấy tên quản lý của mỗi nhân viên."
  - "Dùng anti-join (`LEFT JOIN ... WHERE ... IS NULL`) để tìm khách chưa mua, sản phẩm chưa bán."
  - "Nhận ra và tránh được hai lỗi: đặt điều kiện ở `WHERE` làm LEFT JOIN thành INNER JOIN, và nhân dòng khi JOIN hai bảng con rồi `SUM`."
prerequisites:
  - "sql-30-days/foundations/table-structure-and-data-types"
  - "sql-30-days/foundations/select-where"
  - "sql-30-days/aggregation-and-joins/aggregate-functions"
  - "sql-30-days/aggregation-and-joins/group-by-having"
authors:
  - "github:TienNHM"
license: "MIT"
---

> **Tóm tắt:** Dữ liệu DSC Shop được tách ra nhiều bảng: đơn hàng chỉ lưu `customer_id`, không lưu tên khách. `JOIN` ghép các bảng lại theo khóa chung để trả lời những câu hỏi thật như "đơn này của ai", "danh mục nào bán chạy". Bài này đi qua INNER, LEFT, RIGHT, FULL, CROSS và SELF JOIN, cách JOIN 3-4 bảng, và ba cái bẫy hay gặp nhất: điều kiện đặt sai chỗ làm mất dòng của LEFT JOIN, anti-join, và số bị nhân lên khi JOIN rồi SUM.

**Sau bài này bạn có thể:**

- Viết được truy vấn `INNER JOIN` và `LEFT JOIN` có alias bảng để lấy thông tin từ 2-4 bảng liên quan.
- Chọn đúng kiểu JOIN (INNER, LEFT, RIGHT, FULL, CROSS) và dự đoán được số dòng kết quả.
- Viết được SELF JOIN trên bảng `employees` để lấy tên quản lý của mỗi nhân viên.
- Dùng anti-join (`LEFT JOIN ... WHERE ... IS NULL`) để tìm khách chưa mua, sản phẩm chưa bán.
- Nhận ra và tránh được hai lỗi: đặt điều kiện ở `WHERE` làm LEFT JOIN thành INNER JOIN, và nhân dòng khi JOIN hai bảng con rồi `SUM`.

**Cần biết trước:** [Ngày 2](../../01-foundations/lessons/02-table-structure-and-data-types.md) (khóa chính, khóa ngoại), [Ngày 3](../../01-foundations/lessons/03-select-where.md) (alias cột, NULL), [Ngày 8](08-aggregate-functions.md), [Ngày 9](09-group-by-having.md) (GROUP BY, HAVING).

## 1. Vì sao cần JOIN?

Xem 3 đơn hàng đầu tiên:

```sql
SELECT order_id, customer_id, employee_id, status
FROM orders
ORDER BY order_id
LIMIT 3;
```

| order_id | customer_id | employee_id | status |
| --- | --- | --- | --- |
| 1 | 1 | NULL | delivered |
| 2 | 2 | 4 | delivered |
| 3 | 3 | NULL | delivered |

Bảng `orders` chỉ lưu `customer_id`, tức là một con số trỏ sang bảng `customers` (khóa ngoại, Ngày 2). Tên, email, thành phố của khách nằm ở bảng `customers`. Thiết kế như vậy để mỗi thông tin chỉ lưu một chỗ: khách đổi số điện thoại thì sửa một dòng, không phải sửa mọi đơn hàng của họ (bạn sẽ học kỹ lý do ở [Ngày 27](../../04-sql-in-practice/lessons/27-database-design-best-practices.md)).

Cái giá phải trả: muốn in "đơn 1 của Nguyễn Văn An", bạn phải ghép hai bảng. Đó là việc của `JOIN`.

Các cặp bảng ghép được trong DSC Shop (xem sơ đồ ERD ở [setup/README.md](../../../setup/README.md)):

| Bảng con | Cột khóa ngoại | Trỏ tới |
| --- | --- | --- |
| `orders` | `customer_id` | `customers` |
| `orders` | `employee_id` (NULL với đơn online) | `employees` |
| `order_items` | `order_id`, `product_id` | `orders`, `products` |
| `payments` | `order_id` | `orders` |
| `products` | `category_id` | `categories` |
| `categories` | `parent_id` | `categories` (chính nó) |
| `employees` | `manager_id` | `employees` (chính nó) |

## 2. INNER JOIN: chỉ giữ các cặp khớp nhau

```sql
SELECT o.order_id,
       o.order_date::date AS ngay,
       c.full_name,
       o.status
FROM orders o
INNER JOIN customers c ON c.customer_id = o.customer_id
ORDER BY o.order_id
LIMIT 5;
```

| order_id | ngay | full_name | status |
| --- | --- | --- | --- |
| 1 | 2025-01-12 | Nguyễn Văn An | delivered |
| 2 | 2025-01-20 | Trần Thị Bình | delivered |
| 3 | 2025-02-03 | Lê Hoàng Cường | delivered |
| 4 | 2025-02-14 | Nguyễn Văn An | delivered |
| 5 | 2025-03-02 | Phạm Minh Duy | cancelled |

(... tổng 40 dòng)

Đọc câu lệnh:

- `FROM orders o`: chữ `o` là alias bảng (tên ngắn). Từ đây `o.order_id` nghĩa là cột `order_id` của bảng `orders`. Alias bảng giúp câu lệnh ngắn hơn. Khi hai bảng có cột trùng tên (cả hai bảng đều có `customer_id`), bạn bắt buộc ghi rõ cột của bảng nào: `o.customer_id` hoặc `orders.customer_id`. Alias chỉ thật sự bắt buộc khi một bảng xuất hiện hai lần trong câu (SELF JOIN, mục 6). Có thể viết `FROM orders AS o`, ý nghĩa như nhau.
- `ON c.customer_id = o.customer_id`: điều kiện ghép. Với mỗi đơn hàng, database tìm khách có `customer_id` bằng `customer_id` của đơn.
- `INNER JOIN` chỉ giữ những cặp tìm được nhau. Viết `JOIN` không có chữ nào phía trước cũng chính là `INNER JOIN`.

Mỗi đơn có đúng một khách (cột `orders.customer_id` là `NOT NULL` và có khóa ngoại), nên kết quả vẫn là 40 dòng, mỗi đơn một dòng. Khách 1 có 5 đơn nên tên `Nguyễn Văn An` (khách 1) lặp lại 5 lần: JOIN theo quan hệ một-nhiều luôn lặp lại thông tin của phía "một".

## 3. LEFT JOIN: giữ mọi dòng của bảng bên trái

Câu hỏi: "liệt kê mọi khách hàng kèm các đơn của họ, kể cả người chưa mua". `INNER JOIN` sẽ làm mất khách 16 và 17 vì họ không khớp với đơn nào. `LEFT JOIN` giữ mọi dòng của bảng bên trái (bảng viết trước), dòng nào không tìm được cặp thì các cột của bảng bên phải là NULL.

```sql
SELECT c.customer_id, c.full_name, o.order_id, o.status
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE c.customer_id >= 15
ORDER BY c.customer_id, o.order_id;
```

| customer_id | full_name | order_id | status |
| --- | --- | --- | --- |
| 15 | Nguyễn Văn An | 20 | delivered |
| 15 | Nguyễn Văn An | 39 | paid |
| 16 | Tạ Quang Sơn | NULL | NULL |
| 17 | Châu Ngọc Trâm | NULL | NULL |
| 18 | Mai Đức Uy | 23 | delivered |
| 18 | Mai Đức Uy | 36 | delivered |

Không có `WHERE`, câu này trả về 42 dòng: 40 dòng ghép được và 2 dòng của khách 16, 17. `WHERE c.customer_id >= 15` ở đây chỉ để in cho gọn, và nó lọc trên cột của bảng bên trái nên không ảnh hưởng tới việc giữ dòng (xem bẫy ở mục 9 để thấy khi nào `WHERE` gây hại).

Kết hợp với `GROUP BY` (Ngày 9) để đếm số đơn của mọi khách, kể cả người chưa mua:

```sql
SELECT c.customer_id, c.full_name, COUNT(o.order_id) AS so_don
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.full_name
ORDER BY so_don, c.customer_id
LIMIT 4;
```

| customer_id | full_name | so_don |
| --- | --- | --- |
| 16 | Tạ Quang Sơn | 0 |
| 17 | Châu Ngọc Trâm | 0 |
| 5 | Hoàng Thị Em | 2 |
| 7 | Đặng Thu Giang | 2 |

Hai chi tiết quan trọng:

- Đếm `COUNT(o.order_id)`, không đếm `COUNT(*)`. Với khách 16, dòng kết quả vẫn tồn tại (chỉ có cột của `orders` là NULL), nên `COUNT(*)` ra 1. `COUNT(o.order_id)` bỏ qua NULL nên ra 0.
- Nhóm theo `c.customer_id`, không nhóm chỉ theo `c.full_name`: hai khách tên `Nguyễn Văn An` sẽ bị gộp làm một.

PostgreSQL cho phép chọn `c.full_name` vì đã nhóm theo khóa chính `c.customer_id` (mỗi `customer_id` chỉ có một tên). Thêm `c.full_name` vào `GROUP BY` như trên thì chạy được ở mọi hệ quản trị.

## 4. Bốn kiểu JOIN trên cùng một cặp bảng

Cặp `customers` và `orders` chưa đủ để thấy hết sự khác nhau, vì đơn nào cũng có khách. Cặp `employees` và `orders` thì đủ: có nhân viên chưa bán đơn nào (giám đốc, trưởng phòng, kỹ thuật viên), và có đơn không có người bán (đơn online, `employee_id` là NULL).

![Bốn kiểu JOIN giữa employees và orders theo employee_id, vẽ bằng hai vòng tròn giao nhau, phần tô đậm là dòng có trong kết quả. Phần chỉ thuộc employees có 4 nhân viên chưa bán đơn nào, phần giao có 15 đơn offline có người bán, phần chỉ thuộc orders có 25 đơn online không có người bán. INNER JOIN chỉ tô phần giao: 15 dòng. LEFT JOIN tô cả vòng employees: 19 dòng bằng 15 cộng 4. RIGHT JOIN tô cả vòng orders: 40 dòng bằng 15 cộng 25. FULL JOIN tô cả hai vòng: 44 dòng bằng 4 cộng 15 cộng 25. MySQL không có FULL JOIN.](../../../assets/img/cac-loai-join.png#gh-light-mode-only)
![Bốn kiểu JOIN giữa employees và orders theo employee_id, vẽ bằng hai vòng tròn giao nhau, phần tô đậm là dòng có trong kết quả. Phần chỉ thuộc employees có 4 nhân viên chưa bán đơn nào, phần giao có 15 đơn offline có người bán, phần chỉ thuộc orders có 25 đơn online không có người bán. INNER JOIN chỉ tô phần giao: 15 dòng. LEFT JOIN tô cả vòng employees: 19 dòng bằng 15 cộng 4. RIGHT JOIN tô cả vòng orders: 40 dòng bằng 15 cộng 25. FULL JOIN tô cả hai vòng: 44 dòng bằng 4 cộng 15 cộng 25. MySQL không có FULL JOIN.](../../../assets/img/cac-loai-join-dark.png#gh-dark-mode-only)

<small>File gốc: [nền sáng](../../../assets/diagrams/join/cac-loai-join.html) · [nền tối](../../../assets/diagrams/join/cac-loai-join-dark.html)</small>

Tự kiểm chứng số dòng của từng kiểu (đổi chữ `INNER` thành `LEFT`, `RIGHT`, `FULL`):

```sql
SELECT COUNT(*) AS so_dong
FROM employees e
INNER JOIN orders o ON o.employee_id = e.employee_id;
```

| Kiểu JOIN | Số dòng | Giữ gì |
| --- | --- | --- |
| `INNER JOIN` | 15 | Chỉ các đơn offline, kèm người bán |
| `LEFT JOIN` | 19 | 15 dòng trên + 4 nhân viên chưa bán đơn nào (cột `orders` là NULL) |
| `RIGHT JOIN` | 40 | 15 dòng trên + 25 đơn online (cột `employees` là NULL) |
| `FULL JOIN` | 44 | Tất cả: 4 + 15 + 25 |

`FULL JOIN` (viết đầy đủ là `FULL OUTER JOIN`) giữ cả phần thừa của hai bên. Xem 8 dòng đầu, sắp xếp sao cho dòng không có đơn lên trước:

```sql
SELECT e.full_name AS nhan_vien, o.order_id, o.channel
FROM employees e
FULL JOIN orders o ON o.employee_id = e.employee_id
ORDER BY o.order_id NULLS FIRST, e.employee_id
LIMIT 8;
```

| nhan_vien | order_id | channel |
| --- | --- | --- |
| Nguyễn Thành Long | NULL | NULL |
| Lê Thị Hạnh | NULL | NULL |
| Trần Quốc Bảo | NULL | NULL |
| Lâm Gia Huy | NULL | NULL |
| NULL | 1 | online |
| Phạm Thị Thu | 2 | offline |
| NULL | 3 | online |
| Đỗ Minh Tuấn | 4 | offline |

(... tổng 44 dòng)

`RIGHT JOIN` ít khi cần: `A RIGHT JOIN B` cho cùng kết quả với `B LEFT JOIN A`. Đa số người viết SQL chỉ dùng `LEFT JOIN` và đặt bảng "phải giữ hết" lên trước, đọc dễ hơn. Ví dụ hai câu sau cho cùng 40 dòng:

```sql
-- RIGHT JOIN: giữ mọi đơn hàng
SELECT o.order_id, e.full_name
FROM employees e
RIGHT JOIN orders o ON o.employee_id = e.employee_id
ORDER BY o.order_id;

-- Viết lại bằng LEFT JOIN, dễ đọc hơn
SELECT o.order_id, e.full_name
FROM orders o
LEFT JOIN employees e ON e.employee_id = o.employee_id
ORDER BY o.order_id;
```

> **Ghi chú dialect:** MySQL không có `FULL JOIN`. Cách thay thế là ghép kết quả của `LEFT JOIN` và `RIGHT JOIN` bằng `UNION` (học ở [Ngày 12](12-union-intersect.md)):
>
> ```sql
> SELECT e.full_name, o.order_id FROM employees e LEFT JOIN orders o ON o.employee_id = e.employee_id
> UNION
> SELECT e.full_name, o.order_id FROM employees e RIGHT JOIN orders o ON o.employee_id = e.employee_id;
> ```
>
> PostgreSQL, SQL Server và SQLite (từ 3.39) đều có `FULL OUTER JOIN`.

## 5. JOIN nhiều bảng

Mỗi `JOIN` ghép thêm một bảng vào kết quả đang có. Xem chi tiết đơn 4: tên sản phẩm nằm ở `products`, số lượng và giá lúc mua nằm ở `order_items`.

```sql
SELECT oi.order_id, p.sku, p.name, oi.quantity, oi.unit_price, oi.discount
FROM order_items oi
JOIN products p ON p.product_id = oi.product_id
WHERE oi.order_id = 4;
```

| order_id | sku | name | quantity | unit_price | discount |
| --- | --- | --- | --- | --- | --- |
| 4 | ACC-002 | Chuột Logitech MX Master 3S | 1 | 2490000 | 0.00 |
| 4 | ACC-005 | Tai nghe AirPods Pro 2 | 1 | 5990000 | 0.10 |

Trong khóa này, doanh thu là tổng `quantity * unit_price * (1 - discount)` của các đơn đã thanh toán, tức `status NOT IN ('pending', 'cancelled')` (khớp với bảng `payments`). Báo cáo doanh thu theo danh mục cần 4 bảng: `orders` (để bỏ đơn chờ xử lý và đơn hủy) → `order_items` (tiền) → `products` (sản phẩm thuộc danh mục nào) → `categories` (tên danh mục).

```sql
SELECT c.name AS danh_muc,
       COUNT(DISTINCT o.order_id) AS so_don,
       ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))) AS doanh_thu
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
JOIN products p     ON p.product_id = oi.product_id
JOIN categories c   ON c.category_id = p.category_id
WHERE o.status NOT IN ('pending', 'cancelled')
GROUP BY c.category_id, c.name
ORDER BY doanh_thu DESC;
```

| danh_muc | so_don | doanh_thu |
| --- | --- | --- |
| Điện thoại | 9 | 135492500 |
| Laptop gaming | 5 | 135151000 |
| Laptop văn phòng | 5 | 104700500 |
| Máy tính bảng | 4 | 52960000 |
| Tai nghe & Loa | 7 | 42833000 |
| PC & Màn hình | 4 | 42330000 |
| Chuột & Bàn phím | 8 | 15534000 |
| Sạc & Cáp | 8 | 7290000 |

Mẹo viết JOIN nhiều bảng: đi theo đường khóa ngoại trên ERD, mỗi bước một `JOIN ... ON` nối bảng mới với một bảng đã có. Dùng `COUNT(DISTINCT o.order_id)` vì một đơn có nhiều dòng hàng cùng danh mục sẽ xuất hiện nhiều lần sau khi JOIN.

## 6. SELF JOIN: ghép một bảng với chính nó

Bảng `employees` có cột `manager_id` trỏ về `employee_id` của người quản lý, tức là trỏ về chính bảng `employees`. Để in tên quản lý, ta JOIN bảng với chính nó, đặt hai alias khác nhau để phân biệt "vai nhân viên" (`e`) và "vai quản lý" (`m`):

```sql
SELECT e.employee_id,
       e.full_name AS nhan_vien,
       e.title,
       m.full_name AS quan_ly
FROM employees e
LEFT JOIN employees m ON m.employee_id = e.manager_id
ORDER BY e.employee_id;
```

| employee_id | nhan_vien | title | quan_ly |
| --- | --- | --- | --- |
| 1 | Nguyễn Thành Long | Giám đốc | NULL |
| 2 | Lê Thị Hạnh | Trưởng phòng Kinh doanh | Nguyễn Thành Long |
| 3 | Trần Quốc Bảo | Trưởng phòng Kỹ thuật | Nguyễn Thành Long |
| 4 | Phạm Thị Thu | Nhân viên bán hàng | Lê Thị Hạnh |
| 5 | Đỗ Minh Tuấn | Nhân viên bán hàng | Lê Thị Hạnh |
| 6 | Vũ Hoài Nam | Nhân viên bán hàng | Lê Thị Hạnh |
| 7 | Lâm Gia Huy | Kỹ thuật viên | Trần Quốc Bảo |
| 8 | Kiều Anh Thư | Thực tập sinh bán hàng | Phạm Thị Thu |

Dùng `LEFT JOIN` để giữ giám đốc (không có quản lý). Với `INNER JOIN` bạn chỉ còn 7 dòng. SELF JOIN chỉ đi lên được một cấp; đi hết cây (giám đốc → trưởng phòng → nhân viên → thực tập sinh) cần CTE đệ quy, học ở [Ngày 29](../../04-sql-in-practice/lessons/29-recursive-queries-window-functions.md).

## 7. CROSS JOIN: mọi tổ hợp

`CROSS JOIN` ghép mỗi dòng bên trái với mọi dòng bên phải, không cần điều kiện. Bảng 8 dòng `CROSS JOIN` bảng 40 dòng ra 320 dòng. Nghe vô dụng, nhưng nó hữu ích khi cần tạo "khung" đủ mọi tổ hợp, ví dụ mỗi nhân viên bán hàng × mỗi năm để làm báo cáo (kể cả năm họ không bán được gì):

```sql
SELECT e.full_name, n.nam
FROM employees e
CROSS JOIN (VALUES (2025), (2026)) AS n(nam)
WHERE e.title = 'Nhân viên bán hàng'
ORDER BY e.employee_id, n.nam;
```

| full_name | nam |
| --- | --- |
| Phạm Thị Thu | 2025 |
| Phạm Thị Thu | 2026 |
| Đỗ Minh Tuấn | 2025 |
| Đỗ Minh Tuấn | 2026 |
| Vũ Hoài Nam | 2025 |
| Vũ Hoài Nam | 2026 |

`(VALUES (2025), (2026)) AS n(nam)` là một bảng nhỏ viết tay ngay trong câu lệnh: 2 dòng, một cột tên `nam`.

Cẩn thận: viết `FROM employees, orders` (dấu phẩy, không có `WHERE` nối hai bảng) cũng là CROSS JOIN và cho 320 dòng. Kiểu viết dấu phẩy là cú pháp cũ; với `WHERE e.employee_id = o.employee_id` nó tương đương `INNER JOIN`, nhưng quên điều kiện là ra tích chéo. Hãy luôn dùng `JOIN ... ON`.

## 8. Anti-join: tìm cái "không có"

Câu hỏi kiểu "khách nào chưa mua gì", "sản phẩm nào chưa bán được" rất hay gặp. Mẹo: `LEFT JOIN` rồi giữ những dòng không tìm được cặp, tức là cột khóa của bảng bên phải là NULL.

```sql
SELECT c.customer_id, c.full_name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL
ORDER BY c.customer_id;
```

| customer_id | full_name |
| --- | --- |
| 16 | Tạ Quang Sơn |
| 17 | Châu Ngọc Trâm |

```sql
SELECT p.sku, p.name
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.product_id
WHERE oi.product_id IS NULL;
```

| sku | name |
| --- | --- |
| ACC-009 | Lót chuột DSC XXL |

Kiểm tra `IS NULL` trên một cột không bao giờ NULL khi khớp (khóa chính hoặc cột trong `ON`), như `o.order_id`. Nếu kiểm tra một cột vốn có thể NULL, như `o.note`, bạn sẽ lẫn cả các đơn có thật nhưng không ghi chú. Ngày 11 sẽ học cách viết khác cho cùng câu hỏi: `NOT EXISTS`.

## 9. Bẫy 1: điều kiện ở WHERE biến LEFT JOIN thành INNER JOIN

Câu hỏi: "mỗi khách có bao nhiêu đơn trong năm 2026, kể cả khách không có đơn nào (ghi 0)?". Cách viết tự nhiên nhưng sai:

```sql
SELECT c.customer_id, c.full_name, COUNT(o.order_id) AS so_don_2026
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_date >= '2026-01-01'
GROUP BY c.customer_id, c.full_name
ORDER BY c.customer_id;
```

Kết quả chỉ có 15 dòng, không có dòng nào bằng 0. Khách 9 (chỉ mua năm 2025), khách 16 và 17 (chưa mua) biến mất.

Lý do nằm ở thứ tự thực thi (Ngày 9): `FROM ... LEFT JOIN` chạy trước, tạo ra dòng của khách 16 với `o.order_date` là NULL. Sau đó `WHERE` chạy: `NULL >= '2026-01-01'` không phải TRUE, nên dòng bị loại. Mọi dòng mà LEFT JOIN cố công giữ lại đều bị `WHERE` bỏ đi, kết quả giống hệt INNER JOIN.

Cách đúng: đưa điều kiện trên bảng bên phải vào `ON`. Khi đó điều kiện là một phần của việc "tìm cặp", không phải bộ lọc sau cùng:

```sql
SELECT c.customer_id, c.full_name, COUNT(o.order_id) AS so_don_2026
FROM customers c
LEFT JOIN orders o
       ON o.customer_id = c.customer_id
      AND o.order_date >= '2026-01-01'
GROUP BY c.customer_id, c.full_name
ORDER BY c.customer_id;
```

| customer_id | full_name | so_don_2026 |
| --- | --- | --- |
| 1 | Nguyễn Văn An | 1 |
| 2 | Trần Thị Bình | 1 |
| ... | ... | ... |
| 8 | Bùi Văn Hùng | 1 |
| 9 | Ngô Thị Lan | 0 |
| 10 | Dương Minh Khoa | 1 |
| ... | ... | ... |
| 16 | Tạ Quang Sơn | 0 |
| 17 | Châu Ngọc Trâm | 0 |
| 18 | Mai Đức Uy | 1 |

(... tổng 18 dòng)

Quy tắc với `LEFT JOIN`:

- Điều kiện trên bảng bên trái (bảng phải giữ hết): đặt ở `WHERE`.
- Điều kiện trên bảng bên phải: đặt ở `ON`. Ngoại lệ duy nhất là `WHERE cot_ben_phai IS NULL` của anti-join (mục 8), vì đó chính là ý định lọc.

Với `INNER JOIN`, đặt điều kiện ở `ON` hay `WHERE` cho cùng kết quả.

## 10. Bẫy 2: JOIN hai bảng con rồi SUM bị nhân dòng

Đơn 12 trị giá 31.880.000 đ, khách trả góp 2 lần (15.000.000 và 16.880.000). Muốn xem tiền hàng và tiền đã trả của đơn này trong một câu, nhiều người viết:

```sql
SELECT o.order_id,
       ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))) AS tien_hang,
       SUM(p.amount) AS da_thanh_toan
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
JOIN payments p     ON p.order_id = o.order_id
WHERE o.order_id = 12
GROUP BY o.order_id;
```

| order_id | tien_hang | da_thanh_toan |
| --- | --- | --- |
| 12 | 63760000 | 63760000 |

Cả hai con số đều gấp đôi. Bỏ `GROUP BY` và `SUM` để xem các dòng trước khi cộng:

```sql
SELECT o.order_id, oi.product_id,
       oi.quantity * oi.unit_price * (1 - oi.discount) AS tien_hang,
       p.payment_id, p.amount
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
JOIN payments p     ON p.order_id = o.order_id
WHERE o.order_id = 12;
```

| order_id | product_id | tien_hang | payment_id | amount |
| --- | --- | --- | --- | --- |
| 12 | 2 | 29990000.00 | 36 | 15000000 |
| 12 | 18 | 1890000.00 | 36 | 15000000 |
| 12 | 2 | 29990000.00 | 37 | 16880000 |
| 12 | 18 | 1890000.00 | 37 | 16880000 |

![Nhân dòng khi JOIN order_items và payments của đơn 12. Bên trái là hai bảng con: order_items của đơn 12 có 2 dòng (sản phẩm 2 giá 29.990.000, sản phẩm 18 giá 1.890.000), payments của đơn 12 có 2 dòng (lần 36 trả 15.000.000, lần 37 trả 16.880.000). Cả hai cùng JOIN vào đơn 12 theo order_id, nên kết quả bên phải có 2 nhân 2 bằng 4 dòng: mỗi dòng hàng gặp từng lần thanh toán. SUM tiền hàng ra 63.760.000 và SUM amount ra 63.760.000, trong khi con số đúng của cả hai là 31.880.000.](../../../assets/img/nhan-dong-khi-join.png#gh-light-mode-only)
![Nhân dòng khi JOIN order_items và payments của đơn 12. Bên trái là hai bảng con: order_items của đơn 12 có 2 dòng (sản phẩm 2 giá 29.990.000, sản phẩm 18 giá 1.890.000), payments của đơn 12 có 2 dòng (lần 36 trả 15.000.000, lần 37 trả 16.880.000). Cả hai cùng JOIN vào đơn 12 theo order_id, nên kết quả bên phải có 2 nhân 2 bằng 4 dòng: mỗi dòng hàng gặp từng lần thanh toán. SUM tiền hàng ra 63.760.000 và SUM amount ra 63.760.000, trong khi con số đúng của cả hai là 31.880.000.](../../../assets/img/nhan-dong-khi-join-dark.png#gh-dark-mode-only)

<small>File gốc: [nền sáng](../../../assets/diagrams/join/nhan-dong-khi-join.html) · [nền tối](../../../assets/diagrams/join/nhan-dong-khi-join-dark.html)</small>

`order_items` và `payments` đều là bảng con của `orders`, nhưng giữa chúng không có quan hệ gì. JOIN cả hai vào cùng một đơn thì mỗi dòng hàng được ghép với từng lần thanh toán: 2 × 2 = 4 dòng. Một đơn có 3 dòng hàng và 2 lần trả sẽ ra 6 dòng. Lỗi này nguy hiểm vì câu lệnh chạy bình thường, số trông hợp lý, và với đơn chỉ có 1 lần thanh toán thì kết quả lại đúng.

Cách sửa: tổng hợp từng bảng con riêng (mỗi đơn còn một dòng), rồi mới JOIN. Việc này cần truy vấn con trong `FROM`, sẽ học kỹ ở [Ngày 11](11-subquery.md). Ở đây chỉ cần hiểu mỗi cặp ngoặc là một bảng tạm đã được `GROUP BY order_id`:

```sql
SELECT o.order_id, h.tien_hang, t.da_thanh_toan
FROM orders o
JOIN (SELECT order_id,
             ROUND(SUM(quantity * unit_price * (1 - discount))) AS tien_hang
      FROM order_items
      GROUP BY order_id) AS h ON h.order_id = o.order_id
JOIN (SELECT order_id, SUM(amount) AS da_thanh_toan
      FROM payments
      GROUP BY order_id) AS t ON t.order_id = o.order_id
WHERE o.order_id = 12;
```

| order_id | tien_hang | da_thanh_toan |
| --- | --- | --- |
| 12 | 31880000 | 31880000 |

Nguyên tắc chung: trước khi `SUM` sau một chuỗi JOIN, tự hỏi "mỗi dòng sau khi JOIN đại diện cho cái gì?". Nếu câu trả lời là "một cặp (dòng hàng, lần thanh toán)" thì cộng tiền hàng trên đó là sai.

## Lỗi thường gặp

**1. Cột mơ hồ.** Cả `orders` và `customers` đều có `customer_id`:

```sql
SELECT customer_id
FROM orders
JOIN customers ON customers.customer_id = orders.customer_id;
```

```text
ERROR:  column reference "customer_id" is ambiguous
```

Luôn ghi alias trước tên cột khi JOIN: `o.customer_id`.

**2. Ghép sai cột trong ON.** Câu sau chạy được, không báo lỗi, nhưng vô nghĩa: nó ghép đơn số 1 với khách số 1, đơn số 2 với khách số 2, ...

```sql
SELECT o.order_id, c.full_name
FROM orders o
JOIN customers c ON o.order_id = c.customer_id
ORDER BY o.order_id
LIMIT 3;
```

| order_id | full_name |
| --- | --- |
| 1 | Nguyễn Văn An |
| 2 | Trần Thị Bình |
| 3 | Lê Hoàng Cường |

Kết quả trông "hợp lý" nên càng khó phát hiện. Đối chiếu `ON` với khóa ngoại trên ERD: `orders.customer_id` → `customers.customer_id`.

**3. COUNT(*) sau LEFT JOIN.** Khách chưa mua vẫn có một dòng (cột bên phải là NULL), nên `COUNT(*)` ra 1 thay vì 0:

```sql
SELECT c.customer_id, c.full_name,
       COUNT(*)          AS dem_sao,
       COUNT(o.order_id) AS dem_don
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE c.customer_id IN (15, 16, 17)
GROUP BY c.customer_id, c.full_name
ORDER BY c.customer_id;
```

| customer_id | full_name | dem_sao | dem_don |
| --- | --- | --- | --- |
| 15 | Nguyễn Văn An | 2 | 2 |
| 16 | Tạ Quang Sơn | 1 | 0 |
| 17 | Châu Ngọc Trâm | 1 | 0 |

Tương tự, `SUM` của khách chưa mua ra NULL; dùng `COALESCE(SUM(...), 0)` (Ngày 5) nếu muốn hiện 0.

**4. WHERE trên bảng bên phải của LEFT JOIN.** Xem mục 9.

**5. JOIN hai bảng con rồi SUM.** Xem mục 10.

**6. Nhóm theo tên thay vì khóa.** `GROUP BY c.full_name` gộp hai khách `Nguyễn Văn An` làm một. Nhóm theo `c.customer_id`.

## Bài tập

Phần bài tập của bài này nằm ở bài tập **Bài tập: Kết hợp nhiều bảng với JOIN** ngay sau bài học.

## Tóm tắt

- `JOIN ... ON` ghép bảng theo khóa chung, thường là khóa ngoại → khóa chính. `JOIN` không ghi gì là `INNER JOIN`.
- Đặt alias cho bảng (`orders o`) và luôn ghi alias trước tên cột.
- `INNER JOIN` chỉ giữ cặp khớp. `LEFT JOIN` giữ mọi dòng bên trái, phần không khớp là NULL. `RIGHT JOIN` ngược lại (thường viết lại bằng LEFT JOIN). `FULL JOIN` giữ hết hai bên. `CROSS JOIN` tạo mọi tổ hợp.
- SELF JOIN ghép bảng với chính nó qua hai alias, dùng cho cây `employees.manager_id`, `categories.parent_id`.
- Anti-join: `LEFT JOIN ... WHERE cot_khoa_ben_phai IS NULL` tìm dòng không có cặp.
- Với LEFT JOIN, điều kiện trên bảng bên phải đặt ở `ON`, đặt ở `WHERE` sẽ biến nó thành INNER JOIN.
- Sau LEFT JOIN, đếm bằng `COUNT(cot_ben_phai)`, không dùng `COUNT(*)`.
- JOIN hai bảng con của cùng một bảng cha (ví dụ `order_items` và `payments`) rồi `SUM` sẽ nhân dòng. Tổng hợp từng bảng con riêng rồi mới JOIN.

## Đọc thêm

- [PostgreSQL: Joined Tables](https://www.postgresql.org/docs/16/queries-table-expressions.html#QUERIES-JOIN)
- [LEFT JOIN của bạn đã thành INNER JOIN mà không ai báo](https://tiennhm.io.vn/blog/left-join-thanh-inner-join) — Thêm một điều kiện WHERE lên cột của bảng bên phải là LEFT JOIN âm thầm biến thành INNER JOIN, và những dòng bạn cố tình giữ lại biến mất.
