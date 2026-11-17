> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

### Cơ bản

**Bài 1.** Liệt kê mọi laptop (danh mục 3 và 4) với `sku`, hãng, CPU, RAM (số nguyên), dung lượng lưu trữ (số nguyên). Sắp xếp theo RAM giảm dần, rồi dung lượng giảm dần, rồi `sku`.

<details>
<summary>Đáp án</summary>

```sql
SELECT
    sku,
    attributes ->> 'brand'             AS brand,
    attributes ->> 'cpu'               AS cpu,
    (attributes ->> 'ram_gb')::INT     AS ram_gb,
    (attributes ->> 'storage_gb')::INT AS storage_gb
FROM products
WHERE category_id IN (3, 4)
ORDER BY ram_gb DESC, storage_gb DESC, sku;
```

Kết quả:

| sku | brand | cpu | ram_gb | storage_gb |
| --- | --- | --- | --- | --- |
| LAP-002 | Lenovo | AMD Ryzen 7 7840HS | 16 | 1024 |
| LAP-001 | ASUS | Intel Core i7-13650HX | 16 | 512 |
| LAP-006 | HP | AMD Ryzen 5 7530U | 16 | 512 |
| LAP-003 | Acer | Intel Core i5-13420H | 8 | 512 |
| LAP-004 | Dell | Intel Core i5-1335U | 8 | 512 |
| LAP-005 | Apple | Apple M2 | 8 | 256 |

Nếu không ép kiểu `storage_gb`, `'1024'` sẽ đứng sau `'512'` khi sắp xếp giảm dần theo chuỗi.
</details>

**Bài 2.** Đếm số sản phẩm không dây (`"wireless": true`) theo hãng.

<details>
<summary>Đáp án</summary>

```sql
SELECT attributes ->> 'brand' AS brand, COUNT(*) AS so_san_pham
FROM products
WHERE attributes @> '{"wireless": true}'
GROUP BY attributes ->> 'brand'
ORDER BY so_san_pham DESC, brand;
```

Kết quả:

| brand | so_san_pham |
| --- | --- |
| Apple | 1 |
| JBL | 1 |
| Keychron | 1 |
| Logitech | 1 |
| Sony | 1 |

Chuột Logitech G102 có `"wireless": false` nên không được tính.
</details>

**Bài 3.** Tìm các sản phẩm có màu `Xanh` bằng toán tử `?` (không dùng `@>`).

<details>
<summary>Đáp án</summary>

```sql
SELECT sku, name, attributes -> 'colors' AS colors
FROM products
WHERE attributes -> 'colors' ? 'Xanh';
```

Kết quả:

| sku | name | colors |
| --- | --- | --- |
| PHN-001 | iPhone 15 128GB | ["Đen", "Hồng", "Xanh"] |
| PHN-003 | Xiaomi Redmi Note 13 | ["Đen", "Xanh", "Vàng"] |

Áp lên một mảng, `?` kiểm tra mảng có phần tử chuỗi đó không.
</details>

### Vận dụng

**Bài 4.** Tính số lượng bán và doanh thu (không tính đơn `pending` và `cancelled`) theo **hãng** lấy từ `attributes`. Sản phẩm không có thông tin hãng gom vào nhóm `(không rõ)`.

> Gợi ý: sản phẩm có `attributes` NULL cho `attributes ->> 'brand'` là NULL; dùng `COALESCE`.

<details>
<summary>Đáp án</summary>

```sql
SELECT
    COALESCE(p.attributes ->> 'brand', '(không rõ)') AS brand,
    SUM(oi.quantity) AS so_luong,
    ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))) AS doanh_thu
FROM order_items AS oi
JOIN orders   AS o ON o.order_id   = oi.order_id
JOIN products AS p ON p.product_id = oi.product_id
WHERE o.status NOT IN ('pending', 'cancelled')
GROUP BY COALESCE(p.attributes ->> 'brand', '(không rõ)')
ORDER BY doanh_thu DESC;
```

Kết quả:

| brand | so_luong | doanh_thu |
| --- | --- | --- |
| Apple | 11 | 179844000 |
| Lenovo | 2 | 59980000 |
| Samsung | 4 | 55061000 |
| Dell | 5 | 49850000 |
| Acer | 2 | 43830500 |
| ASUS | 1 | 31340500 |
| Sony | 3 | 23970000 |
| LG | 3 | 19470000 |
| Xiaomi | 4 | 19071000 |
| HP | 1 | 16990000 |
| (không rõ) | 14 | 11940000 |
| Logitech | 9 | 9864000 |
| Keychron | 3 | 5670000 |
| Anker | 6 | 5340000 |
| JBL | 1 | 2690000 |
| Nokia | 2 | 1380000 |

Nhóm `(không rõ)` gồm PC văn phòng DSC Basic và cáp USB-C, hai sản phẩm chưa có `attributes`.
</details>

**Bài 5.** Tìm màn hình có tần số quét từ 144 Hz trở lên, in kèm kích thước.

<details>
<summary>Đáp án</summary>

```sql
SELECT sku, name,
       (attributes ->> 'refresh_hz')::INT AS refresh_hz,
       (attributes ->> 'size_inch')::INT  AS size_inch
FROM products
WHERE (attributes ->> 'refresh_hz')::INT >= 144;
```

Kết quả:

| sku | name | refresh_hz | size_inch |
| --- | --- | --- | --- |
| PC-001 | Màn hình LG UltraGear 27 inch | 165 | 27 |

Sản phẩm không có `refresh_hz` cho NULL nên bị loại. Lưu ý: nếu một dòng nào đó lưu `"refresh_hz": "165Hz"` (chuỗi không phải số), phép ép kiểu `::INT` sẽ làm cả truy vấn báo lỗi. JSONB không ép kiểu giá trị cho bạn, đây là một lý do để đưa thuộc tính quan trọng ra cột thường.
</details>

**Bài 6.** Với mỗi điện thoại có danh sách màu, in số màu và danh sách màu nối thành một chuỗi, sắp theo bảng chữ cái (gợi ý: hàm tổng hợp `string_agg(cot, ', ' ORDER BY cot)` nối các giá trị trong nhóm thành một chuỗi).

<details>
<summary>Đáp án</summary>

```sql
SELECT p.sku,
       COUNT(*) AS so_mau,
       string_agg(c.color, ', ' ORDER BY c.color) AS danh_sach_mau
FROM products AS p
CROSS JOIN jsonb_array_elements_text(p.attributes -> 'colors') AS c(color)
GROUP BY p.sku
ORDER BY p.sku;
```

Kết quả:

| sku | so_mau | danh_sach_mau |
| --- | --- | --- |
| PHN-001 | 3 | Đen, Hồng, Xanh |
| PHN-002 | 2 | Đen, Tím |
| PHN-003 | 3 | Đen, Vàng, Xanh |
</details>

### Thử thách

**Bài 7.** Viết một truy vấn trả về đơn 12 dưới dạng một JSON gồm `order_id`, tên khách, `status`, mảng `items` (sku, quantity, unit_price) và mảng `payments` (amount, method, ngày trả). Cẩn thận: đơn 12 có 2 dòng hàng và 2 lần thanh toán.

<details>
<summary>Đáp án</summary>

Nếu JOIN cả `order_items` và `payments` rồi `jsonb_agg`, mỗi dòng hàng bị nhân với mỗi lần thanh toán (2 x 2 = 4 dòng), cả hai mảng đều bị lặp: đúng bẫy nhân dòng khi JOIN ở Ngày 10. Dựng từng mảng bằng một subquery riêng:

```sql
SELECT jsonb_pretty(
    jsonb_build_object(
        'order_id', o.order_id,
        'customer', c.full_name,
        'status',   o.status,
        'items', (
            SELECT jsonb_agg(
                       jsonb_build_object(
                           'sku',        p.sku,
                           'quantity',   oi.quantity,
                           'unit_price', oi.unit_price
                       ) ORDER BY p.sku)
            FROM order_items AS oi
            JOIN products AS p ON p.product_id = oi.product_id
            WHERE oi.order_id = o.order_id
        ),
        'payments', (
            SELECT jsonb_agg(
                       jsonb_build_object(
                           'amount',  pm.amount,
                           'method',  pm.method,
                           'paid_at', pm.paid_at::DATE
                       ) ORDER BY pm.paid_at)
            FROM payments AS pm
            WHERE pm.order_id = o.order_id
        )
    )
) AS order_json
FROM orders AS o
JOIN customers AS c ON c.customer_id = o.customer_id
WHERE o.order_id = 12;
```

Kết quả:

```json
{
    "items": [
        {
            "sku": "ACC-003",
            "quantity": 1,
            "unit_price": 1890000
        },
        {
            "sku": "LAP-002",
            "quantity": 1,
            "unit_price": 29990000
        }
    ],
    "status": "delivered",
    "customer": "Dương Minh Khoa",
    "order_id": 12,
    "payments": [
        {
            "amount": 15000000,
            "method": "bank_transfer",
            "paid_at": "2025-06-30"
        },
        {
            "amount": 16880000,
            "method": "bank_transfer",
            "paid_at": "2025-07-30"
        }
    ]
}
```
</details>

**Bài 8.** Cửa hàng muốn quản lý tồn kho riêng theo từng màu, nên danh sách màu cần constraint chặt (không trùng màu trong một sản phẩm, sản phẩm phải tồn tại). Tạo bảng `product_colors (product_id, color)` với khóa chính và khóa ngoại phù hợp, đổ dữ liệu từ `attributes -> 'colors'`, rồi dùng nó tìm các sản phẩm có màu `Đen`. Thử chèn một màu trùng và một `product_id` không tồn tại. Cuối bài xóa bảng.

<details>
<summary>Đáp án</summary>

```sql
DROP TABLE IF EXISTS product_colors;

CREATE TABLE product_colors (
    product_id INT         NOT NULL REFERENCES products (product_id),
    color      VARCHAR(30) NOT NULL,
    PRIMARY KEY (product_id, color)
);

INSERT INTO product_colors (product_id, color)
SELECT p.product_id, c.color
FROM products AS p
CROSS JOIN jsonb_array_elements_text(p.attributes -> 'colors') AS c(color);

SELECT p.sku, p.name, p.stock_quantity
FROM products AS p
JOIN product_colors AS pc ON pc.product_id = p.product_id
WHERE pc.color = 'Đen'
ORDER BY p.sku;
```

| sku | name | stock_quantity |
| --- | --- | --- |
| PHN-001 | iPhone 15 128GB | 15 |
| PHN-002 | Samsung Galaxy S24 | 9 |
| PHN-003 | Xiaomi Redmi Note 13 | 25 |

```sql
INSERT INTO product_colors (product_id, color) VALUES (10, 'Đen');
INSERT INTO product_colors (product_id, color) VALUES (99, 'Đen');
```

```text
ERROR:  duplicate key value violates unique constraint "product_colors_pkey"
DETAIL:  Key (product_id, color)=(10, Đen) already exists.
ERROR:  insert or update on table "product_colors" violates foreign key constraint "product_colors_product_id_fkey"
DETAIL:  Key (product_id)=(99) is not present in table "products".
```

Mảng trong JSONB không chặn được cả hai lỗi này. Khi đã có bảng riêng, bước tiếp theo trong thực tế là thêm cột `stock_quantity` vào `product_colors` và bỏ khóa `colors` khỏi `attributes`, để mỗi thông tin chỉ nằm ở một nơi.

```sql
DROP TABLE product_colors;
```
</details>

**Bài 9.** Tạo lại bảng `listings` như ở mục GIN (chạy lại khối `CREATE TABLE` và `INSERT`). Lần này tạo index GIN với lớp toán tử `jsonb_path_ops`: `CREATE INDEX ... USING GIN (attributes jsonb_path_ops)`. So sánh kích thước với GIN mặc định (khoảng 6 MB), và dùng `EXPLAIN` kiểm tra index mới có dùng được cho `@>` và cho `?` không. Xong thì xóa bảng.

<details>
<summary>Đáp án</summary>

```sql
CREATE INDEX idx_listings_attr_path ON listings USING GIN (attributes jsonb_path_ops);

SELECT pg_size_pretty(pg_relation_size('idx_listings_attr_path')) AS kich_thuoc;

EXPLAIN SELECT listing_id FROM listings WHERE attributes @> '{"shop_id": 777}';
EXPLAIN SELECT listing_id FROM listings WHERE attributes ? 'gpu';

DROP TABLE listings;
```

Kích thước trên máy mình: `4696 kB`, so với khoảng 6,2 MB (`6336 kB`) của GIN mặc định.

Với `@>`, index mới được dùng:

```text
 Bitmap Heap Scan on listings  (cost=12.98..127.18 rows=30 width=4)
   Recheck Cond: (attributes @> '{"shop_id": 777}'::jsonb)
   ->  Bitmap Index Scan on idx_listings_attr_path  (cost=0.00..12.98 rows=30 width=0)
         Index Cond: (attributes @> '{"shop_id": 777}'::jsonb)
```

Với `?`, PostgreSQL quét cả bảng:

```text
 Gather  (cost=1000.00..8934.50 rows=30 width=4)
   Workers Planned: 2
   ->  Parallel Seq Scan on listings  (cost=0.00..7931.50 rows=12 width=4)
         Filter: (attributes ? 'gpu'::text)
```

`jsonb_path_ops` chỉ lưu "đường dẫn tới giá trị" (băm từ khóa và giá trị), không lưu riêng từng khóa, nên nhỏ hơn và thường nhanh hơn cho `@>`, nhưng không trả lời được câu hỏi "có khóa `gpu` không". Chọn `jsonb_path_ops` khi ứng dụng chỉ lọc bằng `@>`; cần cả `?`, `?|`, `?&` thì dùng GIN mặc định.
</details>
