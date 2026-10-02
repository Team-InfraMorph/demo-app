# demo-app web + worker API v1

InfraMorph의 AWS 데모 앱입니다. Public web 서비스와 private worker가 같은 PostgreSQL 데이터베이스를 사용합니다.

## 계산 흐름

1. 브라우저에서 ID와 정수를 입력하고 `×2 작업 저장`을 누릅니다.
2. `POST /api/calculations`가 작업을 PostgreSQL에 `PENDING` 상태로 저장합니다.
3. `node src/worker.js`로 실행되는 worker가 작업을 가져와 입력값을 두 배로 계산합니다.
4. worker가 결과와 `COMPLETED` 상태를 PostgreSQL에 저장합니다.
5. `GET /api/calculations/:id` 또는 화면의 조회 버튼으로 저장된 결과를 확인합니다.

## 실행

Node.js 22와 PostgreSQL이 필요합니다.

```sh
npm ci
cp .env.example .env
# .env에 DATABASE_URL을 설정합니다.
node src/migrate.js
npm start
```

별도 터미널에서 worker를 실행합니다.

```sh
npm run worker
```

## API

- `GET /health`
- `POST /api/calculations` — JSON `{"id":"order-1","number":21}`
- `GET /api/calculations/:id`
- `POST /api/notes` — JSON `{"text":"hello"}`
- `GET /api/notes`
- `POST /api/images` — `image/png` 또는 `image/jpeg` 원본 바이트
- `GET /api/images/:key`

계산 입력은 PostgreSQL `INTEGER` 범위에서 두 배 결과가 안전한 정수로 제한됩니다. 동일 ID를 다시 POST하면 새 입력값으로 작업을 다시 시작합니다.

## AWS 이미지

Docker 이미지는 `linux/amd64`로 빌드하며 non-root `node` 사용자로 실행됩니다. 이미지에는 서울 리전 Amazon RDS CA bundle이 포함되고 Node는 `NODE_EXTRA_CA_CERTS`로 이를 신뢰합니다.

```sh
docker build \
  --platform linux/amd64 \
  --build-arg SOURCE_REVISION="$(git rev-parse HEAD)" \
  --tag "app:$(git rev-parse HEAD)" \
  .
```

ECS worker command는 `node src/worker.js`, migration command는 `node src/migrate.js`입니다. AWS 환경에서는 `DATABASE_URL`, `STORAGE_BUCKET`, `STORAGE_DRIVER=s3`를 task 설정과 Secrets Manager로 주입합니다.
