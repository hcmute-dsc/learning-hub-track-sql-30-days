> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Các bài dưới đây chỉ đọc dữ liệu, không sửa bảng của shop.

### Cơ bản

**Bài 1.** Lấy danh sách mọi thành phố xuất hiện trong hệ thống: thành phố của khách (`customers.city`) và thành phố giao hàng (`orders.shipping_city`). Không lặp, bỏ `NULL`, sắp xếp theo tên.

<details>
<summary>Đáp án</summary>

```sql
SELECT city AS thanh_pho FROM customers WHERE city IS NOT NULL
UNION
SELECT shipping_city FROM orders WHERE shipping_city IS NOT NULL
ORDER BY thanh_pho;
```

Kết quả:

| thanh_pho |
| --- |
| Biên Hòa |
| Cần Thơ |
| đà nẵng |
| Đà Nẵng |
| Hải Phòng |
| Hà Nội |
| Hồ Chí Minh |
| TP.HCM |
| TP. Hồ Chí Minh |

Ở đây cần loại trùng nên `UNION` là đúng. Điều kiện `IS NOT NULL` phải đặt ở **cả hai** vế.

</details>

**Bài 2.** Lập danh sách "sản phẩm cần chú ý" gồm sản phẩm hết hàng (`stock_quantity = 0`) và sản phẩm ngừng kinh doanh (`is_active = FALSE`), có cột `ly_do`. Sắp xếp theo `sku`, rồi `ly_do`. Một sản phẩm vừa hết hàng vừa ngừng kinh doanh thì hiện cả hai lý do.

> Gợi ý: hai câu `SELECT`, mỗi câu thêm một cột hằng cho lý do, nối bằng `UNION ALL`.

<details>
<summary>Đáp án</summary>

```sql
SELECT sku, name, 'Hết hàng' AS ly_do
FROM products
WHERE stock_quantity = 0
UNION ALL
SELECT sku, name, 'Ngừng kinh doanh'
FROM products
WHERE is_active = FALSE
ORDER BY sku, ly_do;
```

Kết quả:

| sku | name | ly_do |
| --- | --- | --- |
| ACC-006 | Loa JBL Flip 6 | Hết hàng |
| LAP-003 | Acer Nitro V 15 | Hết hàng |
| PHN-004 | Nokia 105 4G | Hết hàng |
| PHN-004 | Nokia 105 4G | Ngừng kinh doanh |

Hai dòng của Nokia khác nhau ở `ly_do` nên dùng `UNION` cũng không mất dòng, nhưng `UNION ALL` nói rõ ý định hơn và không tốn công loại trùng.

</details>

**Bài 3.** Tìm khách đã mua hàng (có đơn đã thanh toán, tức `status NOT IN ('pending', 'cancelled')`) trong **cả** năm 2025 **và** năm 2026. Hiện `customer_id`, `full_name`.

<details>
<summary>Đáp án</summary>

```sql
SELECT c.customer_id, c.full_name
FROM customers c JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_date >= '2025-01-01' AND o.order_date < '2026-01-01'
  AND o.status NOT IN ('pending', 'cancelled')
INTERSECT
SELECT c.customer_id, c.full_name
FROM customers c JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_date >= '2026-01-01' AND o.order_date < '2027-01-01'
  AND o.status NOT IN ('pending', 'cancelled')
ORDER BY customer_id;
```

Kết quả:

| customer_id | full_name |
| --- | --- |
| 1 | Nguyễn Văn An |
| 2 | Trần Thị Bình |
| 4 | Phạm Minh Duy |
| 6 | Võ Quốc Phong |
| 7 | Đặng Thu Giang |

(... tổng 12 dòng)

Có `customer_id` trong kết quả nên hai khách `Nguyễn Văn An` (1 và 15) được tính riêng. Khách 3 không có mặt: đơn duy nhất của họ trong năm 2026 (đơn 40) đang `pending`, chưa thanh toán.

</details>

### Vận dụng

**Bài 4.** Tìm khách đã mua (đơn đã thanh toán, như Bài 3) trong năm 2025 nhưng **không quay lại** mua trong năm 2026.

> Gợi ý: giống Bài 3 nhưng thay `INTERSECT` bằng phép toán lấy "có ở A mà không có ở B".

<details>
<summary>Đáp án</summary>

```sql
SELECT c.customer_id, c.full_name
FROM customers c JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_date >= '2025-01-01' AND o.order_date < '2026-01-01'
  AND o.status NOT IN ('pending', 'cancelled')
EXCEPT
SELECT c.customer_id, c.full_name
FROM customers c JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_date >= '2026-01-01' AND o.order_date < '2027-01-01'
  AND o.status NOT IN ('pending', 'cancelled')
ORDER BY customer_id;
```

Kết quả:

| customer_id | full_name |
| --- | --- |
| 3 | Lê Hoàng Cường |
| 5 | Hoàng Thị Em |
| 9 | Ngô Thị Lan |

Khách 5 có đặt một đơn năm 2026 (đơn 28) nhưng đơn đó bị hủy; khách 3 có đơn 40 năm 2026 nhưng đơn đó còn `pending`. Cả hai vẫn tính là "không quay lại" mua. Bỏ điều kiện `status` ở cả hai vế thì chỉ còn khách 9.

</details>

**Bài 5.** Tìm sản phẩm chưa từng xuất hiện trong đơn hàng nào bằng `EXCEPT`. Sau đó viết lại bằng `NOT EXISTS` để hiện thêm `sku` và `name`.

<details>
<summary>Đáp án</summary>

```sql
SELECT product_id FROM products
EXCEPT
SELECT product_id FROM order_items;
```

| product_id |
| --- |
| 24 |

```sql
SELECT p.product_id, p.sku, p.name
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.product_id);
```

| product_id | sku | name |
| --- | --- | --- |
| 24 | ACC-009 | Lót chuột DSC XXL |

</details>

**Bài 6.** Viết một báo cáo doanh thu theo kênh có thêm **dòng tổng cộng** ở cuối. Doanh thu là tổng tiền dòng hàng (`quantity * unit_price * (1 - discount)`) của các đơn đã thanh toán, tức `status` không phải `pending` hay `cancelled` (quy ước chung của khóa, khớp với bảng `payments`).

> Gợi ý: vế thứ nhất `GROUP BY channel`, vế thứ hai không `GROUP BY` nên ra đúng một dòng tổng. Muốn dòng tổng chắc chắn nằm cuối thì cần một cột để sắp xếp.

<details>
<summary>Đáp án</summary>

```sql
SELECT kenh, doanh_thu
FROM (
    SELECT 0 AS thu_tu,
           o.channel AS kenh,
           ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))) AS doanh_thu
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status NOT IN ('pending', 'cancelled')
    GROUP BY o.channel
    UNION ALL
    SELECT 1, 'TỔNG CỘNG',
           ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount)))
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status NOT IN ('pending', 'cancelled')
) AS t
ORDER BY thu_tu, kenh;
```

Kết quả:

| kenh | doanh_thu |
| --- | --- |
| offline | 211648500 |
| online | 324642500 |
| TỔNG CỘNG | 536291000 |

Không có `ORDER BY`, PostgreSQL không hứa thứ tự dòng, kể cả dòng tổng. Vì vậy mỗi vế có thêm cột thứ tự `thu_tu` (`0` cho các kênh, `1` cho dòng tổng), rồi truy vấn ngoài `ORDER BY thu_tu, kenh` và chỉ in hai cột cần xem. PostgreSQL có sẵn `GROUP BY ROLLUP` để làm việc này gọn hơn (đã nhắc ở Ngày 9).

</details>

### Thử thách

**Bài 7.** MySQL không có `FULL JOIN`. Hãy mô phỏng `categories FULL JOIN products` bằng `LEFT JOIN` và `RIGHT JOIN` nối với nhau bằng `UNION`, hiện tên danh mục và tên sản phẩm. Kiểm tra số dòng có bằng `FULL JOIN` thật không.

<details>
<summary>Đáp án</summary>

```sql
SELECT c.name AS danh_muc, p.name AS san_pham
FROM categories c
LEFT JOIN products p ON p.category_id = c.category_id
UNION
SELECT c.name, p.name
FROM categories c
RIGHT JOIN products p ON p.category_id = c.category_id
ORDER BY danh_muc, san_pham;
```

Kết quả: 29 dòng, bằng `SELECT COUNT(*) FROM categories c FULL JOIN products p ON p.category_id = c.category_id`. Các dòng có `san_pham` là `NULL` là danh mục không trực tiếp chứa sản phẩm:

| danh_muc | san_pham |
| --- | --- |
| Điện thoại & Tablet | NULL |
| Laptop | NULL |
| Máy tính | NULL |
| Phụ kiện | NULL |
| Thiết bị mạng | NULL |

Cách này dựa vào `UNION` để bỏ các dòng ghép được mà cả hai vế đều trả về. Nó chỉ đúng khi bản thân kết quả JOIN không có hai dòng giống hệt nhau (ở đây đúng, vì mỗi sản phẩm có tên khác nhau). An toàn hơn là vế thứ hai chỉ lấy dòng không ghép được: `RIGHT JOIN ... WHERE c.category_id IS NULL` rồi nối bằng `UNION ALL`.

</details>

**Bài 8.** Một bạn viết truy vấn sau để đếm "tổng số người trong hệ thống" và nhận được 25. Giải thích vì sao sai và sửa lại.

```sql
SELECT COUNT(*) FROM (
    SELECT full_name FROM customers
    UNION
    SELECT full_name FROM employees
) AS t;
```

<details>
<summary>Đáp án</summary>

`UNION` loại trùng theo cột `full_name`, nên hai khách hàng khác nhau cùng tên `Nguyễn Văn An` chỉ còn một dòng. Sửa bằng `UNION ALL` (hoặc thêm cột khóa và cột nguồn vào mỗi vế để các dòng không bao giờ trùng):

```sql
SELECT COUNT(*) AS so_nguoi FROM (
    SELECT full_name FROM customers
    UNION ALL
    SELECT full_name FROM employees
) AS t;
```

Kết quả:

| so_nguoi |
| --- |
| 26 |

</details>
