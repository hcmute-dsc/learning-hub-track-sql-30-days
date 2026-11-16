> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.

## Bài tập

Đặt biến môi trường `DATABASE_URL` trước khi chạy. Bài nào sửa dữ liệu thì chạy lại hai file init sau khi làm xong.

### Cơ bản

**Bài 1.** Viết hàm Python `get_orders_of_customer(conn, customer_id)` trả về `order_id`, ngày đặt (kiểu date) và `status` các đơn của một khách, sắp theo ngày đặt. In kết quả với khách 1.

<details>
<summary>Đáp án</summary>

```python
import os
import psycopg

def get_orders_of_customer(conn, customer_id):
    return conn.execute(
        """
        SELECT order_id, order_date::date AS order_date, status
        FROM orders
        WHERE customer_id = %s
        ORDER BY order_date
        """,
        (customer_id,),
    ).fetchall()

with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
    for row in get_orders_of_customer(conn, 1):
        print(row)
```

Kết quả:

```text
(1, datetime.date(2025, 1, 12), 'delivered')
(4, datetime.date(2025, 2, 14), 'delivered')
(13, datetime.date(2025, 7, 8), 'delivered')
(25, datetime.date(2025, 12, 24), 'delivered')
(37, datetime.date(2026, 9, 2), 'shipped')
```
</details>

**Bài 2.** Viết hàm Node.js `findCustomerByEmail(email)` dùng pool, trả về object khách (`customer_id`, `full_name`, `city`) hoặc `null` nếu không có. Thử với `an.nguyenvan@gmail.com` và với chuỗi `' OR '1'='1`.

<details>
<summary>Đáp án</summary>

```js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function findCustomerByEmail(email) {
  const { rows } = await pool.query(
    'SELECT customer_id, full_name, city FROM customers WHERE email = $1',
    [email]
  );
  return rows[0] ?? null; // không tìm thấy thì trả null
}

(async () => {
  console.log(await findCustomerByEmail('an.nguyenvan@gmail.com'));
  console.log(await findCustomerByEmail("' OR '1'='1"));
  await pool.end();
})();
```

Kết quả:

```text
{ customer_id: 15, full_name: 'Nguyễn Văn An', city: 'Hà Nội' }
null
```

Chuỗi tấn công chỉ được coi là một email lạ nên không khớp dòng nào.
</details>

**Bài 3.** Đoạn code sau tìm sản phẩm theo từ khóa. Chỉ ra lỗ hổng và sửa lại.

```python
def search(conn, kw):
    return conn.execute(f"SELECT sku, name FROM products WHERE name ILIKE '%{kw}%' ORDER BY sku").fetchall()
```

<details>
<summary>Đáp án</summary>

`kw` được ghép thẳng vào SQL. Với `kw = "x%' OR 1=1 --"` câu thành `... WHERE name ILIKE '%x%' OR 1=1 --%' ORDER BY sku`: phần sau `--` thành chú thích, điều kiện `OR 1=1` trả về mọi sản phẩm. Người dùng đã điều khiển được câu lệnh. Sửa: đưa cả dấu `%` vào giá trị tham số.

```python
def search(conn, kw):
    return conn.execute(
        "SELECT sku, name FROM products WHERE name ILIKE %s ORDER BY sku",
        (f"%{kw}%",),
    ).fetchall()
```

Kết quả `search(conn, "logitech")`:

```text
[('ACC-001', 'Chuột Logitech G102'), ('ACC-002', 'Chuột Logitech MX Master 3S')]
```
</details>

### Vận dụng

**Bài 4.** Viết hàm Python `monthly_revenue(conn, year)` trả về doanh thu từng tháng của một năm (bỏ đơn `cancelled`, doanh thu tính từ `order_items`, làm tròn đến đồng). Năm là tham số, không ghép chuỗi. In kết quả năm 2026.

<details>
<summary>Đáp án</summary>

```python
import os
import psycopg

def monthly_revenue(conn, year):
    return conn.execute(
        """
        SELECT EXTRACT(MONTH FROM o.order_date)::int AS thang,
               ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount))) AS doanh_thu
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.order_id
        WHERE o.status <> 'cancelled'
          AND o.order_date >= make_date(%s, 1, 1)
          AND o.order_date <  make_date(%s + 1, 1, 1)
        GROUP BY thang
        ORDER BY thang
        """,
        (year, year),
    ).fetchall()

with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
    for thang, doanh_thu in monthly_revenue(conn, 2026):
        print(thang, doanh_thu)
```

Kết quả:

| thang | doanh_thu |
| --- | --- |
| 1 | 34030500 |
| 2 | 11560000 |
| 3 | 18490000 |
| 4 | 17759000 |
| 5 | 21990000 |
| 6 | 1640000 |
| 7 | 17091000 |
| 8 | 29990000 |
| 9 | 17630000 |
| 10 | 44870000 |

Lọc bằng khoảng `>= đầu năm AND < đầu năm sau` thay vì `EXTRACT(YEAR ...) = %s` để PostgreSQL dùng được index trên `order_date` nếu có (Ngày 28).
</details>

**Bài 5.** Viết hàm Python `cancel_order(conn, order_id)` trong một transaction: chỉ hủy được đơn đang `pending` (đổi thành `cancelled`), đồng thời cộng trả số lượng của từng dòng hàng vào `stock_quantity`. Nếu đơn không tồn tại hoặc không ở trạng thái `pending` thì báo lỗi và không đổi gì. Thử với đơn 40 và đơn 1.

<details>
<summary>Đáp án</summary>

```python
import os
import psycopg

class CannotCancel(Exception):
    pass

def cancel_order(conn, order_id):
    with conn.transaction():
        row = conn.execute(
            """
            UPDATE orders
            SET status = 'cancelled'
            WHERE order_id = %s AND status = 'pending'
            RETURNING order_id
            """,
            (order_id,),
        ).fetchone()
        if row is None:
            raise CannotCancel(f"Đơn {order_id} không tồn tại hoặc không còn ở trạng thái pending")

        cur = conn.execute(
            """
            UPDATE products p
            SET stock_quantity = p.stock_quantity + oi.quantity
            FROM order_items oi
            WHERE oi.order_id = %s AND oi.product_id = p.product_id
            """,
            (order_id,),
        )
        return cur.rowcount

with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
    print("Số sản phẩm được cộng lại kho:", cancel_order(conn, 40))
    try:
        cancel_order(conn, 1)
    except CannotCancel as e:
        print("Lỗi:", e)
```

Kết quả:

```text
Số sản phẩm được cộng lại kho: 1
Lỗi: Đơn 1 không tồn tại hoặc không còn ở trạng thái pending
```

Sau đó đơn 40 có status `cancelled`, sản phẩm 12 (Redmi Note 13) tăng từ 25 lên 26. Đặt điều kiện `status = 'pending'` ngay trong UPDATE (thay vì SELECT trước rồi kiểm tra) giúp hai request hủy cùng lúc không cộng kho hai lần.
</details>

**Bài 6.** Đoạn Node.js sau lấy dòng hàng của nhiều đơn bằng N+1. Viết lại thành một truy vấn, kết quả trả về vẫn là object `{ order_id: [ {product_id, quantity}, ... ] }`. Thử với các đơn `[29, 31, 34]`.

```js
async function itemsSlow(orderIds) {
  const result = {};
  for (const id of orderIds) {
    const { rows } = await pool.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = $1 ORDER BY product_id', [id]);
    result[id] = rows;
  }
  return result;
}
```

<details>
<summary>Đáp án</summary>

```js
async function itemsFast(orderIds) {
  const { rows } = await pool.query(
    `SELECT order_id, product_id, quantity
     FROM order_items
     WHERE order_id = ANY($1::int[])
     ORDER BY order_id, product_id`,
    [orderIds]
  );
  const result = {};
  for (const id of orderIds) result[id] = [];
  for (const r of rows) result[r.order_id].push({ product_id: r.product_id, quantity: r.quantity });
  return result;
}
```

Cả hai hàm in ra cùng một kết quả, nhưng `itemsFast` chỉ chạy 1 truy vấn thay vì 3:

```text
{"29":[{"product_id":12,"quantity":2},{"product_id":22,"quantity":2}],
 "31":[{"product_id":16,"quantity":1},{"product_id":17,"quantity":1},{"product_id":18,"quantity":1}],
 "34":[{"product_id":22,"quantity":1},{"product_id":23,"quantity":5}]}
```
</details>

### Thử thách

**Bài 7.** Thêm vào API Express ở trên endpoint `POST /orders` nhận body `{"customer_id": 16, "items": [{"product_id": 16, "quantity": 2}]}` và dùng hàm `placeOrder` (bản Node). Trả về:

- `201` và `{"order_id": ...}` khi thành công,
- `409` khi một sản phẩm không đủ hàng,
- `400` khi `customer_id` không tồn tại (lỗi khóa ngoại `23503`) hoặc `quantity` không hợp lệ (`23514`, CHECK `quantity > 0`).

<details>
<summary>Đáp án</summary>

Sửa `placeOrder` để ném một lỗi riêng khi hết hàng, rồi ánh xạ lỗi sang mã HTTP:

```js
class OutOfStockError extends Error {}

// trong placeOrder, thay throw new Error(...) bằng:
//   throw new OutOfStockError(`Sản phẩm ${productId} không đủ hàng`);

app.post('/orders', async (req, res, next) => {
  try {
    const { customer_id: customerId, items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Đơn hàng phải có ít nhất một sản phẩm' });
    }
    const orderId = await placeOrder(
      customerId,
      items.map((i) => ({ productId: i.product_id, quantity: i.quantity }))
    );
    res.status(201).json({ order_id: orderId });
  } catch (err) {
    if (err instanceof OutOfStockError) return res.status(409).json({ error: err.message });
    if (err.code === '23503') return res.status(400).json({ error: 'Khách hàng hoặc sản phẩm không tồn tại' });
    next(err); // 23514, 22P02 và lỗi khác đi qua middleware xử lý lỗi chung
  }
});
```

Đặt hàng sản phẩm 3 (đang hết hàng) sẽ nhận `409`, không có dòng `orders` nào được tạo vì `placeOrder` đã ROLLBACK. Gửi `"quantity": 0` thì câu UPDATE trừ kho vẫn chạy được, nhưng câu INSERT vào `order_items` vi phạm CHECK `quantity > 0` (mã `23514`), transaction bị ROLLBACK và middleware trả `400`.
</details>
