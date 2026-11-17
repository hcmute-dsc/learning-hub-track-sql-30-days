> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

### Cơ bản

**Bài 1.** Liệt kê `sku`, `name`, `stock_quantity` của các sản phẩm đã hết hàng.

<details>
<summary>Đáp án</summary>

```sql
SELECT sku, name, stock_quantity
FROM products
WHERE stock_quantity = 0;
```

Kết quả:

| sku | name | stock_quantity |
| --- | --- | --- |
| LAP-003 | Acer Nitro V 15 | 0 |
| PHN-004 | Nokia 105 4G | 0 |
| ACC-006 | Loa JBL Flip 6 | 0 |

</details>

**Bài 2.** Bảng `orders` đang có những trạng thái (`status`) nào? Mỗi trạng thái chỉ hiện một lần.

<details>
<summary>Đáp án</summary>

```sql
SELECT DISTINCT status
FROM orders;
```

Kết quả (thứ tự dòng có thể khác trên máy bạn):

| status |
| --- |
| delivered |
| cancelled |
| pending |
| paid |
| shipped |

</details>

**Bài 3.** Tìm các khách dùng email sinh viên HCMUTE (đuôi `@student.hcmute.edu.vn`).

<details>
<summary>Đáp án</summary>

```sql
SELECT full_name, email
FROM customers
WHERE email LIKE '%@student.hcmute.edu.vn';
```

Kết quả:

| full_name | email |
| --- | --- |
| Võ Quốc Phong | phong.vo@student.hcmute.edu.vn |
| Dương Minh Khoa | khoa.duong@student.hcmute.edu.vn |
| Huỳnh Tấn Phát | phat.huynh@student.hcmute.edu.vn |

</details>

### Vận dụng

**Bài 4.** Tìm sản phẩm đang kinh doanh (`is_active`), giá từ 5 triệu đến 20 triệu (tính cả hai đầu) và còn hàng.

<details>
<summary>Đáp án</summary>

```sql
SELECT sku, name, price, stock_quantity
FROM products
WHERE is_active
  AND price BETWEEN 5000000 AND 20000000
  AND stock_quantity > 0;
```

Kết quả:

| sku | name | price | stock_quantity |
| --- | --- | --- | --- |
| LAP-004 | Dell Inspiron 14 | 18490000 | 8 |
| LAP-006 | HP Pavilion 15 | 16990000 | 4 |
| PC-001 | Màn hình LG UltraGear 27 inch | 6490000 | 12 |
| PC-003 | PC văn phòng DSC Basic | 9990000 | 2 |
| PHN-001 | iPhone 15 128GB | 19990000 | 15 |
| PHN-002 | Samsung Galaxy S24 | 18990000 | 9 |
| TAB-001 | iPad Air M2 11 inch | 16990000 | 5 |
| TAB-002 | Samsung Galaxy Tab S9 FE | 9490000 | 7 |
| ACC-004 | Tai nghe Sony WH-1000XM5 | 7990000 | 8 |
| ACC-005 | Tai nghe AirPods Pro 2 | 5990000 | 12 |

Dùng `BETWEEN` ở đây an toàn vì `price` là số, không phải ngày giờ.

</details>

**Bài 5.** Bộ phận chăm sóc khách hàng cần danh sách khách thiếu thông tin liên lạc: chưa có email **hoặc** chưa có số điện thoại.

<details>
<summary>Đáp án</summary>

```sql
SELECT customer_id, full_name, email, phone
FROM customers
WHERE email IS NULL
   OR phone IS NULL;
```

Kết quả:

| customer_id | full_name | email | phone |
| --- | --- | --- | --- |
| 3 | Lê Hoàng Cường | cuong.le@outlook.com | NULL |
| 5 | Hoàng Thị Em | NULL | 0934567890 |
| 7 | Đặng Thu Giang | giang.dang@gmail.com | NULL |
| 13 | Phan Thị Oanh | oanh.phan@hotmail.com | NULL |
| 17 | Châu Ngọc Trâm | NULL | NULL |

</details>

**Bài 6.** Liệt kê các đơn hàng đặt trong tháng 9/2025 (từ 01/09 đến hết 30/09).

<details>
<summary>Đáp án</summary>

```sql
SELECT order_id, customer_id, order_date, status
FROM orders
WHERE order_date >= '2025-09-01'
  AND order_date <  '2025-10-01';
```

Kết quả:

| order_id | customer_id | order_date | status |
| --- | --- | --- | --- |
| 17 | 13 | 2025-09-01 12:00:00+07 | delivered |
| 18 | 14 | 2025-09-05 08:00:00+07 | delivered |
| 19 | 6 | 2025-09-06 18:20:00+07 | delivered |

Khoảng nửa mở `>= 01/09 AND < 01/10` không cần biết tháng 9 có 30 hay 31 ngày, và không bỏ sót đơn đặt trong ngày cuối tháng.

</details>

**Bài 7.** Tìm các đơn hàng có ghi chú (`note`) và không bị hủy.

<details>
<summary>Đáp án</summary>

```sql
SELECT order_id, status, note
FROM orders
WHERE note IS NOT NULL
  AND status <> 'cancelled';
```

Kết quả:

| order_id | status | note |
| --- | --- | --- |
| 4 | delivered | Quà Valentine, gói giấy đỏ |
| 12 | delivered | Trả góp 2 lần |
| 18 | delivered | Mua đầu năm học |
| 22 | delivered | Săn sale 11/11 |
| 25 | delivered | Quà Giáng sinh |

`status` có ràng buộc `NOT NULL` nên `status <> 'cancelled'` không có bẫy NULL ở đây.

</details>

### Thử thách

**Bài 8.** Bộ phận mua hàng muốn rà soát giá nhập: liệt kê sản phẩm có tiền lãi (`price - cost_price`) từ 3 triệu trở lên, **cùng với** những sản phẩm chưa có giá nhập (vì chưa tính được lãi). Hiển thị cả cột tiền lãi với tên `profit`.

> Gợi ý: alias `profit` chưa dùng được trong `WHERE`. Thử nghĩ: với sản phẩm có `cost_price` NULL, điều kiện `price - cost_price >= 3000000` cho kết quả gì?

<details>
<summary>Đáp án</summary>

```sql
SELECT sku,
       name,
       price,
       cost_price,
       price - cost_price AS profit
FROM products
WHERE price - cost_price >= 3000000
   OR cost_price IS NULL;
```

Kết quả:

| sku | name | price | cost_price | profit |
| --- | --- | --- | --- | --- |
| LAP-001 | ASUS ROG Strix G16 | 32990000 | 28500000 | 4490000 |
| LAP-002 | Lenovo Legion 5 | 29990000 | 26000000 | 3990000 |
| LAP-006 | HP Pavilion 15 | 16990000 | NULL | NULL |
| ACC-009 | Lót chuột DSC XXL | 250000 | NULL | NULL |

Hai điểm cần để ý: không dùng được `WHERE profit >= 3000000` (alias chưa tồn tại lúc `WHERE` chạy), và nếu thiếu vế `OR cost_price IS NULL` thì hai sản phẩm chưa có giá nhập sẽ biến mất vì điều kiện của chúng là `UNKNOWN`.

</details>

**Bài 9.** Tìm tất cả khách hàng ở TP. Hồ Chí Minh, bất kể thành phố được viết theo kiểu nào trong dữ liệu.

> Gợi ý: xem trước các cách viết bằng `SELECT DISTINCT city FROM customers;`.

<details>
<summary>Đáp án</summary>

Bước 1: xem có những cách viết nào bằng `SELECT DISTINCT city FROM customers;` (kết quả ở mục [DISTINCT](../../lessons/03-select-where.md#distinct-các-giá-trị-khác-nhau) của bài học): `TP. Hồ Chí Minh`, `Hồ Chí Minh`, `TP.HCM`.

Bước 2: lọc theo đủ ba cách viết.

```sql
SELECT customer_id, full_name, city
FROM customers
WHERE city IN ('TP. Hồ Chí Minh', 'Hồ Chí Minh', 'TP.HCM');
```

Kết quả:

| customer_id | full_name | city |
| --- | --- | --- |
| 1 | Nguyễn Văn An | TP. Hồ Chí Minh |
| 4 | Phạm Minh Duy | TP. Hồ Chí Minh |
| 6 | Võ Quốc Phong | Hồ Chí Minh |
| 10 | Dương Minh Khoa | TP. Hồ Chí Minh |
| 14 | Huỳnh Tấn Phát | TP.HCM |

Cách khác, bắt theo mẫu để không phải liệt kê từng kiểu:

```sql
SELECT customer_id, full_name, city
FROM customers
WHERE city ILIKE '%chí minh%'
   OR city ILIKE '%hcm%';
```

Kết quả: cùng 5 khách như trên. Cả hai cách đều chỉ là chữa cháy. Cách bền vững là làm sạch dữ liệu ([Ngày 5](../../lessons/05-operators-expressions.md)) và ràng buộc dữ liệu nhập vào ([Ngày 27](../../../04-sql-in-practice/lessons/27-database-design-best-practices.md)).

</details>
