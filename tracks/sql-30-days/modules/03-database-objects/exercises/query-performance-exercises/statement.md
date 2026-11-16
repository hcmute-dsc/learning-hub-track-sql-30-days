> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Chạy trên schema `perf` từ trạng thái chỉ có khóa chính, với `SET max_parallel_workers_per_gather = 0;`. Thời gian trên máy bạn sẽ khác đáp án.

### Cơ bản

**Bài 1.** Chạy `EXPLAIN (ANALYZE, BUFFERS)` cho câu tìm khách ở `'Đà Nẵng'` trong `perf.customers`. Trả lời: kiểu scan là gì? Ước lượng bao nhiêu dòng, thực tế bao nhiêu? Bao nhiêu dòng bị loại? Bảng có bao nhiêu trang?

<details>
<summary>Đáp án</summary>

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM perf.customers WHERE city = 'Đà Nẵng';
```

Kết quả:

```text
 Seq Scan on customers  (cost=0.00..2411.00 rows=10133 width=62) (actual time=0.011..13.438 rows=10046 loops=1)
   Filter: ((city)::text = 'Đà Nẵng'::text)
   Rows Removed by Filter: 89954
   Buffers: shared hit=1161
 Planning:
   Buffers: shared hit=72
 Planning Time: 0.582 ms
 Execution Time: 14.144 ms
```

Seq Scan; ước lượng 10.133 dòng, thực tế 10.046; loại 89.954 dòng; bảng có 1161 trang (`shared hit=1161`, mọi trang đều đã nằm trong bộ nhớ đệm). Phần `Planning: Buffers` là số trang planner đọc (từ bảng hệ thống) khi lập plan.

</details>

**Bài 2.** `EXPLAIN SELECT * FROM perf.customers;` cho cost tổng là bao nhiêu? Tự tính lại con số đó từ `relpages`, `reltuples` của bảng. Vì sao cost ở bài 1 (có `WHERE`) lại cao hơn?

<details>
<summary>Đáp án</summary>

```sql
SELECT relpages, reltuples FROM pg_class WHERE oid = 'perf.customers'::regclass;

EXPLAIN SELECT * FROM perf.customers;
```

Kết quả:

| relpages | reltuples |
| --- | --- |
| 1161 | 100000 |

```text
 Seq Scan on customers  (cost=0.00..2161.00 rows=100000 width=62)
```

1161 × 1 (`seq_page_cost`) + 100.000 × 0,01 (`cpu_tuple_cost`) = 2161. Bài 1 có thêm một phép so sánh trên mỗi dòng: + 100.000 × 0,0025 (`cpu_operator_cost`) = 2411. Điều kiện lọc không làm giảm số trang phải đọc, chỉ thêm việc kiểm tra.

</details>

### Vận dụng

**Bài 3.** Màn hình "20 đơn mới nhất" chạy câu dưới đây. Đọc plan khi chưa có index, rồi tạo index trên `order_date` và đọc lại. Giải thích vì sao plan thứ hai không cần nút `Sort`.

```sql
SELECT order_id, order_date, total_amount
FROM perf.orders
ORDER BY order_date DESC
LIMIT 20;
```

<details>
<summary>Đáp án</summary>

```sql
EXPLAIN ANALYZE
SELECT order_id, order_date, total_amount
FROM perf.orders
ORDER BY order_date DESC
LIMIT 20;

CREATE INDEX idx_orders_order_date ON perf.orders (order_date);

EXPLAIN ANALYZE
SELECT order_id, order_date, total_amount
FROM perf.orders
ORDER BY order_date DESC
LIMIT 20;

DROP INDEX perf.idx_orders_order_date;
```

Kết quả, trước:

```text
 Limit  (cost=44806.64..44806.69 rows=20 width=18) (actual time=255.356..255.363 rows=20 loops=1)
   ->  Sort  (cost=44806.64..47306.64 rows=1000000 width=18) (actual time=255.353..255.356 rows=20 loops=1)
         Sort Key: order_date DESC
         Sort Method: top-N heapsort  Memory: 27kB
         ->  Seq Scan on orders  (cost=0.00..18197.00 rows=1000000 width=18) (actual time=0.029..134.402 rows=1000000 loops=1)
 Planning Time: 0.202 ms
 Execution Time: 255.385 ms
```

Sau:

```text
 Limit  (cost=0.42..1.60 rows=20 width=18) (actual time=0.030..0.073 rows=20 loops=1)
   ->  Index Scan Backward using idx_orders_order_date on orders  (cost=0.42..58768.00 rows=1000000 width=18) (actual time=0.029..0.069 rows=20 loops=1)
 Planning Time: 0.258 ms
 Execution Time: 0.131 ms
```

Index đã lưu `order_date` theo thứ tự, nên đọc ngược từ cuối index là có ngay các đơn mới nhất; `Limit` dừng sau 20 dòng (`actual rows=20` ở nút Index Scan dù ước lượng cả 1.000.000). Không cần đọc cả bảng, không cần sắp xếp.

</details>

**Bài 4.** Hai câu sau trả cùng kết quả (36.473 dòng). Chạy `EXPLAIN ANALYZE` câu thứ hai và so sánh `rows` ước lượng với thực tế. Vì sao ước lượng lệch nhiều như vậy?

```sql
SELECT * FROM perf.orders WHERE total_amount > 29000000;
SELECT * FROM perf.orders WHERE total_amount / 1000 > 29000;
```

<details>
<summary>Đáp án</summary>

```sql
EXPLAIN ANALYZE
SELECT * FROM perf.orders WHERE total_amount / 1000 > 29000;
```

Kết quả:

```text
 Seq Scan on orders  (cost=0.00..23197.00 rows=333333 width=31) (actual time=0.025..236.536 rows=36473 loops=1)
   Filter: ((total_amount / '1000'::numeric) > '29000'::numeric)
   Rows Removed by Filter: 963527
 Planning Time: 0.115 ms
 Execution Time: 238.695 ms
```

Ước lượng 333.333 dòng (đúng 1/3 bảng), thực tế 36.473. Planner có thống kê cho cột `total_amount`, nhưng không có thống kê cho biểu thức `total_amount / 1000`, nên dùng tỷ lệ mặc định 1/3 cho phép so sánh `>`. Câu thứ nhất được ước lượng 38.838 dòng, sát hơn nhiều (mục [EXPLAIN ANALYZE](#explain-analyze-chạy-thật-và-đo)). Đây cũng là lý do nên viết điều kiện trên cột "trần", không bọc phép tính quanh cột (Ngày 28).

</details>

**Bài 5.** Đo câu xóa các đơn `pending` đặt trước ngày 01/02/2023 mà không làm mất dữ liệu. Có bao nhiêu đơn sẽ bị xóa? Plan đọc bảng bằng cách nào?

<details>
<summary>Đáp án</summary>

```sql
BEGIN;
EXPLAIN ANALYZE
DELETE FROM perf.orders
WHERE status = 'pending' AND order_date < '2023-02-01';
ROLLBACK;

SELECT COUNT(*) FROM perf.orders WHERE status = 'pending' AND order_date < '2023-02-01';
```

Kết quả:

```text
 Delete on orders  (cost=0.00..23197.00 rows=0 width=0) (actual time=67.357..67.360 rows=0 loops=1)
   ->  Seq Scan on orders  (cost=0.00..23197.00 rows=222 width=6) (actual time=0.138..65.325 rows=236 loops=1)
         Filter: ((order_date < '2023-02-01 00:00:00+07'::timestamp with time zone) AND ((status)::text = 'pending'::text))
         Rows Removed by Filter: 999764
 Planning Time: 0.207 ms
 Execution Time: 67.513 ms
```

| count |
| --- |
| 236 |

236 đơn (nút Seq Scan trả 236 dòng cho nút `Delete`; bản thân nút `Delete` luôn ghi `rows=0` vì nó không trả dòng nào ra ngoài). Không có index trên `status` hay `order_date` nên phải Seq Scan. Sau `ROLLBACK`, `COUNT(*)` vẫn là 236: không đơn nào bị xóa.

</details>

### Thử thách

**Bài 6.** Đọc plan của truy vấn "5 khách ở Huế chi tiêu nhiều nhất" và trả lời: (a) thứ tự các nút chạy; (b) nút nào làm thời gian tăng nhiều nhất; (c) Hash Join dựng bảng băm từ bảng nào, vì sao planner chọn bảng đó?

```sql
SELECT c.customer_id, c.full_name, SUM(o.total_amount) AS tong_chi
FROM perf.customers c
JOIN perf.orders o ON o.customer_id = c.customer_id
WHERE c.city = 'Huế'
GROUP BY c.customer_id, c.full_name
ORDER BY tong_chi DESC
LIMIT 5;
```

<details>
<summary>Đáp án</summary>

```sql
EXPLAIN ANALYZE
SELECT c.customer_id, c.full_name, SUM(o.total_amount) AS tong_chi
FROM perf.customers c
JOIN perf.orders o ON o.customer_id = c.customer_id
WHERE c.city = 'Huế'
GROUP BY c.customer_id, c.full_name
ORDER BY tong_chi DESC
LIMIT 5;
```

Kết quả:

```text
 Limit  (cost=24148.93..24148.95 rows=5 width=54) (actual time=372.411..372.419 rows=5 loops=1)
   ->  Sort  (cost=24148.93..24173.93 rows=9997 width=54) (actual time=372.408..372.414 rows=5 loops=1)
         Sort Key: (sum(o.total_amount)) DESC
         Sort Method: top-N heapsort  Memory: 25kB
         ->  HashAggregate  (cost=23857.92..23982.89 rows=9997 width=54) (actual time=364.599..369.012 rows=9885 loops=1)
               Group Key: c.customer_id
               Batches: 1  Memory Usage: 4497kB
               ->  Hash Join  (cost=2535.96..23358.07 rows=99970 width=28) (actual time=9.564..299.233 rows=98865 loops=1)
                     Hash Cond: (o.customer_id = c.customer_id)
                     ->  Seq Scan on orders o  (cost=0.00..18197.00 rows=1000000 width=10) (actual time=0.007..102.828 rows=1000000 loops=1)
                     ->  Hash  (cost=2411.00..2411.00 rows=9997 width=22) (actual time=9.535..9.537 rows=9886 loops=1)
                           Buckets: 16384  Batches: 1  Memory Usage: 658kB
                           ->  Seq Scan on customers c  (cost=0.00..2411.00 rows=9997 width=22) (actual time=0.010..7.854 rows=9886 loops=1)
                                 Filter: ((city)::text = 'Huế'::text)
                                 Rows Removed by Filter: 90114
 Planning Time: 2.216 ms
 Execution Time: 372.512 ms
```

(a) Seq Scan on customers (lọc Huế) → Hash → Seq Scan on orders → Hash Join → HashAggregate → Sort (top-N) → Limit.

(b) Hash Join: từ khi hai con xong (Seq Scan on orders xong lúc 102,8 ms) tới khi nó xong (299,2 ms) mất khoảng 200 ms để dò bảng băm cho 1.000.000 đơn. Tiếp theo là Seq Scan on orders (khoảng 100 ms) và HashAggregate (khoảng 70 ms).

(c) Bảng băm dựng từ `customers` đã lọc (9.886 khách, 658 kB): planner luôn chọn bên nhỏ hơn để dựng bảng băm cho vừa bộ nhớ, rồi đưa bên lớn (1 triệu đơn) đi dò. Truy vấn cần đơn của khoảng 10% khách, rải đều khắp bảng `orders`, nên đọc cả bảng đơn là hợp lý; Ngày 28 sẽ đo xem index trên `orders.customer_id` có giúp được không.

</details>

**Bài 7.** Một bạn đo một truy vấn được `Execution Time: 0.2 ms` nhưng ứng dụng báo mất 3 giây. Kể ít nhất hai lý do có thể, dựa trên những gì `EXPLAIN ANALYZE` đo và không đo.

<details>
<summary>Đáp án</summary>

- `Execution Time` không gồm thời gian truyền kết quả qua mạng và thời gian ứng dụng đọc, chuyển đổi dữ liệu (ví dụ dựng hàng nghìn đối tượng).
- Ứng dụng có thể chạy truy vấn đó **nhiều lần** (vấn đề N+1 ở [Ngày 23](../../../04-sql-in-practice/lessons/23-sql-connect-apps.md)): 0,2 ms × hàng nghìn lần cộng thời gian đi về mỗi lần.
- Thời gian chờ lấy kết nối từ pool, hoặc chờ khóa do transaction khác đang giữ (Ngày 16): `EXPLAIN ANALYZE` chạy lúc không bị chặn nên không thấy.
- Giá trị tham số thật trong ứng dụng khác giá trị bạn thử (ví dụ `status = 'delivered'` khớp 85% bảng thay vì `'pending'`).

(Câu hỏi tư duy, không có truy vấn để chạy.)

</details>
