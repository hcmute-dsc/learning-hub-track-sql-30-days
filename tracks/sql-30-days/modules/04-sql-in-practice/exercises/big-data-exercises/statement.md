> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Các bài dưới đây giả sử bạn đã chạy các ví dụ ở trên (có `perf.orders_by_year` với 4 phân vùng năm và `orders_default`).

### Cơ bản

**Bài 1.** Tạo bảng `payments_by_method`, bản sao của `payments` được phân vùng LIST theo `method`: một phân vùng cho `cash`, một cho `card`, một chung cho `momo` và `bank_transfer`. Nạp dữ liệu từ `payments`, rồi in số lần thanh toán và tổng tiền của từng phân vùng.

<details>
<summary>Đáp án</summary>

```sql
DROP TABLE IF EXISTS payments_by_method;

CREATE TABLE payments_by_method (
    payment_id INT,
    order_id   INT           NOT NULL,
    amount     NUMERIC(12,0) NOT NULL,
    method     VARCHAR(20)   NOT NULL,
    paid_at    TIMESTAMPTZ   NOT NULL,
    PRIMARY KEY (payment_id, method)
) PARTITION BY LIST (method);

CREATE TABLE payments_cash     PARTITION OF payments_by_method FOR VALUES IN ('cash');
CREATE TABLE payments_card     PARTITION OF payments_by_method FOR VALUES IN ('card');
CREATE TABLE payments_transfer PARTITION OF payments_by_method FOR VALUES IN ('momo', 'bank_transfer');

INSERT INTO payments_by_method
SELECT payment_id, order_id, amount, method, paid_at
FROM payments;

SELECT tableoid::regclass AS phan_vung, count(*) AS so_lan, sum(amount) AS tong_tien
FROM payments_by_method
GROUP BY tableoid
ORDER BY 1;
```

Kết quả:

| phan_vung | so_lan | tong_tien |
| --- | --- | --- |
| payments_cash | 8 | 99331000 |
| payments_card | 7 | 112317500 |
| payments_transfer | 22 | 324642500 |

Khóa chính phải là `(payment_id, method)` vì chứa cột phân vùng.
</details>

**Bài 2.** Dùng `EXPLAIN` kiểm tra truy vấn `SELECT sum(amount) FROM payments_by_method WHERE method = 'momo';` quét những phân vùng nào, rồi chạy để lấy kết quả.

<details>
<summary>Đáp án</summary>

```sql
EXPLAIN (COSTS OFF)
SELECT sum(amount) FROM payments_by_method WHERE method = 'momo';

SELECT sum(amount) FROM payments_by_method WHERE method = 'momo';
```

```text
 Aggregate
   ->  Seq Scan on payments_transfer payments_by_method
         Filter: ((method)::text = 'momo'::text)
```

Kết quả:

| sum |
| --- |
| 157951000 |

Chỉ quét `payments_transfer`. Vẫn còn dòng `Filter` vì phân vùng này chứa cả `bank_transfer`.
</details>

**Bài 3.** Một đơn đặt đúng lúc `2025-01-01 00:00:00` và một đơn lúc `2024-12-31 23:59:59` sẽ rơi vào phân vùng nào của `perf.orders_by_year`? Kiểm chứng bằng `INSERT ... RETURNING tableoid::regclass` trong một transaction rồi `ROLLBACK`.

<details>
<summary>Đáp án</summary>

```sql
BEGIN;

INSERT INTO perf.orders_by_year VALUES (1000001, 1, '2025-01-01 00:00:00', 'pending', 500000)
RETURNING tableoid::regclass AS phan_vung, order_id, order_date;

INSERT INTO perf.orders_by_year VALUES (1000002, 1, '2024-12-31 23:59:59', 'pending', 500000)
RETURNING tableoid::regclass AS phan_vung, order_id, order_date;

ROLLBACK;
```

Kết quả:

| phan_vung | order_id | order_date |
| --- | --- | --- |
| perf.orders_2025 | 1000001 | 2025-01-01 00:00:00+07 |

| phan_vung | order_id | order_date |
| --- | --- | --- |
| perf.orders_2024 | 1000002 | 2024-12-31 23:59:59+07 |

Đúng 0 giờ ngày 1/1/2025 là cận `FROM` (bao gồm) của `orders_2025`, đồng thời là cận `TO` (không bao gồm) của `orders_2024`.
</details>

### Vận dụng

**Bài 4.** Truy vấn sau đếm đơn ngày Giáng sinh 2024 nhưng quét cả 5 phân vùng. Giải thích vì sao và viết lại để chỉ quét một phân vùng, kết quả không đổi.

```sql
SELECT count(*) FROM perf.orders_by_year WHERE order_date::date = '2024-12-25';
```

<details>
<summary>Đáp án</summary>

Phép ép kiểu `order_date::date` bọc cột phân vùng, nên PostgreSQL không so được điều kiện với cận của các phân vùng. Viết lại thành khoảng nửa mở trên chính cột `order_date`:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM perf.orders_by_year
WHERE order_date >= '2024-12-25' AND order_date < '2024-12-26';

SELECT count(*) FROM perf.orders_by_year
WHERE order_date >= '2024-12-25' AND order_date < '2024-12-26';
```

```text
 Aggregate
   ->  Seq Scan on orders_2024 orders_by_year
         Filter: ((order_date >= '2024-12-25 00:00:00+07'::timestamp with time zone) AND (order_date < '2024-12-26 00:00:00+07'::timestamp with time zone))
```

Kết quả (giống truy vấn cũ):

| count |
| --- |
| 685 |
</details>

**Bài 5.** Đếm số đơn theo `status` trong quý 1/2025 trên `perf.orders_by_year`, sắp giảm dần theo số đơn. Kiểm tra bằng EXPLAIN rằng chỉ phân vùng 2025 bị quét.

<details>
<summary>Đáp án</summary>

```sql
EXPLAIN (COSTS OFF)
SELECT status, count(*) AS so_don
FROM perf.orders_by_year
WHERE order_date >= '2025-01-01' AND order_date < '2025-04-01'
GROUP BY status
ORDER BY so_don DESC;

SELECT status, count(*) AS so_don
FROM perf.orders_by_year
WHERE order_date >= '2025-01-01' AND order_date < '2025-04-01'
GROUP BY status
ORDER BY so_don DESC;
```

```text
 Sort
   Sort Key: (count(*)) DESC
   ->  HashAggregate
         Group Key: orders_by_year.status
         ->  Seq Scan on orders_2025 orders_by_year
               Filter: ((order_date >= '2025-01-01 00:00:00+07'::timestamp with time zone) AND (order_date < '2025-04-01 00:00:00+07'::timestamp with time zone))
```

Kết quả:

| status | so_don |
| --- | --- |
| delivered | 55498 |
| cancelled | 5362 |
| shipped | 2574 |
| paid | 1307 |
| pending | 649 |
</details>

### Thử thách

**Bài 6.** Một đơn đặt trước cho năm 2027 đã lỡ được chèn vào `perf.orders_by_year` và rơi vào `orders_default`:

```sql
INSERT INTO perf.orders_by_year VALUES (1000001, 1, '2027-03-01 09:00', 'pending', 500000)
RETURNING tableoid::regclass AS phan_vung;
```

Giờ bạn tạo phân vùng `perf.orders_2027` cho năm 2027. Chuyện gì xảy ra? Hãy tạo được phân vùng này và đưa đơn kia về đúng chỗ, trong một transaction.

<details>
<summary>Đáp án</summary>

Tạo thẳng thì lỗi, vì phân vùng `DEFAULT` đang giữ một dòng thuộc khoảng mới:

```sql
CREATE TABLE perf.orders_2027 PARTITION OF perf.orders_by_year
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
```

```text
ERROR:  updated partition constraint for default partition "orders_default" would be violated by some row
```

Cách làm: chép các dòng 2027 ra bảng tạm, xóa khỏi `orders_default`, tạo phân vùng, rồi chèn lại qua bảng cha.

```sql
BEGIN;

CREATE TEMP TABLE tam_2027 ON COMMIT DROP AS
SELECT * FROM perf.orders_default
WHERE order_date >= '2027-01-01' AND order_date < '2028-01-01';

DELETE FROM perf.orders_default
WHERE order_date >= '2027-01-01' AND order_date < '2028-01-01';

CREATE TABLE perf.orders_2027 PARTITION OF perf.orders_by_year
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

INSERT INTO perf.orders_by_year SELECT * FROM tam_2027;

COMMIT;

SELECT tableoid::regclass AS phan_vung, order_id, order_date
FROM perf.orders_by_year
WHERE order_id = 1000001;
```

Kết quả:

| phan_vung | order_id | order_date |
| --- | --- | --- |
| perf.orders_2027 | 1000001 | 2027-03-01 09:00:00+07 |

Bài học: tạo sẵn phân vùng cho kỳ sắp tới (ví dụ bằng một tác vụ định kỳ) thay vì để dữ liệu dồn vào `DEFAULT`. Dọn lại sau bài (xóa phân vùng 2027, xóa luôn đơn thử):

```sql
DROP TABLE perf.orders_2027;
```
</details>

**Bài 7.** DSC Shop phát triển lên 50 triệu đơn hàng, 2 triệu khách. Các truy vấn phổ biến: (a) khách xem lịch sử đơn của mình, (b) báo cáo doanh thu theo tháng, (c) xóa đơn cũ hơn 5 năm. Bạn chọn khóa phân vùng nào cho `orders`? Nếu một ngày phải sharding, chọn shard key nào? Giải thích ngắn.

<details>
<summary>Đáp án</summary>

Không có một đáp án duy nhất, đây là một hướng hợp lý:

- **Phân vùng `orders` theo RANGE `order_date`, mỗi tháng hoặc mỗi quý một phân vùng.** (b) đọc đúng các phân vùng của khoảng thời gian cần báo cáo. (c) trở thành `DETACH` rồi `DROP` các phân vùng cũ, gần như tức thời. (a) không lọc theo ngày nên phải dò mọi phân vùng; giải quyết bằng index `customer_id` trên bảng cha (tự có trên từng phân vùng) và giới hạn lịch sử hiển thị trong vài năm gần nhất để vẫn được cắt tỉa (`AND order_date >= now() - INTERVAL '2 years'`).
- **Shard key: `customer_id`.** Đơn, dòng hàng, thanh toán của một khách nằm cùng một shard, nên (a) chỉ hỏi một máy và JOIN vẫn nằm trong một máy. Báo cáo (b) phải hỏi mọi shard rồi gộp, nên thường chuyển sang kho dữ liệu cột. Không chọn `order_date` làm shard key, vì mọi đơn mới sẽ dồn vào shard của tháng hiện tại.
- Trước khi nghĩ tới sharding, 50 triệu dòng vẫn nằm gọn trong một máy PostgreSQL có partition, index và một replica cho báo cáo.

Tự chấm: câu trả lời của bạn đạt nếu (1) khóa phân vùng giúp được cả (b) và (c), (2) nói rõ (a) không được cắt tỉa và cách bù lại, (3) shard key giữ dữ liệu của một khách trên cùng một máy và tránh dồn ghi vào một shard.
</details>

### Dọn dẹp

Các bảng của bài này không thuộc bộ dữ liệu gốc. Xóa khi học xong:

```sql
DROP TABLE IF EXISTS perf.orders_by_year, perf.customers_hash,
                     orders_by_channel, payments_by_method, product_docs;
```
