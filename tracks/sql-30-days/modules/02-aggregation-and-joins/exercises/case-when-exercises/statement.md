> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Bài 1-6 chỉ đọc dữ liệu. Bài 7 sửa dữ liệu nên phải chạy trong `BEGIN ... ROLLBACK`.

### Cơ bản

**Bài 1.** Phân loại khách theo độ đầy đủ thông tin liên hệ: "Thiếu cả email và SĐT", "Thiếu email", "Thiếu SĐT", "Đủ thông tin". Đếm số khách mỗi loại, nhiều nhất lên đầu.

> Gợi ý: nhánh `WHEN` nào đúng trước sẽ thắng, nên điều kiện hẹp nhất (thiếu cả hai) phải đứng đầu.

<details>
<summary>Đáp án</summary>

```sql
SELECT CASE
           WHEN email IS NULL AND phone IS NULL THEN 'Thiếu cả email và SĐT'
           WHEN email IS NULL                   THEN 'Thiếu email'
           WHEN phone IS NULL                   THEN 'Thiếu SĐT'
           ELSE 'Đủ thông tin'
       END AS lien_he,
       COUNT(*) AS so_khach
FROM customers
GROUP BY lien_he
ORDER BY so_khach DESC;
```

Kết quả:

| lien_he | so_khach |
| --- | --- |
| Đủ thông tin | 13 |
| Thiếu SĐT | 3 |
| Thiếu email | 1 |
| Thiếu cả email và SĐT | 1 |

Nhánh "thiếu cả hai" phải đứng đầu, nếu không khách 17 sẽ bị xếp vào "Thiếu email".

</details>

**Bài 2.** Thống kê thanh toán theo hình thức, hiển thị tên tiếng Việt: `cash` là "Tiền mặt", `card` là "Thẻ", `momo` là "Ví MoMo", `bank_transfer` là "Chuyển khoản". Hiện số lần và tổng tiền, sắp theo tổng tiền giảm dần. Dùng `CASE` dạng đơn giản.

<details>
<summary>Đáp án</summary>

```sql
SELECT CASE method
           WHEN 'cash'          THEN 'Tiền mặt'
           WHEN 'card'          THEN 'Thẻ'
           WHEN 'momo'          THEN 'Ví MoMo'
           WHEN 'bank_transfer' THEN 'Chuyển khoản'
       END AS hinh_thuc,
       COUNT(*)    AS so_lan,
       SUM(amount) AS tong_tien
FROM payments
GROUP BY method
ORDER BY tong_tien DESC;
```

Kết quả:

| hinh_thuc | so_lan | tong_tien |
| --- | --- | --- |
| Chuyển khoản | 8 | 166691500 |
| Ví MoMo | 14 | 157951000 |
| Thẻ | 7 | 112317500 |
| Tiền mặt | 8 | 99331000 |

`GROUP BY method` rồi mới đổi tên trong `SELECT` là hợp lệ, vì `CASE` chỉ dùng cột `method` đã có trong `GROUP BY`.

</details>

**Bài 3.** Đếm khách theo nhóm năm sinh: "Trước 1990", "1990 - 1999", "Từ 2000", "Chưa rõ" (không có `birth_date`). Sắp từ nhóm lớn tuổi nhất, "Chưa rõ" ở cuối.

> Gợi ý: để sắp theo tuổi mà không sắp theo chữ cái, thử `ORDER BY MIN(birth_date)` của mỗi nhóm.

<details>
<summary>Đáp án</summary>

```sql
SELECT CASE
           WHEN birth_date IS NULL        THEN 'Chưa rõ'
           WHEN birth_date < '1990-01-01' THEN 'Trước 1990'
           WHEN birth_date < '2000-01-01' THEN '1990 - 1999'
           ELSE 'Từ 2000'
       END AS nhom_nam_sinh,
       COUNT(*) AS so_khach
FROM customers
GROUP BY nhom_nam_sinh
ORDER BY MIN(birth_date) NULLS LAST;
```

Kết quả:

| nhom_nam_sinh | so_khach |
| --- | --- |
| Trước 1990 | 1 |
| 1990 - 1999 | 5 |
| Từ 2000 | 9 |
| Chưa rõ | 3 |

Nếu bỏ nhánh `IS NULL`, ba khách không có ngày sinh sẽ trượt mọi so sánh (kết quả `NULL`) và rơi vào `ELSE`, bị tính nhầm là "Từ 2000".

</details>

### Vận dụng

**Bài 4.** Xếp hạng khách theo tổng chi tiêu trên đơn đã thanh toán (`status NOT IN ('pending', 'cancelled')`): từ 50 triệu là "VIP", từ 20 triệu là "Thân thiết", có mua là "Thường", chưa có đơn đã thanh toán nào là "Chưa mua". Hiện mọi khách, kể cả khách chưa mua, sắp theo chi tiêu giảm dần.

> Gợi ý: tính tổng chi tiêu mỗi khách trong một CTE, rồi đi từ `customers` bằng `LEFT JOIN` để giữ cả khách chưa mua.

<details>
<summary>Đáp án</summary>

```sql
WITH chi_tieu AS (
    SELECT o.customer_id,
           SUM(oi.quantity * oi.unit_price * (1 - oi.discount)) AS tong_chi
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status NOT IN ('pending', 'cancelled')
    GROUP BY o.customer_id
)
SELECT c.customer_id, c.full_name,
       COALESCE(ROUND(ct.tong_chi), 0) AS tong_chi,
       CASE
           WHEN ct.tong_chi IS NULL     THEN 'Chưa mua'
           WHEN ct.tong_chi >= 50000000 THEN 'VIP'
           WHEN ct.tong_chi >= 20000000 THEN 'Thân thiết'
           ELSE 'Thường'
       END AS hang
FROM customers c
LEFT JOIN chi_tieu ct ON ct.customer_id = c.customer_id
ORDER BY tong_chi DESC, c.customer_id;
```

Kết quả:

| customer_id | full_name | tong_chi | hang |
| --- | --- | --- | --- |
| 10 | Dương Minh Khoa | 63220500 | VIP |
| 15 | Nguyễn Văn An | 58970000 | VIP |
| 2 | Trần Thị Bình | 58262500 | VIP |
| 18 | Mai Đức Uy | 46980000 | Thân thiết |
| 14 | Huỳnh Tấn Phát | 45880500 | Thân thiết |
| ... | ... | ... | ... |
| 16 | Tạ Quang Sơn | 0 | Chưa mua |
| 17 | Châu Ngọc Trâm | 0 | Chưa mua |

(tổng 18 dòng: 3 VIP, 8 Thân thiết, 5 Thường, 2 Chưa mua)

Tính tổng trong CTE trước rồi mới `LEFT JOIN` để khách chưa mua vẫn có mặt. Nhánh `IS NULL` phải đứng đầu: so sánh `NULL >= 50000000` cho `NULL` nên khách chưa mua sẽ trượt xuống `ELSE` và bị gắn nhầm "Thường".

</details>

**Bài 5.** Lập bảng doanh thu (đơn đã thanh toán) theo năm và quý: mỗi năm một dòng, mỗi quý một cột `q1` đến `q4`. Dùng `FILTER`. Gợi ý: `EXTRACT(QUARTER FROM ...)`.

<details>
<summary>Đáp án</summary>

```sql
SELECT EXTRACT(YEAR FROM o.order_date) AS nam,
       ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))
             FILTER (WHERE EXTRACT(QUARTER FROM o.order_date) = 1)) AS q1,
       ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))
             FILTER (WHERE EXTRACT(QUARTER FROM o.order_date) = 2)) AS q2,
       ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))
             FILTER (WHERE EXTRACT(QUARTER FROM o.order_date) = 3)) AS q3,
       ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))
             FILTER (WHERE EXTRACT(QUARTER FROM o.order_date) = 4)) AS q4
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status NOT IN ('pending', 'cancelled')
GROUP BY nam
ORDER BY nam;
```

Kết quả:

| nam | q1 | q2 | q3 | q4 |
| --- | --- | --- | --- | --- |
| 2025 | 42730000 | 109718500 | 64268500 | 109413500 |
| 2026 | 64080500 | 41389000 | 64711000 | 39980000 |

Quý 4/2026 mới có nửa tháng 10 nên còn thấp. Quý nào không có đơn thì `SUM ... FILTER` cho `NULL`; muốn hiện 0 thì bọc `COALESCE`.

</details>

**Bài 6.** Với mỗi danh mục có sản phẩm, cho biết: số sản phẩm, số sản phẩm hết hàng, số sản phẩm chưa có giá nhập (`cost_price` là `NULL`), và giá trị tồn kho tính theo giá bán của các sản phẩm còn kinh doanh. Sắp theo giá trị tồn kho giảm dần.

> Gợi ý: mỗi con số là một `COUNT(*) FILTER (WHERE ...)` hoặc `SUM(CASE ...)` trên cùng một `GROUP BY` danh mục.

<details>
<summary>Đáp án</summary>

```sql
SELECT c.name AS danh_muc,
       COUNT(*) AS so_sp,
       COUNT(*) FILTER (WHERE p.stock_quantity = 0) AS het_hang,
       COUNT(*) FILTER (WHERE p.cost_price IS NULL) AS thieu_gia_nhap,
       SUM(CASE WHEN p.is_active THEN p.stock_quantity * p.price ELSE 0 END) AS gia_tri_ton
FROM products p
JOIN categories c ON c.category_id = p.category_id
GROUP BY c.category_id, c.name
ORDER BY gia_tri_ton DESC;
```

Kết quả:

| danh_muc | so_sp | het_hang | thieu_gia_nhap | gia_tri_ton |
| --- | --- | --- | --- | --- |
| Điện thoại | 4 | 1 | 0 | 593010000 |
| Laptop văn phòng | 3 | 0 | 1 | 365820000 |
| Laptop gaming | 3 | 1 | 0 | 254920000 |
| Máy tính bảng | 2 | 0 | 0 | 151380000 |
| PC & Màn hình | 3 | 0 | 0 | 140760000 |
| Tai nghe & Loa | 3 | 1 | 0 | 135800000 |
| Chuột & Bàn phím | 4 | 0 | 1 | 109590000 |
| Sạc & Cáp | 2 | 0 | 0 | 65600000 |

</details>

### Thử thách

**Bài 7.** Shop chạy khuyến mãi: điện thoại (`category_id = 7`) giảm 5%, máy tính bảng (`category_id = 8`) giảm 8%, làm tròn đến nghìn đồng; sản phẩm ngừng kinh doanh không đổi giá. Viết câu `SELECT` xem trước giá cũ và giá mới, rồi viết `UPDATE` dùng `CASE`, chạy trong `BEGIN ... ROLLBACK`.

<details>
<summary>Đáp án</summary>

```sql
SELECT sku, name, price AS gia_cu,
       CASE category_id
           WHEN 7 THEN ROUND(price * 0.95, -3)
           WHEN 8 THEN ROUND(price * 0.92, -3)
       END AS gia_moi
FROM products
WHERE category_id IN (7, 8) AND is_active
ORDER BY sku;
```

Kết quả:

| sku | name | gia_cu | gia_moi |
| --- | --- | --- | --- |
| PHN-001 | iPhone 15 128GB | 19990000 | 18991000 |
| PHN-002 | Samsung Galaxy S24 | 18990000 | 18041000 |
| PHN-003 | Xiaomi Redmi Note 13 | 4890000 | 4646000 |
| TAB-001 | iPad Air M2 11 inch | 16990000 | 15631000 |
| TAB-002 | Samsung Galaxy Tab S9 FE | 9490000 | 8731000 |

```sql
BEGIN;

UPDATE products
SET price = CASE category_id
                WHEN 7 THEN ROUND(price * 0.95, -3)
                WHEN 8 THEN ROUND(price * 0.92, -3)
                ELSE price
            END
WHERE category_id IN (7, 8) AND is_active;
-- UPDATE 5

ROLLBACK;
```

`ELSE price` là lưới an toàn: kể cả khi `WHERE` bị sửa sai, dòng không thuộc nhánh nào vẫn giữ giá cũ thay vì thành `NULL`. Nokia 105 4G (`is_active = FALSE`) bị `WHERE` loại nên không đổi giá.

</details>

**Bài 8.** Tính biên lợi nhuận `(price - cost_price) / price` (phần trăm, 1 chữ số thập phân) cho từng sản phẩm và xếp mức: "Cao (từ 30%)", "Trung bình (15-30%)", "Thấp (dưới 15%)", "Chưa có giá nhập". Sắp theo biên lợi nhuận giảm dần, sản phẩm chưa có giá nhập ở cuối. Có cần `CASE` để xử lý `cost_price` `NULL` trong cột phần trăm không?

> Gợi ý: phép tính có `cost_price` là `NULL` sẽ ra `NULL`. Nhánh nào của `CASE` phải đứng đầu?

<details>
<summary>Đáp án</summary>

```sql
SELECT sku, name, price, cost_price,
       ROUND(100.0 * (price - cost_price) / price, 1) AS bien_ln_pct,
       CASE
           WHEN cost_price IS NULL                   THEN 'Chưa có giá nhập'
           WHEN (price - cost_price) >= 0.30 * price THEN 'Cao (từ 30%)'
           WHEN (price - cost_price) >= 0.15 * price THEN 'Trung bình (15-30%)'
           ELSE 'Thấp (dưới 15%)'
       END AS muc_bien
FROM products
ORDER BY bien_ln_pct DESC NULLS LAST, sku;
```

Kết quả:

| sku | name | price | cost_price | bien_ln_pct | muc_bien |
| --- | --- | --- | --- | --- | --- |
| ACC-008 | Cáp USB-C to USB-C 1m | 150000 | 60000 | 60.0 | Cao (từ 30%) |
| ACC-001 | Chuột Logitech G102 | 399000 | 250000 | 37.3 | Cao (từ 30%) |
| ACC-007 | Sạc Anker 65W | 890000 | 600000 | 32.6 | Cao (từ 30%) |
| PHN-004 | Nokia 105 4G | 690000 | 500000 | 27.5 | Trung bình (15-30%) |
| ... | ... | ... | ... | ... | ... |
| TAB-001 | iPad Air M2 11 inch | 16990000 | 15000000 | 11.7 | Thấp (dưới 15%) |
| ACC-009 | Lót chuột DSC XXL | 250000 | NULL | NULL | Chưa có giá nhập |
| LAP-006 | HP Pavilion 15 | 16990000 | NULL | NULL | Chưa có giá nhập |

(tổng 24 dòng: 3 Cao, 9 Trung bình, 10 Thấp, 2 Chưa có giá nhập)

Cột phần trăm không cần `CASE`: phép tính có `NULL` tự cho `NULL`. Cột `muc_bien` thì cần nhánh `IS NULL` đứng đầu, nếu không các so sánh với `NULL` đều không đúng và hai sản phẩm này rơi vào `ELSE` thành "Thấp".

</details>
