# Track `sql-30-days`: 30 ngày học SQL

Repo nội dung của track **30 ngày học SQL** trên [HCMUTE DSC Learning Hub](https://learn.hcmute-dsc.io.vn): lộ trình 30 ngày với PostgreSQL 16 và bộ dữ liệu DSC Shop, 32 bài học, 32 bài tập và dự án cuối khóa.

Mỗi track một repo `hcmute-dsc/learning-hub-track-<slug>`, cùng chuẩn với template [`learning-hub-track-template`](https://github.com/hcmute-dsc/learning-hub-track-template) ([ADR-10](https://github.com/hcmute-dsc/learning-hub-docs/blob/main/docs/product/DECISIONS.md#adr-10--mỗi-track-một-repo-learning-hub-content-thành-registry)). Track này trước đây nằm trong [`learning-hub-content`](https://github.com/hcmute-dsc/learning-hub-content); lịch sử commit được giữ nguyên khi tách ra.

- Nội dung và mục lục: [tracks/sql-30-days/README.md](tracks/sql-30-days/README.md)
- Môi trường thực hành (Docker, PostgreSQL 16): [tracks/sql-30-days/setup/README.md](tracks/sql-30-days/setup/README.md)
- Nguồn: nhập từ [hcmute-dsc/sql-challenge](https://github.com/hcmute-dsc/sql-challenge) bằng `tools/import-sql-challenge.mjs`

## Cấu trúc

```
tracks/sql-30-days/          # đúng MỘT thư mục, tên = slug của track
  track.yaml                 # thông tin track + danh sách chương
  docker-compose.yml, setup/ # PostgreSQL 16 + dữ liệu DSC Shop
  assets/                    # ảnh (≤ 500 KB/ảnh)
  modules/<chương>/
    module.yaml              # danh sách bài học và bài tập của chương
    lessons/*.md             # bài học
    exercises/<slug>/        # exercise.yaml + statement.md
tools/import-sql-challenge.mjs
```

Đặc tả đầy đủ: [CONTENT-SPECIFICATION](https://github.com/hcmute-dsc/learning-hub-docs/blob/main/docs/product/CONTENT-SPECIFICATION.md).

## Sửa nội dung

Theo [CONTRIBUTING.md](CONTRIBUTING.md): có issue trước, tạo nhánh, chạy validator, mở Pull Request. CI `validate` phải xanh, maintainer duyệt rồi squash merge.

**Merge vào đây chưa lên site.** Để publish, mở PR vào `learning-hub-content`, đổi `commit` của `sql-30-days` trong `tracks.yaml` sang commit mới nhất trên `main` của repo này. Ban chủ nhiệm duyệt PR đó rồi publish.

## Kiểm tra trên máy

```bash
git clone https://github.com/hcmute-dsc/learning-hub ../learning-hub
cd ../learning-hub && npx -y pnpm@9.15.4 install --filter @hub/content... && npx -y pnpm@9.15.4 --filter @hub/content build && cd -
node ../learning-hub/packages/content/dist/cli.js .
```

## Giấy phép

[MIT](LICENSE.md), như repo gốc `sql-challenge`.
