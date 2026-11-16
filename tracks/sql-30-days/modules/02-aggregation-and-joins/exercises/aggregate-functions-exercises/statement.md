> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Tất cả chạy trên dữ liệu gốc của DSC Shop.

### Cơ bản

**Bài 1.** Đếm số sản phẩm đang kinh doanh (`is_active = TRUE`) và còn hàng.

<details>
<summary>Đáp án</summary>

```sql
SELECT COUNT(*) AS dang_ban_con_hang
FROM products
WHERE is_active = TRUE
  AND stock_quantity > 0;
```

Kết quả:

| dang_ban_con_hang |
| --- |
| 21 |
</details>

**Bài 2.** Với danh mục `Điện thoại` (`category_id = 7`), tìm giá thấp nhất, cao nhất và giá trung bình làm tròn đến đồng.

<details>
<summary>Đáp án</summary>

```sql
SELECT MIN(price)        AS re_nhat,
       MAX(price)        AS dat_nhat,
       ROUND(AVG(price)) AS gia_tb
FROM products
WHERE category_id = 7;
```

Kết quả:

| re_nhat | dat_nhat | gia_tb |
| --- | --- | --- |
| 690000 | 19990000 | 11140000 |
</details>

**Bài 3.** Trong năm 2025 (theo `order_date`) có bao nhiêu đơn, bao nhiêu khách khác nhau đặt hàng, đơn đầu tiên và đơn cuối cùng vào lúc nào? Dùng điều kiện khoảng, không dùng hàm trên cột ngày.

<details>
<summary>Đáp án</summary>

```sql
SELECT COUNT(*)                    AS so_don,
       COUNT(DISTINCT customer_id) AS so_khach,
       MIN(order_date)             AS don_dau,
       MAX(order_date)             AS don_cuoi
FROM orders
WHERE order_date >= '2025-01-01'
  AND order_date <  '2026-01-01';
```

Kết quả:

| so_don | so_khach | don_dau | don_cuoi |
| --- | --- | --- | --- |
| 25 | 16 | 2025-01-12 10:15:00+07 | 2025-12-24 16:00:00+07 |
</details>

### Vận dụng

**Bài 4.** Tính tỉ lệ phần trăm khách hàng có email (làm tròn 1 chữ số), kèm số khách không có email. Chỉ dùng một câu `SELECT`, không dùng `WHERE`.

<details>
<summary>Đáp án</summary>

```sql
SELECT COUNT(*)                                AS tong_khach,
       COUNT(email)                            AS co_email,
       COUNT(*) - COUNT(email)                 AS khong_email,
       ROUND(100.0 * COUNT(email) / COUNT(*), 1) AS ti_le_co_email
FROM customers;
```

Kết quả:

| tong_khach | co_email | khong_email | ti_le_co_email |
| --- | --- | --- | --- |
| 18 | 16 | 2 | 88.9 |

Nhân `100.0` (số thập phân) trước khi chia để tránh phép chia nguyên `16 / 18 = 0` (Ngày 5).
</details>

**Bài 5.** Tính tổng tiền đơn 22 (cả hai món đều được giảm giá) từ `order_items`, làm tròn đến đồng, rồi đối chiếu với số tiền trong `payments`.

<details>
<summary>Đáp án</summary>

```sql
SELECT product_id, quantity, unit_price, discount
FROM order_items
WHERE order_id = 22;

SELECT ROUND(SUM(quantity * unit_price * (1 - discount))) AS tong_tien_don
FROM order_items
WHERE order_id = 22;

SELECT SUM(amount) AS da_thanh_toan
FROM payments
WHERE order_id = 22;
```

Kết quả:

| product_id | quantity | unit_price | discount |
| --- | --- | --- | --- |
| 20 | 1 | 5990000 | 0.15 |
| 12 | 1 | 4890000 | 0.10 |

| tong_tien_don |
| --- |
| 9492500 |

| da_thanh_toan |
| --- |
| 9492500 |

`5990000 * 0.85 + 4890000 * 0.90 = 5091500 + 4401000 = 9492500`.
</details>

**Bài 6.** Với các đơn `online`: có bao nhiêu đơn, bao nhiêu đơn có ghi `shipping_city`, và giao tới bao nhiêu thành phố khác nhau?

<details>
<summary>Đáp án</summary>

```sql
SELECT COUNT(*)                      AS so_don_online,
       COUNT(shipping_city)          AS co_dia_chi,
       COUNT(DISTINCT shipping_city) AS so_thanh_pho
FROM orders
WHERE channel = 'online';
```

Kết quả:

| so_don_online | co_dia_chi | so_thanh_pho |
| --- | --- | --- |
| 25 | 25 | 6 |

Mọi đơn online đều có địa chỉ giao; `shipping_city` chỉ NULL ở đơn offline (khách nhận tại cửa hàng).
</details>

**Bài 7.** Có bao nhiêu dòng hàng được giảm giá, và tổng số tiền cửa hàng đã giảm cho khách trên các dòng đó là bao nhiêu (làm tròn đến đồng)?

<details>
<summary>Đáp án</summary>

```sql
SELECT COUNT(*)                                  AS so_dong_giam_gia,
       ROUND(SUM(quantity * unit_price * discount)) AS tong_tien_giam
FROM order_items
WHERE discount > 0;
```

Kết quả:

| so_dong_giam_gia | tong_tien_giam |
| --- | --- |
| 9 | 9233000 |
</details>

### Thử thách

**Bài 8.** Giám đốc hỏi "giá trị trung bình mỗi lần thanh toán là bao nhiêu" và "trung bình mỗi đơn đã thanh toán trả bao nhiêu tiền". Tính cả hai trên `payments` trong một câu và giải thích vì sao khác nhau.

<details>
<summary>Đáp án</summary>

```sql
SELECT COUNT(*)                                     AS so_lan_tt,
       COUNT(DISTINCT order_id)                     AS so_don,
       SUM(amount)                                  AS tong,
       ROUND(AVG(amount))                           AS tb_moi_lan,
       ROUND(SUM(amount) / COUNT(DISTINCT order_id)) AS tb_moi_don
FROM payments;
```

Kết quả:

| so_lan_tt | so_don | tong | tb_moi_lan | tb_moi_don |
| --- | --- | --- | --- | --- |
| 37 | 36 | 536291000 | 14494351 | 14896972 |

`AVG(amount)` chia tổng cho 37 lần thanh toán. Đơn 12 trả góp 2 lần nên số đơn chỉ là 36; trung bình mỗi đơn phải chia cho `COUNT(DISTINCT order_id)`. Hai câu hỏi nghe giống nhau nhưng "đơn vị đếm" khác nhau.
</details>

**Bài 9.** Tính trên toàn bộ `order_items`: tổng giá trị hàng, số đơn, giá trị trung bình mỗi đơn và giá trị trung bình mỗi dòng hàng (làm tròn đến đồng). Vì sao không dùng `AVG(quantity * unit_price * (1 - discount))` làm "trung bình mỗi đơn"?

<details>
<summary>Đáp án</summary>

```sql
SELECT COUNT(DISTINCT order_id) AS so_don,
       ROUND(SUM(quantity * unit_price * (1 - discount)))                            AS tong_tien,
       ROUND(SUM(quantity * unit_price * (1 - discount)) / COUNT(DISTINCT order_id)) AS tb_moi_don,
       ROUND(AVG(quantity * unit_price * (1 - discount)))                            AS tb_moi_dong
FROM order_items;
```

Kết quả:

| so_don | tong_tien | tb_moi_don | tb_moi_dong |
| --- | --- | --- | --- |
| 40 | 579351000 | 14483775 | 9655850 |

`AVG` chia cho số dòng được tổng hợp, ở đây là 60 dòng hàng, nên ra trung bình một dòng (9.655.850). Một đơn có thể có 1 đến 3 dòng, nên trung bình mỗi đơn phải lấy tổng chia số đơn khác nhau (14.483.775). Bài này tính trên mọi đơn, kể cả đơn chờ và đơn hủy, nên `tong_tien` không phải doanh thu theo định nghĩa ở mục 6.
</details>
