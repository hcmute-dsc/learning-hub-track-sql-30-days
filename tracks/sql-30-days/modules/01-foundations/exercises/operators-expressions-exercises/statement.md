> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

### Cơ bản

**Bài 1.** Cửa hàng giảm giá 15% cho điện thoại (`category_id = 7`). Hiển thị `sku`, `name`, `price` và giá sau giảm làm tròn tới nghìn đồng (`gia_sale`), đắt trước.

<details>
<summary>Đáp án</summary>

```sql
SELECT sku,
       name,
       price,
       ROUND(price * 0.85, -3) AS gia_sale
FROM products
WHERE category_id = 7
ORDER BY price DESC;
```

Kết quả:

| sku | name | price | gia_sale |
| --- | --- | --- | --- |
| PHN-001 | iPhone 15 128GB | 19990000 | 16992000 |
| PHN-002 | Samsung Galaxy S24 | 18990000 | 16142000 |
| PHN-003 | Xiaomi Redmi Note 13 | 4890000 | 4157000 |
| PHN-004 | Nokia 105 4G | 690000 | 587000 |

</details>

**Bài 2.** In danh bạ dạng `Tên <email>` cho 5 khách đầu tiên (id 1 đến 5). Khách không có email thì hiện `<không có email>`.

<details>
<summary>Đáp án</summary>

```sql
SELECT full_name || ' <' || COALESCE(email, 'không có email') || '>' AS lien_he
FROM customers
WHERE customer_id <= 5
ORDER BY customer_id;
```

Kết quả:

| lien_he |
| --- |
| Nguyễn Văn An &lt;an.nguyen@gmail.com&gt; |
| Trần Thị Bình &lt;binh.tran@gmail.com&gt; |
| Lê Hoàng Cường &lt;cuong.le@outlook.com&gt; |
| Phạm Minh Duy &lt;duy.pham@gmail.com&gt; |
| Hoàng Thị Em &lt;không có email&gt; |

Thiếu `COALESCE` thì dòng của Hoàng Thị Em thành `NULL` vì `||` gặp `NULL`.

</details>

**Bài 3.** Liệt kê các đơn đặt vào cuối tuần (thứ Bảy, Chủ nhật) từ đầu năm 2026. Hiển thị ngày dạng `DD/MM/YYYY` và số thứ trong tuần.

<details>
<summary>Đáp án</summary>

```sql
SELECT order_id,
       TO_CHAR(order_date, 'DD/MM/YYYY') AS ngay,
       EXTRACT(ISODOW FROM order_date)   AS thu_trong_tuan
FROM orders
WHERE EXTRACT(ISODOW FROM order_date) IN (6, 7)
  AND order_date >= '2026-01-01'
ORDER BY order_date;
```

Kết quả:

| order_id | ngay | thu_trong_tuan |
| --- | --- | --- |
| 30 | 15/03/2026 | 7 |
| 36 | 08/08/2026 | 6 |
| 38 | 20/09/2026 | 7 |

`ISODOW` đánh số thứ Hai là 1, Chủ nhật là 7. (Còn `DOW` đánh số Chủ nhật là 0.) Sắp xếp theo `order_date` gốc, không theo chuỗi `ngay`.

</details>

### Vận dụng

**Bài 4.** Năm khách hàng trẻ nhất (đã khai ngày sinh) và tuổi của họ, tính tại ngày 17/10/2026.

<details>
<summary>Đáp án</summary>

```sql
SELECT full_name,
       birth_date,
       EXTRACT(YEAR FROM AGE(DATE '2026-10-17', birth_date)) AS tuoi
FROM customers
WHERE birth_date IS NOT NULL
ORDER BY birth_date DESC
LIMIT 5;
```

Kết quả:

| full_name | birth_date | tuoi |
| --- | --- | --- |
| Dương Minh Khoa | 2005-02-14 | 21 |
| Huỳnh Tấn Phát | 2004-08-20 | 22 |
| Võ Quốc Phong | 2004-05-12 | 22 |
| Phạm Minh Duy | 2003-01-30 | 23 |
| Tạ Quang Sơn | 2002-12-12 | 23 |

Trẻ nhất là sinh muộn nhất, nên sắp `birth_date DESC`. Đừng sắp theo `tuoi`: Phát và Phong cùng 22 tuổi, nên `ORDER BY tuoi` không quyết định ai đứng trước (thiếu cột phá hòa, như [Ngày 4](../../lessons/04-order-by-limit.md) đã cảnh báo). Thiếu `WHERE birth_date IS NOT NULL` thì `DESC` đặt `NULL` lên đầu, nên điều kiện này là bắt buộc.

</details>

**Bài 5.** Tính biên lợi nhuận theo phần trăm của các laptop (danh mục 3, 4): `(price - cost_price) / cost_price * 100`, làm tròn 1 chữ số thập phân. Sắp biên cao nhất trước, sản phẩm chưa có giá nhập xuống cuối.

<details>
<summary>Đáp án</summary>

```sql
SELECT sku,
       name,
       price,
       cost_price,
       ROUND((price - cost_price) * 100.0 / cost_price, 1) AS bien_loi_nhuan_pct
FROM products
WHERE category_id IN (3, 4)
ORDER BY bien_loi_nhuan_pct DESC NULLS LAST;
```

Kết quả:

| sku | name | price | cost_price | bien_loi_nhuan_pct |
| --- | --- | --- | --- | --- |
| LAP-001 | ASUS ROG Strix G16 | 32990000 | 28500000 | 15.8 |
| LAP-003 | Acer Nitro V 15 | 21990000 | 19000000 | 15.7 |
| LAP-004 | Dell Inspiron 14 | 18490000 | 16000000 | 15.6 |
| LAP-002 | Lenovo Legion 5 | 29990000 | 26000000 | 15.3 |
| LAP-005 | MacBook Air M2 13 inch | 24990000 | 22000000 | 13.6 |
| LAP-006 | HP Pavilion 15 | 16990000 | NULL | NULL |

`price` và `cost_price` là `NUMERIC` nên không bị chia nguyên; viết `100.0` vẫn là thói quen tốt.

</details>

**Bài 6.** Cũng bảng trên nhưng hiển thị biên lợi nhuận thành chữ, ví dụ `15.8%`; sản phẩm chưa có giá nhập ghi `chưa có giá nhập`. Sắp theo `sku`.

> Gợi ý: `COALESCE` cần các đối số cùng kiểu: ép số sang `TEXT` trước khi nối `'%'`.

<details>
<summary>Đáp án</summary>

`COALESCE` cần các đối số cùng kiểu, nên phải ép số sang `TEXT` trước khi nối `%`:

```sql
SELECT sku,
       COALESCE(ROUND((price - cost_price) * 100.0 / cost_price, 1)::TEXT || '%',
                'chưa có giá nhập') AS bien_loi_nhuan
FROM products
WHERE category_id IN (3, 4)
ORDER BY sku;
```

Kết quả:

| sku | bien_loi_nhuan |
| --- | --- |
| LAP-001 | 15.8% |
| LAP-002 | 15.3% |
| LAP-003 | 15.7% |
| LAP-004 | 15.6% |
| LAP-005 | 13.6% |
| LAP-006 | chưa có giá nhập |

Với `LAP-006`, cả biểu thức `ROUND(...)::TEXT || '%'` là `NULL` (vì `||` gặp `NULL`), nên `COALESCE` chuyển sang đối số thứ hai. Ở đây tính chất "NULL lan truyền" lại có ích.

</details>

**Bài 7.** Che số điện thoại khi hiển thị: giữ 4 số đầu và 3 số cuối, giữa là `***` (ví dụ `0901***567`). Khách không có số thì hiện `ẩn`. Làm cho khách id 1 đến 6.

> Gợi ý: `LEFT(s, n)` và `RIGHT(s, n)` lấy n ký tự đầu/cuối; `||` gặp NULL thì cả chuỗi thành NULL.

<details>
<summary>Đáp án</summary>

```sql
SELECT full_name,
       COALESCE(LEFT(phone, 4) || '***' || RIGHT(phone, 3), 'ẩn') AS phone_che
FROM customers
WHERE customer_id <= 6
ORDER BY customer_id;
```

Kết quả:

| full_name | phone_che |
| --- | --- |
| Nguyễn Văn An | 0901***567 |
| Trần Thị Bình | 0912***678 |
| Lê Hoàng Cường | ẩn |
| Phạm Minh Duy | 0987***321 |
| Hoàng Thị Em | 0934***890 |
| Võ Quốc Phong | 0976***210 |

Viết bằng `SUBSTRING` cũng được: `SUBSTRING(phone FROM 1 FOR 4) || '***' || SUBSTRING(phone FROM LENGTH(phone) - 2)`.

</details>

### Thử thách

**Bài 8.** Tìm mọi khách ở Đà Nẵng, bất kể viết hoa hay thường, có khoảng trắng thừa hay không. Không được liệt kê từng cách viết.

<details>
<summary>Đáp án</summary>

```sql
SELECT customer_id,
       full_name,
       city
FROM customers
WHERE LOWER(TRIM(city)) = 'đà nẵng'
ORDER BY customer_id;
```

Kết quả:

| customer_id | full_name | city |
| --- | --- | --- |
| 3 | Lê Hoàng Cường | Đà Nẵng |
| 8 | Bùi Văn Hùng | đà nẵng |
| 18 | Mai Đức Uy | Đà Nẵng |

Đưa cả hai vế về cùng một dạng (`LOWER`) rồi mới so sánh. `city ILIKE 'đà nẵng'` cũng cho cùng kết quả nhưng không xử lý khoảng trắng thừa.

</details>

**Bài 9.** Với các đơn chưa giao xong (`pending`, `paid`, `shipped`), cửa hàng cam kết giao trong 3 ngày kể từ lúc đặt. Hiển thị hạn giao (dạng `DD/MM/YYYY`) và số ngày khách đã chờ tính đến ngày 17/10/2026, đơn cũ nhất trước.

> Gợi ý: trừ hai `DATE` ra số ngày nguyên; `order_date::date` bỏ phần giờ.

<details>
<summary>Đáp án</summary>

```sql
SELECT order_id,
       order_date,
       TO_CHAR(order_date + INTERVAL '3 days', 'DD/MM/YYYY') AS han_giao,
       DATE '2026-10-17' - order_date::date AS so_ngay_cho
FROM orders
WHERE status IN ('pending', 'paid', 'shipped')
ORDER BY order_date;
```

Kết quả:

| order_id | order_date | han_giao | so_ngay_cho |
| --- | --- | --- | --- |
| 37 | 2026-09-02 10:00:00+07 | 05/09/2026 | 45 |
| 38 | 2026-09-20 16:30:00+07 | 23/09/2026 | 27 |
| 39 | 2026-10-05 09:00:00+07 | 08/10/2026 | 12 |
| 40 | 2026-10-14 22:00:00+07 | 17/10/2026 | 3 |

`order_date::date` bỏ phần giờ để phép trừ hai `DATE` ra số ngày nguyên. Trong ứng dụng thật, thay `DATE '2026-10-17'` bằng `CURRENT_DATE`.

</details>
