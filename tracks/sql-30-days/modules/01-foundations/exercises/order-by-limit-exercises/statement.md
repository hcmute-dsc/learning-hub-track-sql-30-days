> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

### Cơ bản

**Bài 1.** Ba sản phẩm còn tồn kho nhiều nhất.

<details>
<summary>Đáp án</summary>

```sql
SELECT sku, name, stock_quantity
FROM products
ORDER BY stock_quantity DESC
LIMIT 3;
```

Kết quả:

| sku | name | stock_quantity |
| --- | --- | --- |
| ACC-008 | Cáp USB-C to USB-C 1m | 200 |
| ACC-001 | Chuột Logitech G102 | 60 |
| ACC-007 | Sạc Anker 65W | 40 |

</details>

**Bài 2.** Năm khách hàng đăng ký gần đây nhất.

<details>
<summary>Đáp án</summary>

```sql
SELECT customer_id, full_name, created_at
FROM customers
ORDER BY created_at DESC
LIMIT 5;
```

Kết quả:

| customer_id | full_name | created_at |
| --- | --- | --- |
| 17 | Châu Ngọc Trâm | 2026-01-15 00:00:00+07 |
| 18 | Mai Đức Uy | 2025-11-24 00:00:00+07 |
| 16 | Tạ Quang Sơn | 2025-11-20 00:00:00+07 |
| 15 | Nguyễn Văn An | 2025-10-10 00:00:00+07 |
| 14 | Huỳnh Tấn Phát | 2025-09-04 00:00:00+07 |

Khách 18 có id lớn hơn 17 nhưng đăng ký sớm hơn: id không phải lúc nào cũng phản ánh thời gian, muốn "mới nhất" thì sắp theo cột thời gian.

</details>

**Bài 3.** Ba chiếc laptop (danh mục 3 và 4) rẻ nhất.

<details>
<summary>Đáp án</summary>

```sql
SELECT sku, name, price
FROM products
WHERE category_id IN (3, 4)
ORDER BY price
LIMIT 3;
```

Kết quả:

| sku | name | price |
| --- | --- | --- |
| LAP-006 | HP Pavilion 15 | 16990000 |
| LAP-004 | Dell Inspiron 14 | 18490000 |
| LAP-003 | Acer Nitro V 15 | 21990000 |

Thứ tự viết là `WHERE` trước `ORDER BY` trước `LIMIT`, cũng đúng thứ tự xử lý.

</details>

### Vận dụng

**Bài 4.** In danh bạ khách hàng (`full_name`, `phone`, `city`) xếp theo thành phố, trong mỗi thành phố xếp theo tên. Khách chưa ghi thành phố đặt lên đầu để dễ bổ sung.

<details>
<summary>Đáp án</summary>

```sql
SELECT full_name, phone, city
FROM customers
ORDER BY city NULLS FIRST, full_name;
```

Kết quả:

| full_name | phone | city |
| --- | --- | --- |
| Châu Ngọc Trâm | NULL | NULL |
| Lý Thanh Mai | 0933444555 | NULL |
| Trịnh Công Nam | 0944555666 | Biên Hòa |
| Hoàng Thị Em | 0934567890 | Cần Thơ |
| Tạ Quang Sơn | 0977888999 | Cần Thơ |
| Bùi Văn Hùng | 0909876543 | đà nẵng |
| Lê Hoàng Cường | NULL | Đà Nẵng |
| Mai Đức Uy | 0988999000 | Đà Nẵng |
| Ngô Thị Lan | 0911222333 | Hải Phòng |
| Đặng Thu Giang | NULL | Hà Nội |
| Nguyễn Văn An | 0966777888 | Hà Nội |
| Phan Thị Oanh | NULL | Hà Nội |
| Trần Thị Bình | 0912345678 | Hà Nội |
| Võ Quốc Phong | 0976543210 | Hồ Chí Minh |
| Huỳnh Tấn Phát | 0955666777 | TP.HCM |
| Dương Minh Khoa | 0922333444 | TP. Hồ Chí Minh |
| Nguyễn Văn An | 0901234567 | TP. Hồ Chí Minh |
| Phạm Minh Duy | 0987654321 | TP. Hồ Chí Minh |

Để ý `đà nẵng` và `Đà Nẵng` là hai nhóm riêng, còn khách TP. Hồ Chí Minh bị chia làm ba nhóm. Dữ liệu bẩn làm hỏng cả việc sắp xếp; [Ngày 5](../../lessons/05-operators-expressions.md) sẽ làm sạch cột này.

</details>

**Bài 5.** Trang sản phẩm xếp theo giá giảm dần, mỗi trang 6 sản phẩm. Viết truy vấn lấy **trang 3**, bảo đảm thứ tự ổn định kể cả khi có sản phẩm cùng giá.

<details>
<summary>Đáp án</summary>

`OFFSET = (3 - 1) * 6 = 12`. Thêm `sku` (duy nhất) để phá hòa.

```sql
SELECT sku, name, price
FROM products
ORDER BY price DESC, sku
LIMIT 6 OFFSET 12;
```

Kết quả:

| sku | name | price |
| --- | --- | --- |
| PC-001 | Màn hình LG UltraGear 27 inch | 6490000 |
| ACC-005 | Tai nghe AirPods Pro 2 | 5990000 |
| PHN-003 | Xiaomi Redmi Note 13 | 4890000 |
| PC-002 | Màn hình Dell P2422H | 4290000 |
| ACC-006 | Loa JBL Flip 6 | 2690000 |
| ACC-002 | Chuột Logitech MX Master 3S | 2490000 |

</details>

**Bài 6.** Đơn hàng đầu tiên của cửa hàng mà không bị hủy là đơn nào?

<details>
<summary>Đáp án</summary>

```sql
SELECT order_id, order_date, status
FROM orders
WHERE status <> 'cancelled'
ORDER BY order_date
LIMIT 1;
```

Kết quả:

| order_id | order_date | status |
| --- | --- | --- |
| 1 | 2025-01-12 10:15:00+07 | delivered |

</details>

### Thử thách

**Bài 7.** Top 3 sản phẩm lãi nhiều nhất trên mỗi chiếc (`price - cost_price`). Nếu có sản phẩm đồng hạng 3 thì lấy hết. Sản phẩm chưa có giá nhập không được lọt vào top.

<details>
<summary>Đáp án</summary>

```sql
SELECT sku, name, price - cost_price AS profit
FROM products
ORDER BY profit DESC NULLS LAST
FETCH FIRST 3 ROWS WITH TIES;
```

Kết quả:

| sku | name | profit |
| --- | --- | --- |
| LAP-001 | ASUS ROG Strix G16 | 4490000 |
| LAP-002 | Lenovo Legion 5 | 3990000 |
| LAP-005 | MacBook Air M2 13 inch | 2990000 |
| PHN-002 | Samsung Galaxy S24 | 2990000 |
| LAP-003 | Acer Nitro V 15 | 2990000 |

Ba sản phẩm cùng lãi 2.990.000 đồng hạng 3 nên có 5 dòng. Thiếu `NULLS LAST` thì HP Pavilion và Lót chuột (lãi `NULL`) chiếm hai suất đầu. Cách khác là lọc bỏ hẳn bằng `WHERE cost_price IS NOT NULL`.

</details>

**Bài 8.** Một ứng dụng hiển thị đơn hàng mới nhất theo kiểu cuộn vô hạn, mỗi lần tải 4 đơn. Lần tải trước kết thúc ở đơn có `order_date = '2025-09-05 08:00:00+07'`. Viết truy vấn keyset cho lần tải tiếp theo (giả sử không có hai đơn trùng thời điểm).

<details>
<summary>Đáp án</summary>

```sql
SELECT order_id, order_date, status
FROM orders
WHERE order_date < '2025-09-05 08:00:00+07'
ORDER BY order_date DESC
LIMIT 4;
```

Kết quả:

| order_id | order_date | status |
| --- | --- | --- |
| 17 | 2025-09-01 12:00:00+07 | delivered |
| 16 | 2025-08-16 10:10:00+07 | delivered |
| 15 | 2025-08-02 20:00:00+07 | cancelled |
| 14 | 2025-07-19 17:30:00+07 | delivered |

Sắp giảm dần thì "trang sau" là các giá trị **nhỏ hơn** giá trị cuối. Nếu có thể trùng thời điểm, cần so sánh cả cặp `(order_date, order_id)`; cách viết đó học ở [Ngày 28](../../../04-sql-in-practice/lessons/28-sql-query-optimization.md).

</details>
