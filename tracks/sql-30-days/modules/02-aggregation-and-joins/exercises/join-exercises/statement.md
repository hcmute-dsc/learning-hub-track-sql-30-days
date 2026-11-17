> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

### Cơ bản

**Bài 1.** Liệt kê các sản phẩm thuộc danh mục tên `Điện thoại`: mã SKU, tên, giá, tên danh mục. Sắp xếp giá giảm dần. (Lọc theo tên danh mục, không lọc theo `category_id = 7`.)

<details>
<summary>Đáp án</summary>

```sql
SELECT p.sku, p.name, p.price, c.name AS danh_muc
FROM products p
JOIN categories c ON c.category_id = p.category_id
WHERE c.name = 'Điện thoại'
ORDER BY p.price DESC;
```

Kết quả:

| sku | name | price | danh_muc |
| --- | --- | --- | --- |
| PHN-001 | iPhone 15 128GB | 19990000 | Điện thoại |
| PHN-002 | Samsung Galaxy S24 | 18990000 | Điện thoại |
| PHN-003 | Xiaomi Redmi Note 13 | 4890000 | Điện thoại |
| PHN-004 | Nokia 105 4G | 690000 | Điện thoại |
</details>

**Bài 2.** Liệt kê các đơn đặt từ năm 2026 có người bán, kèm tên người bán.

<details>
<summary>Đáp án</summary>

```sql
SELECT o.order_id, o.order_date::date AS ngay, e.full_name AS nguoi_ban
FROM orders o
JOIN employees e ON e.employee_id = o.employee_id
WHERE o.order_date >= '2026-01-01'
ORDER BY o.order_id;
```

Kết quả:

| order_id | ngay | nguoi_ban |
| --- | --- | --- |
| 27 | 2026-01-20 | Vũ Hoài Nam |
| 29 | 2026-02-25 | Phạm Thị Thu |
| 32 | 2026-04-30 | Đỗ Minh Tuấn |
| 34 | 2026-06-15 | Kiều Anh Thư |
| 36 | 2026-08-08 | Vũ Hoài Nam |

`INNER JOIN` tự bỏ các đơn online (`employee_id` là NULL), đúng với yêu cầu "có người bán".
</details>

**Bài 3.** Danh mục nào chưa có sản phẩm nào gắn trực tiếp vào nó?

> Gợi ý: đi từ `categories` bằng `LEFT JOIN products`, rồi giữ những dòng không ghép được sản phẩm nào.

<details>
<summary>Đáp án</summary>

```sql
SELECT c.category_id, c.name
FROM categories c
LEFT JOIN products p ON p.category_id = c.category_id
WHERE p.product_id IS NULL
ORDER BY c.category_id;
```

Kết quả:

| category_id | name |
| --- | --- |
| 1 | Máy tính |
| 2 | Laptop |
| 6 | Điện thoại & Tablet |
| 9 | Phụ kiện |
| 13 | Thiết bị mạng |

Bốn danh mục đầu là danh mục cha (sản phẩm gắn vào danh mục con của chúng). Chỉ `Thiết bị mạng` là thật sự chưa có hàng.
</details>

### Vận dụng

**Bài 4.** Với mỗi nhân viên (cả người chưa bán đơn nào), tính số đơn đã bán và doanh thu (chỉ tính đơn có `status NOT IN ('pending', 'cancelled')`). Người chưa bán ghi doanh thu 0. Sắp xếp doanh thu giảm dần.

> Gợi ý: điều kiện `status` nằm ở bảng bên phải của `LEFT JOIN`. Đặt nó ở `WHERE` hay ở `ON` cho kết quả khác nhau.

<details>
<summary>Đáp án</summary>

```sql
SELECT e.employee_id,
       e.full_name,
       COUNT(DISTINCT o.order_id) AS so_don,
       COALESCE(ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))), 0) AS doanh_thu
FROM employees e
LEFT JOIN orders o
       ON o.employee_id = e.employee_id
      AND o.status NOT IN ('pending', 'cancelled')
LEFT JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY e.employee_id, e.full_name
ORDER BY doanh_thu DESC, e.employee_id;
```

Kết quả:

| employee_id | full_name | so_don | doanh_thu |
| --- | --- | --- | --- |
| 6 | Vũ Hoài Nam | 4 | 82907500 |
| 4 | Phạm Thị Thu | 5 | 63700000 |
| 5 | Đỗ Minh Tuấn | 5 | 63401000 |
| 8 | Kiều Anh Thư | 1 | 1640000 |
| 1 | Nguyễn Thành Long | 0 | 0 |
| 2 | Lê Thị Hạnh | 0 | 0 |
| 3 | Trần Quốc Bảo | 0 | 0 |
| 7 | Lâm Gia Huy | 0 | 0 |

Ba điểm: điều kiện `status` đặt ở `ON` để không mất nhân viên chưa bán (mục 9 của [Ngày 10](../../lessons/10-join.md)); JOIN thứ hai cũng phải là `LEFT JOIN`, nếu không các dòng NULL từ JOIN thứ nhất sẽ bị loại; `COUNT(DISTINCT o.order_id)` vì mỗi đơn có thể có nhiều dòng hàng. Ở đây chỉ JOIN một bảng con (`order_items`) nên không bị nhân dòng như mục 10 của Ngày 10.
</details>

**Bài 5.** Với mỗi người có cấp dưới, cho biết họ quản lý trực tiếp bao nhiêu người.

> Gợi ý: JOIN `employees` với chính nó: một alias cho vai quản lý, một alias cho vai nhân viên.

<details>
<summary>Đáp án</summary>

```sql
SELECT m.employee_id,
       m.full_name AS quan_ly,
       COUNT(e.employee_id) AS so_nhan_vien
FROM employees m
JOIN employees e ON e.manager_id = m.employee_id
GROUP BY m.employee_id, m.full_name
ORDER BY so_nhan_vien DESC, m.employee_id;
```

Kết quả:

| employee_id | quan_ly | so_nhan_vien |
| --- | --- | --- |
| 2 | Lê Thị Hạnh | 3 |
| 1 | Nguyễn Thành Long | 2 |
| 3 | Trần Quốc Bảo | 1 |
| 4 | Phạm Thị Thu | 1 |
</details>

**Bài 6.** Liệt kê mọi khách hàng kèm số đơn của họ (khách chưa mua ghi 0). Sắp xếp số đơn giảm dần, cùng số đơn thì theo `customer_id`.

<details>
<summary>Đáp án</summary>

```sql
SELECT c.customer_id, c.full_name, COUNT(o.order_id) AS so_don
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.full_name
ORDER BY so_don DESC, c.customer_id;
```

Kết quả:

| customer_id | full_name | so_don |
| --- | --- | --- |
| 1 | Nguyễn Văn An | 5 |
| 2 | Trần Thị Bình | 4 |
| 3 | Lê Hoàng Cường | 3 |
| 4 | Phạm Minh Duy | 3 |
| 6 | Võ Quốc Phong | 3 |
| ... | ... | ... |
| 18 | Mai Đức Uy | 2 |
| 16 | Tạ Quang Sơn | 0 |
| 17 | Châu Ngọc Trâm | 0 |

(... tổng 18 dòng)
</details>

### Thử thách

**Bài 7.** Tìm mọi cặp khách hàng ở cùng thành phố (theo đúng giá trị cột `city`). Mỗi cặp chỉ in một lần, không ghép một khách với chính họ.

> Gợi ý: SELF JOIN `customers` theo `city`. Điều kiện nào trên `customer_id` loại được cả cặp (A, A) lẫn cặp đảo (B, A)?

<details>
<summary>Đáp án</summary>

```sql
SELECT a.customer_id AS id_1, a.full_name AS khach_1,
       b.customer_id AS id_2, b.full_name AS khach_2, a.city
FROM customers a
JOIN customers b
  ON a.city = b.city
 AND a.customer_id < b.customer_id
ORDER BY a.city, a.customer_id, b.customer_id;
```

Kết quả:

| id_1 | khach_1 | id_2 | khach_2 | city |
| --- | --- | --- | --- | --- |
| 5 | Hoàng Thị Em | 16 | Tạ Quang Sơn | Cần Thơ |
| 3 | Lê Hoàng Cường | 18 | Mai Đức Uy | Đà Nẵng |
| 2 | Trần Thị Bình | 7 | Đặng Thu Giang | Hà Nội |
| 2 | Trần Thị Bình | 13 | Phan Thị Oanh | Hà Nội |
| 2 | Trần Thị Bình | 15 | Nguyễn Văn An | Hà Nội |
| 7 | Đặng Thu Giang | 13 | Phan Thị Oanh | Hà Nội |
| 7 | Đặng Thu Giang | 15 | Nguyễn Văn An | Hà Nội |
| 13 | Phan Thị Oanh | 15 | Nguyễn Văn An | Hà Nội |
| 1 | Nguyễn Văn An | 4 | Phạm Minh Duy | TP. Hồ Chí Minh |
| 1 | Nguyễn Văn An | 10 | Dương Minh Khoa | TP. Hồ Chí Minh |
| 4 | Phạm Minh Duy | 10 | Dương Minh Khoa | TP. Hồ Chí Minh |

Có `customer_id` nên phân biệt được hai khách `Nguyễn Văn An` (1 ở TP. Hồ Chí Minh, 15 ở Hà Nội). `a.customer_id < b.customer_id` vừa loại cặp (A, A) vừa chỉ giữ một trong hai chiều (A, B) và (B, A). Khách có `city` NULL không ghép với ai (`NULL = NULL` không phải TRUE). Dữ liệu bẩn làm sót cặp: `TP.HCM`, `Hồ Chí Minh`, `đà nẵng` không khớp với cách viết chuẩn. Muốn ghép đúng phải làm sạch `city` trước (Ngày 5).
</details>

**Bài 8.** Tính doanh thu (đơn có `status NOT IN ('pending', 'cancelled')`) theo danh mục cha trực tiếp của danh mục sản phẩm. Ví dụ sản phẩm thuộc `Điện thoại` thì tính vào `Điện thoại & Tablet`.

> Gợi ý: JOIN `categories` hai lần với hai alias: một cho danh mục của sản phẩm, một cho danh mục cha (`parent_id`).

<details>
<summary>Đáp án</summary>

```sql
SELECT cha.name AS danh_muc_cha,
       ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))) AS doanh_thu
FROM orders o
JOIN order_items oi    ON oi.order_id = o.order_id
JOIN products p        ON p.product_id = oi.product_id
JOIN categories con    ON con.category_id = p.category_id
JOIN categories cha    ON cha.category_id = con.parent_id
WHERE o.status NOT IN ('pending', 'cancelled')
GROUP BY cha.category_id, cha.name
ORDER BY doanh_thu DESC;
```

Kết quả:

| danh_muc_cha | doanh_thu |
| --- | --- |
| Laptop | 239851500 |
| Điện thoại & Tablet | 188452500 |
| Phụ kiện | 65657000 |
| Máy tính | 42330000 |

Đây là JOIN 5 bảng, trong đó `categories` xuất hiện hai lần với hai vai (`con`, `cha`). Lưu ý `Laptop` lại là con của `Máy tính`: muốn cộng dồn đến danh mục gốc, bạn phải đi lên nhiều cấp, việc của CTE đệ quy ở Ngày 29.
</details>
