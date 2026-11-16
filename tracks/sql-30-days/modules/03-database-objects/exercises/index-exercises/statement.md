> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Mọi bài tập chạy trên schema `perf` (trừ bài 1), bắt đầu từ trạng thái chỉ có khóa chính, và nhớ `SET max_parallel_workers_per_gather = 0;` để plan giống đáp án. Thời gian trên máy bạn sẽ khác, hãy so sánh kiểu plan và cỡ chênh lệch.

### Cơ bản

**Bài 1.** Liệt kê các index của bảng `shop.order_items`. Mỗi index sinh ra từ đâu (khóa chính, UNIQUE hay tạo tay)? Bảng có khóa ngoại `order_id`, vì sao không cần tạo thêm index riêng cho `order_id`?

<details>
<summary>Đáp án</summary>

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'shop' AND tablename = 'order_items';
```

Kết quả:

| indexname | indexdef |
| --- | --- |
| order_items_pkey | CREATE UNIQUE INDEX order_items_pkey ON shop.order_items USING btree (order_id, product_id) |
| order_items_product_id_idx | CREATE INDEX order_items_product_id_idx ON shop.order_items USING btree (product_id) |

`order_items_pkey` sinh ra từ khóa chính `(order_id, product_id)`. `order_items_product_id_idx` được tạo tay trong `01_schema.sql` cho khóa ngoại `product_id`. Khóa ngoại `order_id` không cần index riêng vì nó là cột đầu (tiền tố trái) của index khóa chính.

</details>

**Bài 2.** Đo câu tìm khách theo email `user77777@example.com` trên `perf.customers` trước và sau khi tạo một UNIQUE index trên `email`. Ghi lại kiểu plan và thời gian. Xóa index sau khi xong.

<details>
<summary>Đáp án</summary>

```sql
EXPLAIN ANALYZE
SELECT customer_id, full_name, city
FROM perf.customers
WHERE email = 'user77777@example.com';

CREATE UNIQUE INDEX idx_customers_email ON perf.customers (email);

EXPLAIN ANALYZE
SELECT customer_id, full_name, city
FROM perf.customers
WHERE email = 'user77777@example.com';

SELECT customer_id, full_name, city
FROM perf.customers
WHERE email = 'user77777@example.com';

DROP INDEX perf.idx_customers_email;
```

Kết quả (máy tác giả):

| | Plan | Execution Time |
| --- | --- | --- |
| Trước | `Seq Scan on customers`, `Rows Removed by Filter: 99999` | 6.848 ms |
| Sau | `Index Scan using idx_customers_email on customers` | 0.060 ms |

| customer_id | full_name | city |
| --- | --- | --- |
| 77777 | Khách hàng 77777 | Hải Phòng |

</details>

### Vận dụng

**Bài 3.** Giả sử có index `(status, order_date)` trên `perf.orders`. Dự đoán câu nào dưới đây dùng được index, rồi kiểm chứng bằng `EXPLAIN` (không cần `ANALYZE`):

- (a) `WHERE status = 'pending' AND order_date >= '2026-10-01'`
- (b) `WHERE status = 'pending'`
- (c) `WHERE order_date >= '2026-10-10'`
- (d) `WHERE status = 'pending' ORDER BY order_date DESC LIMIT 10`

<details>
<summary>Đáp án</summary>

```sql
CREATE INDEX idx_orders_status_date ON perf.orders (status, order_date);

EXPLAIN SELECT * FROM perf.orders WHERE status = 'pending' AND order_date >= '2026-10-01';
EXPLAIN SELECT * FROM perf.orders WHERE status = 'pending';
EXPLAIN SELECT * FROM perf.orders WHERE order_date >= '2026-10-10';
EXPLAIN SELECT * FROM perf.orders WHERE status = 'pending' ORDER BY order_date DESC LIMIT 10;

DROP INDEX perf.idx_orders_status_date;
```

Kết quả:

| Câu | Dòng đầu của plan | Dùng index? |
| --- | --- | --- |
| (a) | `Index Scan using idx_orders_status_date on orders (cost=0.42..217.79 rows=75 width=31)` | Có, cả hai cột |
| (b) | `Bitmap Heap Scan on orders` → `Bitmap Index Scan on idx_orders_status_date` | Có, cột đầu |
| (c) | `Seq Scan on orders (cost=0.00..20697.00 rows=1410 width=31)` | Không: `order_date` không phải tiền tố trái |
| (d) | `Limit` → `Index Scan Backward using idx_orders_status_date` | Có, và không cần sắp xếp |

</details>

**Bài 4.** Báo cáo "đơn bị hủy trong tháng 9/2026" chạy mỗi ngày:

```sql
SELECT order_id, customer_id, total_amount
FROM perf.orders
WHERE status = 'cancelled'
  AND order_date >= '2026-09-01' AND order_date < '2026-10-01';
```

Thiết kế một partial index cho báo cáo này, đo trước và sau, cho biết kích thước index.

<details>
<summary>Đáp án</summary>

```sql
EXPLAIN ANALYZE
SELECT order_id, customer_id, total_amount
FROM perf.orders
WHERE status = 'cancelled'
  AND order_date >= '2026-09-01' AND order_date < '2026-10-01';

CREATE INDEX idx_orders_cancelled ON perf.orders (order_date)
WHERE status = 'cancelled';

EXPLAIN ANALYZE
SELECT order_id, customer_id, total_amount
FROM perf.orders
WHERE status = 'cancelled'
  AND order_date >= '2026-09-01' AND order_date < '2026-10-01';

SELECT pg_size_pretty(pg_relation_size('perf.idx_orders_cancelled'));

DROP INDEX perf.idx_orders_cancelled;
```

Kết quả (máy tác giả):

| | Plan | Execution Time |
| --- | --- | --- |
| Trước | `Seq Scan on orders`, `Rows Removed by Filter: 998283` | 45.380 ms |
| Sau | `Bitmap Index Scan on idx_orders_cancelled` → `Bitmap Heap Scan`, 1717 dòng | 3.849 ms |

Index chỉ chứa khoảng 80.000 đơn bị hủy nên chỉ nặng 1776 kB. Trong plan sau, `Index Cond` chỉ còn điều kiện ngày: điều kiện `status = 'cancelled'` đã được index đảm bảo.

</details>

**Bài 5.** Ô tìm kiếm khách hàng cho phép gõ tên không phân biệt hoa thường, ứng dụng gửi câu `WHERE lower(full_name) = 'khách hàng 4242'`. Tạo index phù hợp trên `perf.customers` và đo trước, sau.

<details>
<summary>Đáp án</summary>

```sql
EXPLAIN ANALYZE
SELECT customer_id, full_name FROM perf.customers WHERE lower(full_name) = 'khách hàng 4242';

CREATE INDEX idx_customers_name_lower ON perf.customers (lower(full_name));

EXPLAIN ANALYZE
SELECT customer_id, full_name FROM perf.customers WHERE lower(full_name) = 'khách hàng 4242';

DROP INDEX perf.idx_customers_name_lower;
```

Kết quả (máy tác giả):

| | Plan | Execution Time |
| --- | --- | --- |
| Trước | `Seq Scan on customers`, `Filter: (lower((full_name)::text) = 'khách hàng 4242'::text)` | 22.083 ms |
| Sau | `Bitmap Index Scan on idx_customers_name_lower` → `Bitmap Heap Scan` | 0.037 ms |

Tên có thể trùng (hai người cùng tên) nên đây là index thường, không phải UNIQUE.

</details>

### Thử thách

**Bài 6.** Một đồng nghiệp đã tạo cả hai index `(customer_id)` và `(customer_id, order_date)` trên `perf.orders`. Index nào thừa? Chứng minh bằng cách xem kích thước hai index, xóa index thừa, rồi kiểm tra câu `WHERE customer_id = 4242` vẫn dùng index.

<details>
<summary>Đáp án</summary>

```sql
CREATE INDEX idx_orders_customer_id ON perf.orders (customer_id);
CREATE INDEX idx_orders_customer_date ON perf.orders (customer_id, order_date);

SELECT indexrelid::regclass AS ten_index,
       pg_size_pretty(pg_relation_size(indexrelid)) AS kich_thuoc
FROM pg_index
WHERE indrelid = 'perf.orders'::regclass;

DROP INDEX perf.idx_orders_customer_id;

EXPLAIN SELECT * FROM perf.orders WHERE customer_id = 4242;

DROP INDEX perf.idx_orders_customer_date;
```

Kết quả:

| ten_index | kich_thuoc |
| --- | --- |
| perf.orders_pkey | 21 MB |
| perf.idx_orders_customer_id | 9088 kB |
| perf.idx_orders_customer_date | 30 MB |

```text
 Bitmap Heap Scan on orders  (cost=4.51..47.44 rows=11 width=31)
   Recheck Cond: (customer_id = 4242)
   ->  Bitmap Index Scan on idx_orders_customer_date  (cost=0.00..4.51 rows=11 width=0)
         Index Cond: (customer_id = 4242)
```

`(customer_id)` là tiền tố trái của `(customer_id, order_date)`, nên index một cột là thừa: xóa đi tiết kiệm 9 MB và bớt một index phải cập nhật mỗi lần ghi, trong khi câu lọc theo `customer_id` vẫn dùng index hai cột. (Index một cột nhỏ hơn hẳn vì PostgreSQL gộp các khóa trùng nhau; index hai cột ít khóa trùng hơn nên không gộp được nhiều.)

</details>

**Bài 7.** Không chạy thử, hãy giải thích vì sao với index `idx_orders_status` trên `perf.orders(status)`, câu `WHERE status = 'delivered'` vẫn dùng Seq Scan nhưng câu `WHERE status = 'pending'` lại dùng index. Nếu cửa hàng có thêm trạng thái `refunded` chiếm 0,1% số đơn và thường xuyên tra cứu, bạn sẽ tạo index nào?

<details>
<summary>Đáp án</summary>

`'delivered'` khớp khoảng 85% bảng (849.692/1.000.000 dòng). Đọc cả bảng một lượt rẻ hơn tra index hàng trăm nghìn lần rồi nhảy qua lại trong bảng, nên planner chọn Seq Scan. `'pending'` chỉ khớp khoảng 1% nên tra index rẻ hơn. Planner biết các tỷ lệ này nhờ thống kê của bảng (Ngày 20).

Với trạng thái hiếm `refunded` hay được tra cứu, hợp lý nhất là partial index, ví dụ `CREATE INDEX ON perf.orders (order_date) WHERE status = 'refunded';`: rất nhỏ, chỉ cập nhật khi có đơn `refunded`, và còn giúp sắp xếp theo ngày. (Bảng hiện không có trạng thái này nên không có kết quả để chạy.)

</details>
