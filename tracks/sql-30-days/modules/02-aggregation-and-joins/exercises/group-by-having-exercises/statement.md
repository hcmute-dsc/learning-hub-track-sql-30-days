> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

### Cơ bản

**Bài 1.** Đếm số sản phẩm trong mỗi danh mục (`category_id`), kèm giá thấp nhất và cao nhất của danh mục đó. Sắp xếp theo `category_id`.

<details>
<summary>Đáp án</summary>

```sql
SELECT category_id,
       COUNT(*)   AS so_san_pham,
       MIN(price) AS gia_thap_nhat,
       MAX(price) AS gia_cao_nhat
FROM products
GROUP BY category_id
ORDER BY category_id;
```

Kết quả:

| category_id | so_san_pham | gia_thap_nhat | gia_cao_nhat |
| --- | --- | --- | --- |
| 3 | 3 | 21990000 | 32990000 |
| 4 | 3 | 16990000 | 24990000 |
| 5 | 3 | 4290000 | 9990000 |
| 7 | 4 | 690000 | 19990000 |
| 8 | 2 | 9490000 | 16990000 |
| 10 | 4 | 250000 | 2490000 |
| 11 | 3 | 2690000 | 7990000 |
| 12 | 2 | 150000 | 890000 |

Danh mục 1, 2, 6, 9 là danh mục cha, 13 chưa có sản phẩm, nên không xuất hiện.
</details>

**Bài 2.** Đếm số đơn theo từng năm và từng kênh bán (`channel`).

> Gợi ý: nhóm theo hai thứ: `EXTRACT(YEAR FROM order_date)` và `channel`.

<details>
<summary>Đáp án</summary>

```sql
SELECT EXTRACT(YEAR FROM order_date) AS nam,
       channel,
       COUNT(*) AS so_don
FROM orders
GROUP BY EXTRACT(YEAR FROM order_date), channel
ORDER BY nam, channel;
```

Kết quả:

| nam | channel | so_don |
| --- | --- | --- |
| 2025 | offline | 10 |
| 2025 | online | 15 |
| 2026 | offline | 5 |
| 2026 | online | 10 |
</details>

**Bài 3.** Với mỗi phương thức thanh toán (`payments.method`), cho biết số lần thanh toán và tổng tiền. Sắp xếp theo tổng tiền giảm dần.

<details>
<summary>Đáp án</summary>

```sql
SELECT method,
       COUNT(*)    AS so_lan,
       SUM(amount) AS tong_tien
FROM payments
GROUP BY method
ORDER BY tong_tien DESC;
```

Kết quả:

| method | so_lan | tong_tien |
| --- | --- | --- |
| bank_transfer | 8 | 166691500 |
| momo | 14 | 157951000 |
| card | 7 | 112317500 |
| cash | 8 | 99331000 |
</details>

### Vận dụng

**Bài 4.** Tìm 5 sản phẩm (`product_id`) có giá trị đặt hàng cao nhất trong `order_items` (tổng `quantity * unit_price * (1 - discount)`), kèm tổng số lượng đã đặt. Làm tròn đến đồng.

Lưu ý: đây chưa phải doanh thu. Trong khóa này, doanh thu chỉ tính các đơn có `status NOT IN ('pending', 'cancelled')` (đơn đã thanh toán, khớp với bảng `payments`). Muốn lọc theo `status` phải ghép `order_items` với `orders`, việc của Ngày 10. Bài này tính mọi đơn, kể cả đơn chờ xử lý và đơn hủy.

<details>
<summary>Đáp án</summary>

```sql
SELECT product_id,
       SUM(quantity) AS so_luong,
       ROUND(SUM(quantity * unit_price * (1 - discount))) AS gia_tri_dat
FROM order_items
GROUP BY product_id
ORDER BY gia_tri_dat DESC
LIMIT 5;
```

Kết quả:

| product_id | so_luong | gia_tri_dat |
| --- | --- | --- |
| 10 | 4 | 78960500 |
| 1 | 2 | 64330500 |
| 2 | 2 | 59980000 |
| 5 | 2 | 50730500 |
| 3 | 2 | 43830500 |
</details>

**Bài 5.** Chỉ giữ các phương thức thanh toán có tổng tiền trên 100 triệu.

<details>
<summary>Đáp án</summary>

```sql
SELECT method,
       COUNT(*)    AS so_lan,
       SUM(amount) AS tong_tien
FROM payments
GROUP BY method
HAVING SUM(amount) > 100000000
ORDER BY tong_tien DESC;
```

Kết quả:

| method | so_lan | tong_tien |
| --- | --- | --- |
| bank_transfer | 8 | 166691500 |
| momo | 14 | 157951000 |
| card | 7 | 112317500 |

`cash` có tổng 99.331.000 nên bị loại.
</details>

**Bài 6.** Với các đơn `offline`, mỗi nhân viên (`employee_id`) bán được bao nhiêu đơn? Sắp xếp giảm dần theo số đơn.

<details>
<summary>Đáp án</summary>

```sql
SELECT employee_id, COUNT(*) AS so_don
FROM orders
WHERE channel = 'offline'
GROUP BY employee_id
ORDER BY so_don DESC, employee_id;
```

Kết quả:

| employee_id | so_don |
| --- | --- |
| 4 | 5 |
| 5 | 5 |
| 6 | 4 |
| 8 | 1 |

`channel = 'offline'` là điều kiện trên từng dòng nên đặt ở `WHERE`.
</details>

### Thử thách

**Bài 7.** Trong năm 2025, tháng nào có từ 3 đơn trở lên (không tính đơn đã hủy)? Hiển thị tháng dạng ngày đầu tháng (ví dụ `2025-09-01`).

> Gợi ý: `DATE_TRUNC('month', order_date)` giữ cả năm lẫn tháng. Điều kiện về trạng thái đặt ở `WHERE`, điều kiện về số đơn đặt ở `HAVING`.

<details>
<summary>Đáp án</summary>

```sql
SELECT DATE_TRUNC('month', order_date)::date AS thang,
       COUNT(*) AS so_don
FROM orders
WHERE status <> 'cancelled'
  AND order_date >= '2025-01-01'
  AND order_date <  '2026-01-01'
GROUP BY DATE_TRUNC('month', order_date)
HAVING COUNT(*) >= 3
ORDER BY thang;
```

Kết quả:

| thang | so_don |
| --- | --- |
| 2025-09-01 | 3 |
| 2025-11-01 | 3 |

Lọc năm bằng khoảng `>= '2025-01-01' AND < '2026-01-01'` thay vì `EXTRACT(YEAR ...) = 2025`: kết quả như nhau, nhưng cách so sánh trực tiếp trên cột cho phép database dùng index (Ngày 15, 28).
</details>

**Bài 8.** Tìm các sản phẩm xuất hiện trong ít nhất 3 đơn hàng khác nhau. Hiển thị `product_id`, số đơn và tổng số lượng đã đặt (tính mọi đơn, kể cả đơn chờ và đơn hủy), sắp xếp theo số đơn giảm dần.

> Gợi ý: một sản phẩm có thể nằm trong nhiều đơn, nên đếm `COUNT(DISTINCT order_id)`.

<details>
<summary>Đáp án</summary>

```sql
SELECT product_id,
       COUNT(DISTINCT order_id) AS so_don,
       SUM(quantity)            AS so_luong
FROM order_items
GROUP BY product_id
HAVING COUNT(DISTINCT order_id) >= 3
ORDER BY so_don DESC, product_id;
```

Kết quả:

| product_id | so_don | so_luong |
| --- | --- | --- |
| 23 | 6 | 13 |
| 16 | 5 | 6 |
| 12 | 4 | 5 |
| 17 | 4 | 4 |
| 22 | 4 | 6 |
| 10 | 3 | 4 |
| 18 | 3 | 3 |
| 19 | 3 | 3 |
| 20 | 3 | 3 |

Khóa chính của `order_items` là `(order_id, product_id)`, nên trong một nhóm `product_id` mỗi `order_id` chỉ xuất hiện một lần, `COUNT(*)` cũng cho cùng kết quả. Viết `COUNT(DISTINCT order_id)` thì ý nghĩa "số đơn khác nhau" rõ ràng hơn và vẫn đúng nếu sau này schema thay đổi.
</details>

**Bài 9.** "Có bao nhiêu khách đã đặt từ 3 đơn trở lên?" Câu trả lời là một con số. Thử nghĩ xem vì sao chỉ dùng `GROUP BY` và `HAVING` thì không ra được một con số.

<details>
<summary>Đáp án</summary>

`GROUP BY customer_id HAVING COUNT(*) >= 3` cho ra 5 dòng (mỗi khách một dòng, xem mục 6 của [Ngày 9](../../lessons/09-group-by-having.md)). Muốn đếm số dòng đó, bạn phải tổng hợp thêm một lần nữa trên kết quả của truy vấn trước. Việc này cần truy vấn con trong `FROM`, học ở [Ngày 11](../../lessons/11-subquery.md):

```sql
SELECT COUNT(*) AS so_khach
FROM (
    SELECT customer_id
    FROM orders
    GROUP BY customer_id
    HAVING COUNT(*) >= 3
) AS khach_than_thiet;
```

Kết quả:

| so_khach |
| --- |
| 5 |
</details>
