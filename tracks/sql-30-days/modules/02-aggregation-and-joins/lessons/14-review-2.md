---
uid: "71e6a1e6-9f46-5bee-96b7-d5a8028b1dae"
slug: "review-2"
title: "Ngày 14: Ôn tập 2 - Báo cáo trên DSC Shop"
objectives:
  - "Viết được báo cáo doanh thu theo thời gian, theo danh mục, theo kênh và theo nhân viên trên dữ liệu nhiều bảng."
  - "Chọn đúng công cụ cho câu hỏi \"có ở A mà không có ở B\": `NOT EXISTS`, `LEFT JOIN ... IS NULL`, `EXCEPT`."
  - "Nhận ra và sửa được lỗi nhân dòng khi JOIN rồi SUM, lỗi `COUNT(*)` với `LEFT JOIN`, bẫy `NOT IN` với `NULL`."
  - "Giải được bài \"top 1 mỗi nhóm\" và \"so với tháng trước\" chỉ bằng CTE, subquery và JOIN."
prerequisites:
  - "sql-30-days/aggregation-and-joins/aggregate-functions"
  - "sql-30-days/aggregation-and-joins/group-by-having"
  - "sql-30-days/aggregation-and-joins/join"
  - "sql-30-days/aggregation-and-joins/subquery"
  - "sql-30-days/aggregation-and-joins/union-intersect"
  - "sql-30-days/aggregation-and-joins/case-when"
authors:
  - "github:TienNHM"
license: "MIT"
---

> **Tóm tắt:** Bài ôn tập chặng 2 (Ngày 8-13): hàm tổng hợp, GROUP BY/HAVING, JOIN, subquery và CTE, phép toán tập hợp, CASE. Thay vì các câu hỏi rời rạc, bạn sẽ viết một bộ báo cáo mà một cửa hàng thật cần: doanh thu theo tháng, theo danh mục, theo nhân viên, khách chưa mua, đối soát thanh toán. Mọi bài chỉ dùng kiến thức đã học, không dùng window function.

**Sau bài này bạn có thể:**

- Viết được báo cáo doanh thu theo thời gian, theo danh mục, theo kênh và theo nhân viên trên dữ liệu nhiều bảng.
- Chọn đúng công cụ cho câu hỏi "có ở A mà không có ở B": `NOT EXISTS`, `LEFT JOIN ... IS NULL`, `EXCEPT`.
- Nhận ra và sửa được lỗi nhân dòng khi JOIN rồi SUM, lỗi `COUNT(*)` với `LEFT JOIN`, bẫy `NOT IN` với `NULL`.
- Giải được bài "top 1 mỗi nhóm" và "so với tháng trước" chỉ bằng CTE, subquery và JOIN.

**Cần biết trước:** [Ngày 8](08-aggregate-functions.md), [Ngày 9](09-group-by-having.md), [Ngày 10](10-join.md), [Ngày 11](11-subquery.md), [Ngày 12](12-union-intersect.md), [Ngày 13](13-case-when.md)

## Nhìn lại chặng 2

| Ngày | Chủ đề | Câu hỏi nó trả lời | Bẫy hay gặp |
| --- | --- | --- | --- |
| 8 | `COUNT`, `SUM`, `AVG`, `MIN`, `MAX` | Bao nhiêu? Tổng bao nhiêu? | `COUNT(*)` khác `COUNT(cot)`; hàm tổng hợp bỏ qua `NULL` |
| 9 | `GROUP BY`, `HAVING` | ... theo từng nhóm? | Lọc hàm tổng hợp phải ở `HAVING`, không ở `WHERE` |
| 10 | `JOIN` | Dữ liệu nằm ở nhiều bảng | Nhân dòng khi JOIN rồi `SUM`; điều kiện ở `WHERE` biến `LEFT JOIN` thành `INNER JOIN` |
| 11 | Subquery, `EXISTS`, CTE | So với một con số tính từ chính dữ liệu; có hay không có | `NOT IN` gặp `NULL` trả 0 dòng |
| 12 | `UNION`, `INTERSECT`, `EXCEPT` | Gộp, phần chung, phần chênh lệch | `UNION` loại trùng làm mất dòng thật |
| 13 | `CASE`, `FILTER` | Phân loại, đếm/cộng có điều kiện, pivot | Thứ tự `WHEN`; thiếu `ELSE` thành `NULL` |

Thứ tự thực thi logic của một câu `SELECT` (Ngày 9) là chìa khóa cho phần lớn các lỗi trên:

```mermaid
flowchart LR
    F["FROM / JOIN"] --> W["WHERE"] --> G["GROUP BY"] --> H["HAVING"] --> S["SELECT"] --> D["DISTINCT"] --> O["ORDER BY / LIMIT"]
```

## Quy ước dùng trong bài

Để các báo cáo nhất quán với nhau, bài này dùng hai định nghĩa:

- **Đơn đã thanh toán:** `status NOT IN ('pending', 'cancelled')`. Đơn `pending` chưa trả tiền, đơn `cancelled` đã hủy. Đây cũng là các đơn có dòng trong bảng `payments`.
- **Doanh thu** của một dòng hàng: `quantity * unit_price * (1 - discount)`. Doanh thu của đơn, của tháng, ... là tổng các dòng hàng tương ứng. Dùng `unit_price` (giá lúc mua), không dùng `products.price` (giá hiện tại).

Số tiền có chiết khấu sẽ có phần thập phân `.00`, nên các báo cáo bọc `ROUND(...)` để in gọn. Tất cả bài chỉ đọc dữ liệu.

Cách làm: đọc đề, tự viết và chạy, so với kết quả trong phần Đáp án. Kết quả của bạn phải **giống từng con số**; nếu lệch, tìm xem bạn hiểu sai đề hay viết sai truy vấn.

## Bài tập

Phần bài tập của bài này nằm ở bài tập **Bài tập: Ôn tập 2 - Báo cáo trên DSC Shop** ngay sau bài học.

## Tóm tắt

- Thống nhất định nghĩa trước khi viết báo cáo (đơn nào được tính, doanh thu tính thế nào), và dùng lại cùng định nghĩa ở mọi truy vấn.
- Tổng hợp ở đúng "mức": tính tổng theo đơn trong CTE trước, rồi mới tính trung bình hay phân nhóm theo đơn.
- Nhóm theo thời gian bằng `DATE_TRUNC` để không gộp nhầm các năm; lọc khoảng thời gian bằng `>=` và `<`.
- Muốn giữ cả nhóm "không có dữ liệu": đi từ bảng chính bằng `LEFT JOIN`, dùng `COUNT(cot)` và `COALESCE`.
- Nhiều bảng con (dòng hàng, thanh toán) cùng JOIN vào một bảng cha sẽ nhân dòng: tổng hợp từng bảng con riêng rồi mới JOIN.
- "Có ở A mà không có ở B": `NOT EXISTS`, `LEFT JOIN ... IS NULL` hoặc `EXCEPT`; tránh `NOT IN` khi cột có thể `NULL`.
- Top 1 mỗi nhóm và so với kỳ trước giải được bằng CTE + subquery tương quan / self JOIN; window function ở Ngày 29 sẽ làm gọn hơn.

## Đọc thêm

- [Vì sao NOT IN của bạn trả về 0 dòng? Logic ba trị của SQL và cái bẫy NULL](https://tiennhm.io.vn/blog/sql-null-not-in-three-valued-logic) — Một câu NOT IN trả về đúng 0 dòng trong khi bảng có dữ liệu, còn NOT EXISTS cùng ý định lại trả về đủ.
- [LEFT JOIN của bạn đã thành INNER JOIN mà không ai báo](https://tiennhm.io.vn/blog/left-join-thanh-inner-join) — Thêm một điều kiện WHERE lên cột của bảng bên phải là LEFT JOIN âm thầm biến thành INNER JOIN, và những dòng bạn cố tình giữ lại biến mất.
