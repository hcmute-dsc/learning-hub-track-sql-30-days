> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Bài đọc nên bài tập chủ yếu là phân tích; các bài có SQL chạy trên DSC Shop, phần MongoDB chỉ để so sánh (không bắt buộc cài).

### Cơ bản

**Bài 1.** Ghép mỗi nhu cầu với loại NoSQL phù hợp nhất (document, key-value, wide-column, graph):
(a) lưu phiên đăng nhập, tự hết hạn sau 30 phút; (b) ghi nhiệt độ từ 10.000 cảm biến mỗi giây; (c) tìm "khách mua X cũng mua Y" qua nhiều bước quan hệ; (d) lưu bài viết blog có số trường thay đổi theo loại bài.

<details>
<summary>Đáp án</summary>

(a) key-value (Redis, có thời gian hết hạn cho từng khóa); (b) wide-column (Cassandra), hoặc hệ chuyên cho chuỗi thời gian; (c) graph (Neo4j); (d) document (MongoDB), hoặc một cột `JSONB` trong PostgreSQL.
</details>

**Bài 2.** Đúng hay sai? Giải thích ngắn.
(a) MongoDB không hỗ trợ transaction nhiều document. (b) PostgreSQL chỉ mở rộng được theo chiều dọc. (c) Chữ C trong CAP và chữ C trong ACID cùng nghĩa. (d) Hệ phân tán nào cũng phải đánh đổi giữa C và A khi mạng giữa các máy bị đứt.

<details>
<summary>Đáp án</summary>

(a) Sai: có từ MongoDB 4.0 (replica set) và 4.2 (sharded cluster). (b) Sai: có read replica để chia tải đọc và sharding qua công cụ như Citus, dù phức tạp hơn. (c) Sai: C của ACID là không vi phạm ràng buộc; C của CAP là mọi lần đọc thấy bản ghi mới nhất. (d) Đúng: đó là nội dung định lý CAP.
</details>

### Vận dụng

**Bài 3.** Viết truy vấn SQL dựng document của khách `customer_id = 2` theo kiểu "embed": gồm `customer_id`, `full_name` và mảng `orders`, mỗi phần tử có `order_id`, `order_date` (chỉ lấy ngày), `status`, sắp theo ngày đặt.

<details>
<summary>Đáp án</summary>

```sql
SELECT jsonb_pretty(
    jsonb_build_object(
        'customer_id', c.customer_id,
        'full_name',   c.full_name,
        'orders', (
            SELECT jsonb_agg(jsonb_build_object('order_id',   o.order_id,
                                                'order_date', o.order_date::date,
                                                'status',     o.status)
                             ORDER BY o.order_date)
            FROM orders AS o
            WHERE o.customer_id = c.customer_id
        )
    )
) AS khach_hang
FROM customers AS c
WHERE c.customer_id = 2;
```

Kết quả (đã bỏ dấu `+` của psql):

```json
{
    "orders": [
        {
            "status": "delivered",
            "order_id": 2,
            "order_date": "2025-01-20"
        },
        {
            "status": "delivered",
            "order_id": 8,
            "order_date": "2025-04-22"
        },
        {
            "status": "delivered",
            "order_id": 22,
            "order_date": "2025-11-11"
        },
        {
            "status": "delivered",
            "order_id": 34,
            "order_date": "2026-06-15"
        }
    ],
    "full_name": "Trần Thị Bình",
    "customer_id": 2
}
```
</details>

**Bài 4.** Liệt kê khách ở `Hà Nội` kèm số đơn, sắp giảm dần theo số đơn, bằng SQL. Sau đó viết truy vấn MongoDB tương ứng trong hai thiết kế: (A) đơn hàng được embed trong document khách (`customers.orders` là mảng); (B) collection `orders` riêng, mỗi đơn có `customer_id` (reference). Thiết kế nào gặp vấn đề khi một khách có hàng chục nghìn đơn, và thiết kế nào gặp vấn đề khi khách đổi tên?

<details>
<summary>Đáp án</summary>

```sql
SELECT c.customer_id, c.full_name, count(o.order_id) AS so_don
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.customer_id
WHERE c.city = 'Hà Nội'
GROUP BY c.customer_id, c.full_name
ORDER BY so_don DESC, c.customer_id;
```

Kết quả:

| customer_id | full_name | so_don |
| --- | --- | --- |
| 2 | Trần Thị Bình | 4 |
| 7 | Đặng Thu Giang | 2 |
| 13 | Phan Thị Oanh | 2 |
| 15 | Nguyễn Văn An | 2 |

MongoDB:

```js
// (A) Embed: đếm phần tử mảng, không cần nối
db.customers.aggregate([
    { $match: { city: "Hà Nội" } },
    { $project: { customer_id: 1, full_name: 1, so_don: { $size: { $ifNull: ["$orders", []] } } } },
    { $sort: { so_don: -1, customer_id: 1 } }
]);

// (B) Reference: nối bằng $lookup, tương tự LEFT JOIN
db.customers.aggregate([
    { $match: { city: "Hà Nội" } },
    { $lookup: { from: "orders", localField: "customer_id",
                 foreignField: "customer_id", as: "orders" } },
    { $project: { customer_id: 1, full_name: 1, so_don: { $size: "$orders" } } },
    { $sort: { so_don: -1, customer_id: 1 } }
]);
```

`$project` phải giữ lại `customer_id` thì `$sort` mới sắp được theo nó (giống `ORDER BY so_don DESC, c.customer_id` ở bản SQL).

- Hàng chục nghìn đơn: thiết kế (A) gặp vấn đề. Mảng tăng không giới hạn, document phình to (giới hạn 16 MB), mỗi lần thêm đơn phải ghi lại document lớn.
- Khách đổi tên: nếu (B) chỉ lưu `customer_id` thì chỉ sửa một chỗ. Vấn đề xảy ra khi đơn hàng chép sẵn tên khách vào trong (như document đơn 12 ở mục 4): phải sửa mọi đơn. Bảng chuẩn hóa của PostgreSQL không gặp cả hai vấn đề.
</details>

### Thử thách

**Bài 5.** DSC Shop muốn hiện mục "Thường được mua cùng". Một bạn đề xuất cài ngay Neo4j. Trước khi quyết định, hãy viết bằng SQL: liệt kê các cặp sản phẩm cùng xuất hiện trong ít nhất 2 đơn. Dựa vào kết quả và quy mô dữ liệu, bạn có đồng ý cài thêm Neo4j không?

<details>
<summary>Đáp án</summary>

SELF JOIN `order_items` với chính nó theo `order_id`; điều kiện `b.product_id > a.product_id` để mỗi cặp chỉ đếm một lần và không ghép sản phẩm với chính nó.

```sql
SELECT a.product_id AS sp_a, pa.name AS ten_a,
       b.product_id AS sp_b, pb.name AS ten_b,
       count(*) AS so_don_chung
FROM order_items AS a
JOIN order_items AS b ON b.order_id = a.order_id AND b.product_id > a.product_id
JOIN products AS pa ON pa.product_id = a.product_id
JOIN products AS pb ON pb.product_id = b.product_id
GROUP BY a.product_id, pa.name, b.product_id, pb.name
HAVING count(*) >= 2
ORDER BY so_don_chung DESC, sp_a, sp_b;
```

Kết quả:

| sp_a | ten_a | sp_b | ten_b | so_don_chung |
| --- | --- | --- | --- | --- |
| 12 | Xiaomi Redmi Note 13 | 22 | Sạc Anker 65W | 2 |
| 16 | Chuột Logitech G102 | 18 | Bàn phím cơ Keychron K2 | 2 |
| 22 | Sạc Anker 65W | 23 | Cáp USB-C to USB-C 1m | 2 |

Gợi ý "mua cùng" một bước chỉ là một SELF JOIN, PostgreSQL làm tốt kể cả với hàng triệu dòng hàng (có thể tính sẵn định kỳ vào một materialized view, Ngày 19). Thêm một hệ CSDL nghĩa là thêm việc vận hành, đồng bộ dữ liệu, sao lưu. Graph database chỉ đáng cân nhắc khi bài toán chính là duyệt quan hệ nhiều bước, sâu và thay đổi liên tục (ví dụ mạng xã hội, phát hiện vòng gian lận).
</details>

**Bài 6.** Thiết kế lưu trữ cho ba tính năng mới của DSC Shop: (a) giỏ hàng của khách chưa đăng nhập, mất sau 7 ngày; (b) lịch sử sản phẩm khách đã xem (rất nhiều lượt ghi, chỉ dùng để gợi ý); (c) đánh giá sản phẩm có ảnh, số sao, và trả lời của cửa hàng. Chọn công nghệ cho mỗi cái và giải thích.

<details>
<summary>Đáp án</summary>

Một phương án hợp lý:

- (a) Redis: khóa là mã phiên, giá trị là danh sách sản phẩm, đặt thời gian hết hạn 7 ngày. Mất dữ liệu cũng không nghiêm trọng. Khi khách đặt hàng, đơn được ghi vào PostgreSQL trong một transaction.
- (b) Ghi vào bảng PostgreSQL phân vùng theo tháng (Ngày 25) là đủ ở quy mô vừa, xóa dữ liệu cũ bằng `DETACH`. Khi lên tới hàng tỷ lượt xem, chuyển sang wide-column (Cassandra) hoặc kho cột.
- (c) PostgreSQL: bảng `reviews` có khóa ngoại tới `products` và `customers`, `CHECK (rating BETWEEN 1 AND 5)`, bảng con cho ảnh hoặc cột `JSONB` cho danh sách URL ảnh. Đánh giá gắn chặt với sản phẩm, khách, và đơn đã mua, nên cần ràng buộc quan hệ.

Tự chấm: phương án khác vẫn được nếu lập luận nêu đủ các ý sau. (a) dữ liệu tạm, cần tự hết hạn, mất cũng không sao; (b) khối lượng ghi lớn, dữ liệu cũ phải xóa được rẻ, quy mô nào thì cần hệ khác; (c) cần khóa ngoại và `CHECK`, nên giữ trong PostgreSQL.
</details>
