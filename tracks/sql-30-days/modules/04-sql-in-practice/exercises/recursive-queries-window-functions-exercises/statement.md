> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Các bài chỉ đọc dữ liệu, không cần khôi phục database sau khi làm.

### Cơ bản

**Bài 1.** Với mỗi đơn đã thanh toán của khách 2 và khách 4, cho biết đó là đơn thứ mấy của khách (theo thời gian đặt).

<details>
<summary>Đáp án</summary>

```sql
SELECT customer_id,
       order_id,
       order_date::date AS ngay,
       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS don_thu
FROM orders
WHERE status NOT IN ('pending', 'cancelled')
  AND customer_id IN (2, 4)
ORDER BY customer_id, don_thu;
```

Kết quả:

| customer_id | order_id | ngay | don_thu |
| --- | --- | --- | --- |
| 2 | 2 | 2025-01-20 | 1 |
| 2 | 8 | 2025-04-22 | 2 |
| 2 | 22 | 2025-11-11 | 3 |
| 2 | 34 | 2026-06-15 | 4 |
| 4 | 16 | 2025-08-16 | 1 |
| 4 | 31 | 2026-04-01 | 2 |

Đơn 5 của khách 4 bị hủy nên không được đánh số.
</details>

**Bài 2.** Xếp hạng giá sản phẩm (đắt nhất là hạng 1) trong từng danh mục con của "Phụ kiện" (các danh mục có `parent_id = 9`), dùng `DENSE_RANK`.

<details>
<summary>Đáp án</summary>

```sql
SELECT c.name AS danh_muc,
       p.name AS san_pham,
       p.price,
       DENSE_RANK() OVER (PARTITION BY p.category_id ORDER BY p.price DESC) AS hang_gia
FROM products p
JOIN categories c ON c.category_id = p.category_id
WHERE c.parent_id = 9
ORDER BY p.category_id, hang_gia;
```

Kết quả:

| danh_muc | san_pham | price | hang_gia |
| --- | --- | --- | --- |
| Chuột & Bàn phím | Chuột Logitech MX Master 3S | 2490000 | 1 |
| Chuột & Bàn phím | Bàn phím cơ Keychron K2 | 1890000 | 2 |
| Chuột & Bàn phím | Chuột Logitech G102 | 399000 | 3 |
| Chuột & Bàn phím | Lót chuột DSC XXL | 250000 | 4 |
| Tai nghe & Loa | Tai nghe Sony WH-1000XM5 | 7990000 | 1 |
| Tai nghe & Loa | Tai nghe AirPods Pro 2 | 5990000 | 2 |
| Tai nghe & Loa | Loa JBL Flip 6 | 2690000 | 3 |
| Sạc & Cáp | Sạc Anker 65W | 890000 | 1 |
| Sạc & Cáp | Cáp USB-C to USB-C 1m | 150000 | 2 |
</details>

**Bài 3.** Liệt kê mọi cấp dưới (trực tiếp và gián tiếp) của Lê Thị Hạnh, kèm khoảng cách cấp so với chị (1 = cấp dưới trực tiếp).

<details>
<summary>Đáp án</summary>

```sql
WITH RECURSIVE cap_duoi AS (
    SELECT employee_id, full_name, title, 0 AS cap
    FROM employees
    WHERE full_name = 'Lê Thị Hạnh'

    UNION ALL

    SELECT e.employee_id, e.full_name, e.title, cd.cap + 1
    FROM employees e
    JOIN cap_duoi cd ON e.manager_id = cd.employee_id
)
SELECT employee_id, full_name, title, cap
FROM cap_duoi
WHERE cap > 0
ORDER BY cap, employee_id;
```

Kết quả:

| employee_id | full_name | title | cap |
| --- | --- | --- | --- |
| 4 | Phạm Thị Thu | Nhân viên bán hàng | 1 |
| 5 | Đỗ Minh Tuấn | Nhân viên bán hàng | 1 |
| 6 | Vũ Hoài Nam | Nhân viên bán hàng | 1 |
| 8 | Kiều Anh Thư | Thực tập sinh bán hàng | 2 |

`WHERE cap > 0` bỏ dòng của chính Lê Thị Hạnh (dòng neo).
</details>

### Vận dụng

**Bài 4.** Doanh thu từng tháng trong toàn bộ dữ liệu (01/2025 đến 10/2026), kèm lũy kế **từ đầu mỗi năm** (sang năm mới thì lũy kế bắt đầu lại).

<details>
<summary>Đáp án</summary>

```sql
WITH doanh_thu_thang AS (
    SELECT DATE_TRUNC('month', o.order_date)::date AS thang,
           ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))) AS doanh_thu
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status NOT IN ('pending', 'cancelled')
    GROUP BY DATE_TRUNC('month', o.order_date)
)
SELECT to_char(thang, 'YYYY-MM') AS thang,
       doanh_thu,
       SUM(doanh_thu) OVER (PARTITION BY EXTRACT(YEAR FROM thang)
                            ORDER BY thang) AS luy_ke_trong_nam
FROM doanh_thu_thang
ORDER BY thang;
```

Kết quả:

| thang | doanh_thu | luy_ke_trong_nam |
| --- | --- | --- |
| 2025-01 | 27689000 | 27689000 |
| 2025-02 | 13661000 | 41350000 |
| ... | ... | ... |
| 2025-11 | 40762500 | 276469500 |
| 2025-12 | 49661000 | 326130500 |
| 2026-01 | 34030500 | 34030500 |
| 2026-02 | 11560000 | 45590500 |
| ... | ... | ... |
| 2026-10 | 39980000 | 210160500 |

(... tổng 22 dòng.) Chìa khóa là `PARTITION BY EXTRACT(YEAR FROM thang)`: mỗi năm là một partition riêng.
</details>

**Bài 5.** Với mỗi khách đã mua từ 2 đơn trở lên, tìm khoảng cách ngắn nhất (số ngày) giữa hai đơn liên tiếp. In 3 khách quay lại nhanh nhất.

<details>
<summary>Đáp án</summary>

```sql
WITH khoang_cach AS (
    SELECT customer_id,
           order_date::date - LAG(order_date::date)
               OVER (PARTITION BY customer_id ORDER BY order_date) AS so_ngay
    FROM orders
    WHERE status NOT IN ('pending', 'cancelled')
)
SELECT kc.customer_id,
       c.full_name,
       MIN(kc.so_ngay) AS nhanh_nhat
FROM khoang_cach kc
JOIN customers c ON c.customer_id = kc.customer_id
WHERE kc.so_ngay IS NOT NULL
GROUP BY kc.customer_id, c.full_name
ORDER BY nhanh_nhat, kc.customer_id
LIMIT 3;
```

Kết quả:

| customer_id | full_name | nhanh_nhat |
| --- | --- | --- |
| 1 | Nguyễn Văn An | 33 |
| 2 | Trần Thị Bình | 92 |
| 6 | Võ Quốc Phong | 154 |

Đơn đầu tiên của mỗi khách có `so_ngay` là NULL, nên `WHERE kc.so_ngay IS NOT NULL` cũng tự loại khách chỉ có một đơn. Lưu ý: lọc NULL phải làm ở truy vấn ngoài, sau khi `LAG` đã tính xong.
</details>

**Bài 6.** Doanh số bán hàng offline của từng nhân viên (đơn có `employee_id`), tỷ trọng trên tổng doanh số offline và thứ hạng.

<details>
<summary>Đáp án</summary>

```sql
WITH doanh_so AS (
    SELECT e.full_name,
           ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))) AS doanh_so
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    JOIN employees e    ON e.employee_id = o.employee_id
    WHERE o.status NOT IN ('pending', 'cancelled')
    GROUP BY e.employee_id, e.full_name
)
SELECT full_name,
       doanh_so,
       ROUND(100.0 * doanh_so / SUM(doanh_so) OVER (), 1) AS pct,
       RANK() OVER (ORDER BY doanh_so DESC) AS hang
FROM doanh_so
ORDER BY hang;
```

Kết quả:

| full_name | doanh_so | pct | hang |
| --- | --- | --- | --- |
| Vũ Hoài Nam | 82907500 | 39.2 | 1 |
| Phạm Thị Thu | 63700000 | 30.1 | 2 |
| Đỗ Minh Tuấn | 63401000 | 30.0 | 3 |
| Kiều Anh Thư | 1640000 | 0.8 | 4 |
</details>

**Bài 7.** Mỗi năm, tìm 2 tháng có doanh thu cao nhất. Nếu có tháng đồng hạng thì giữ cả hai.

<details>
<summary>Đáp án</summary>

```sql
WITH doanh_thu_thang AS (
    SELECT DATE_TRUNC('month', o.order_date)::date AS thang,
           ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))) AS doanh_thu
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status NOT IN ('pending', 'cancelled')
    GROUP BY DATE_TRUNC('month', o.order_date)
),
xep_hang AS (
    SELECT thang,
           doanh_thu,
           RANK() OVER (PARTITION BY EXTRACT(YEAR FROM thang)
                        ORDER BY doanh_thu DESC) AS hang
    FROM doanh_thu_thang
)
SELECT EXTRACT(YEAR FROM thang) AS nam,
       to_char(thang, 'YYYY-MM') AS thang,
       doanh_thu,
       hang
FROM xep_hang
WHERE hang <= 2
ORDER BY nam, hang;
```

Kết quả:

| nam | thang | doanh_thu | hang |
| --- | --- | --- | --- |
| 2025 | 2025-06 | 50769000 | 1 |
| 2025 | 2025-12 | 49661000 | 2 |
| 2026 | 2026-10 | 39980000 | 1 |
| 2026 | 2026-01 | 34030500 | 2 |

Dùng `RANK` thay vì `ROW_NUMBER` để tháng đồng hạng không bị cắt mất. Năm 2026 mới có dữ liệu tới tháng 10.
</details>

### Thử thách

**Bài 8.** Tính doanh thu theo **danh mục gốc** (cấp 1), gộp từ toàn bộ cây con của nó, kèm tỷ trọng. Danh mục gốc chưa bán được gì vẫn phải hiện với doanh thu 0.

<details>
<summary>Đáp án</summary>

Ý tưởng: CTE đệ quy gắn mỗi danh mục với id gốc của nó (truyền `goc_id` xuống từ phần neo), rồi LEFT JOIN với doanh thu bán hàng.

```sql
WITH RECURSIVE goc AS (
    SELECT category_id, category_id AS goc_id
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    SELECT c.category_id, g.goc_id
    FROM categories c
    JOIN goc g ON c.parent_id = g.category_id
),
ban_hang AS (
    SELECT oi.product_id,
           oi.quantity * oi.unit_price * (1 - oi.discount) AS tien
    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    WHERE o.status NOT IN ('pending', 'cancelled')
),
doanh_thu_goc AS (
    SELECT g.goc_id,
           COALESCE(ROUND(SUM(bh.tien)), 0) AS doanh_thu
    FROM goc g
    LEFT JOIN products p  ON p.category_id = g.category_id
    LEFT JOIN ban_hang bh ON bh.product_id = p.product_id
    GROUP BY g.goc_id
)
SELECT c.name AS danh_muc_goc,
       d.doanh_thu,
       ROUND(100.0 * d.doanh_thu / SUM(d.doanh_thu) OVER (), 1) AS pct
FROM doanh_thu_goc d
JOIN categories c ON c.category_id = d.goc_id
ORDER BY d.doanh_thu DESC;
```

Kết quả:

| danh_muc_goc | doanh_thu | pct |
| --- | --- | --- |
| Máy tính | 282181500 | 52.6 |
| Điện thoại & Tablet | 188452500 | 35.1 |
| Phụ kiện | 65657000 | 12.2 |
| Thiết bị mạng | 0 | 0.0 |

Tổng ba nhóm bằng 536291000, khớp với tổng doanh thu 22 tháng ở Bài 4. Lọc trạng thái đơn được đặt trong CTE `ban_hang` chứ không ở WHERE ngoài cùng, để LEFT JOIN không biến thành INNER JOIN (bẫy đã gặp ở Ngày 10).
</details>

**Bài 9.** Với mỗi nhân viên có cấp dưới, tính tổng số cấp dưới (mọi cấp) và tổng lương của cả nhóm (gồm chính người đó). Chỉ dùng **một** CTE đệ quy cho tất cả nhân viên.

<details>
<summary>Đáp án</summary>

Mẹo: phần neo lấy **mọi** nhân viên làm trưởng nhóm của chính mình, rồi đệ quy đi xuống, cột `truong_nhom` được giữ nguyên qua các vòng.

```sql
WITH RECURSIVE nhom AS (
    SELECT employee_id AS truong_nhom, employee_id, salary
    FROM employees

    UNION ALL

    SELECT n.truong_nhom, e.employee_id, e.salary
    FROM employees e
    JOIN nhom n ON e.manager_id = n.employee_id
)
SELECT e.full_name,
       COUNT(*) - 1 AS so_cap_duoi,
       SUM(n.salary) AS tong_luong_ca_nhom
FROM nhom n
JOIN employees e ON e.employee_id = n.truong_nhom
GROUP BY n.truong_nhom, e.full_name
HAVING COUNT(*) > 1
ORDER BY so_cap_duoi DESC, e.full_name;
```

Kết quả:

| full_name | so_cap_duoi | tong_luong_ca_nhom |
| --- | --- | --- |
| Nguyễn Thành Long | 7 | 151000000 |
| Lê Thị Hạnh | 4 | 66000000 |
| Phạm Thị Thu | 1 | 17000000 |
| Trần Quốc Bảo | 1 | 40000000 |

`COUNT(*) - 1` trừ chính trưởng nhóm; `HAVING COUNT(*) > 1` bỏ những người không có cấp dưới.
</details>

---
