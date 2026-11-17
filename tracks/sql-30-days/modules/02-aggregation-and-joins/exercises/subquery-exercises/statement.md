> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

### Cơ bản

**Bài 1.** Liệt kê các sản phẩm có giá thấp hơn giá trung bình của cửa hàng, sắp xếp giá giảm dần.

<details>
<summary>Đáp án</summary>

```sql
SELECT sku, name, price
FROM products
WHERE price < (SELECT AVG(price) FROM products)
ORDER BY price DESC;
```

Kết quả:

| sku | name | price |
| --- | --- | --- |
| PC-003 | PC văn phòng DSC Basic | 9990000 |
| TAB-002 | Samsung Galaxy Tab S9 FE | 9490000 |
| ACC-004 | Tai nghe Sony WH-1000XM5 | 7990000 |
| PC-001 | Màn hình LG UltraGear 27 inch | 6490000 |
| ACC-005 | Tai nghe AirPods Pro 2 | 5990000 |
| ... | ... | ... |
| ACC-008 | Cáp USB-C to USB-C 1m | 150000 |

(... tổng 15 dòng)
</details>

**Bài 2.** Khách nào đã từng đặt mua một sản phẩm thuộc danh mục `Laptop gaming`? Dùng `IN`, không dùng `JOIN` ở truy vấn ngoài.

<details>
<summary>Đáp án</summary>

```sql
SELECT customer_id, full_name
FROM customers
WHERE customer_id IN (
    SELECT o.customer_id
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE oi.product_id IN (
        SELECT p.product_id
        FROM products p
        JOIN categories c ON c.category_id = p.category_id
        WHERE c.name = 'Laptop gaming'
    )
)
ORDER BY customer_id;
```

Kết quả:

| customer_id | full_name |
| --- | --- |
| 4 | Phạm Minh Duy |
| 6 | Võ Quốc Phong |
| 10 | Dương Minh Khoa |
| 14 | Huỳnh Tấn Phát |
| 18 | Mai Đức Uy |

Khách 4 có mặt vì đơn 5 (ASUS ROG) dù sau đó bị hủy; đề hỏi "đã từng đặt mua" nên vẫn tính.
</details>

**Bài 3.** Dùng `NOT EXISTS` tìm sản phẩm chưa từng xuất hiện trong đơn hàng nào.

<details>
<summary>Đáp án</summary>

```sql
SELECT p.sku, p.name
FROM products p
WHERE NOT EXISTS (SELECT 1
                  FROM order_items oi
                  WHERE oi.product_id = p.product_id);
```

Kết quả:

| sku | name |
| --- | --- |
| ACC-009 | Lót chuột DSC XXL |
</details>

### Vận dụng

**Bài 4.** Liệt kê các đơn của khách 1: mã đơn, ngày, trạng thái và tổng tiền đơn. Tính tổng tiền bằng subquery tương quan trong `SELECT`.

<details>
<summary>Đáp án</summary>

```sql
SELECT o.order_id,
       o.order_date::date AS ngay,
       o.status,
       (SELECT ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount)))
        FROM order_items oi
        WHERE oi.order_id = o.order_id) AS tong_tien
FROM orders o
WHERE o.customer_id = 1
ORDER BY o.order_id;
```

Kết quả:

| order_id | ngay | status | tong_tien |
| --- | --- | --- | --- |
| 1 | 2025-01-12 | delivered | 699000 |
| 4 | 2025-02-14 | delivered | 7881000 |
| 13 | 2025-07-08 | delivered | 2230000 |
| 25 | 2025-12-24 | delivered | 24980000 |
| 37 | 2026-09-02 | shipped | 9640000 |
</details>

**Bài 5.** Với mỗi danh mục có sản phẩm, tìm sản phẩm đắt nhất của danh mục đó.

> Gợi ý: so giá của mỗi sản phẩm với `MAX(price)` của chính danh mục đó (subquery tương quan).

<details>
<summary>Đáp án</summary>

```sql
SELECT p.category_id, p.sku, p.name, p.price
FROM products p
WHERE p.price = (SELECT MAX(p2.price)
                 FROM products p2
                 WHERE p2.category_id = p.category_id)
ORDER BY p.category_id;
```

Kết quả:

| category_id | sku | name | price |
| --- | --- | --- | --- |
| 3 | LAP-001 | ASUS ROG Strix G16 | 32990000 |
| 4 | LAP-005 | MacBook Air M2 13 inch | 24990000 |
| 5 | PC-003 | PC văn phòng DSC Basic | 9990000 |
| 7 | PHN-001 | iPhone 15 128GB | 19990000 |
| 8 | TAB-001 | iPad Air M2 11 inch | 16990000 |
| 10 | ACC-002 | Chuột Logitech MX Master 3S | 2490000 |
| 11 | ACC-004 | Tai nghe Sony WH-1000XM5 | 7990000 |
| 12 | ACC-007 | Sạc Anker 65W | 890000 |

Nếu hai sản phẩm cùng danh mục bằng giá cao nhất, cả hai đều được in. Đây là bài "top-1 mỗi nhóm"; Ngày 29 có cách tổng quát hơn với window function.
</details>

**Bài 6.** Trong năm 2025, tháng nào có nhiều đơn nhất (tính mọi trạng thái)? Nếu nhiều tháng bằng nhau thì in hết. Dùng CTE.

> Gợi ý: CTE đếm số đơn mỗi tháng, rồi so với `MAX` của chính CTE đó.

<details>
<summary>Đáp án</summary>

```sql
WITH theo_thang AS (
    SELECT DATE_TRUNC('month', order_date)::date AS thang,
           COUNT(*) AS so_don
    FROM orders
    WHERE order_date >= '2025-01-01'
      AND order_date <  '2026-01-01'
    GROUP BY DATE_TRUNC('month', order_date)
)
SELECT thang, so_don
FROM theo_thang
WHERE so_don = (SELECT MAX(so_don) FROM theo_thang)
ORDER BY thang;
```

Kết quả:

| thang | so_don |
| --- | --- |
| 2025-09-01 | 3 |
| 2025-11-01 | 3 |

Dùng `ORDER BY so_don DESC LIMIT 1` sẽ chỉ in một trong hai tháng, mất tháng còn lại.
</details>

### Thử thách

**Bài 7.** Tìm khách chỉ mua online: đã có ít nhất một đơn, nhưng chưa từng có đơn `offline`.

> Gợi ý: cần hai điều kiện cùng lúc: `EXISTS` (có đơn) và `NOT EXISTS` (có đơn offline).

<details>
<summary>Đáp án</summary>

```sql
SELECT c.customer_id, c.full_name
FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o
              WHERE o.customer_id = c.customer_id)
  AND NOT EXISTS (SELECT 1 FROM orders o
                  WHERE o.customer_id = c.customer_id
                    AND o.channel = 'offline')
ORDER BY c.customer_id;
```

Kết quả:

| customer_id | full_name |
| --- | --- |
| 13 | Phan Thị Oanh |
| 14 | Huỳnh Tấn Phát |
| 15 | Nguyễn Văn An |

Thiếu điều kiện `EXISTS` thứ nhất thì khách 16, 17 (chưa mua gì) cũng lọt vào, vì họ cũng "chưa từng mua offline".
</details>

**Bài 8.** Danh mục nào chiếm trên 20% tổng doanh thu (đơn có `status NOT IN ('pending', 'cancelled')`)? In doanh thu và tỷ lệ phần trăm, làm tròn 1 chữ số thập phân.

> Gợi ý: CTE tính doanh thu từng danh mục, rồi so mỗi dòng với tổng của chính CTE đó bằng subquery vô hướng.

<details>
<summary>Đáp án</summary>

```sql
WITH doanh_thu AS (
    SELECT cat.name AS danh_muc,
           SUM(oi.quantity * oi.unit_price * (1 - oi.discount)) AS tien
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    JOIN products p     ON p.product_id = oi.product_id
    JOIN categories cat ON cat.category_id = p.category_id
    WHERE o.status NOT IN ('pending', 'cancelled')
    GROUP BY cat.category_id, cat.name
)
SELECT danh_muc,
       ROUND(tien) AS doanh_thu,
       ROUND(100 * tien / (SELECT SUM(tien) FROM doanh_thu), 1) AS ty_le_phan_tram
FROM doanh_thu
WHERE tien > 0.2 * (SELECT SUM(tien) FROM doanh_thu)
ORDER BY tien DESC;
```

Kết quả:

| danh_muc | doanh_thu | ty_le_phan_tram |
| --- | --- | --- |
| Điện thoại | 135492500 | 25.3 |
| Laptop gaming | 135151000 | 25.2 |
</details>
