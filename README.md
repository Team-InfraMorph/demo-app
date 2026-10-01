# demo-app

개발을 시작하기 전에 [협업 규칙 및 Git 훅 설치](CONTRIBUTING.md)를 확인하세요.

Node.js 22.11 이상이 필요합니다. 원본 v1은 SQLite와 로컬 `uploads/`를 사용합니다.

## 새 환경에서 v1 실행

1. `npm ci`
2. `.env.example`을 `.env`로 복사하고 `DATABASE_URL="file:./dev.db"`, `PORT=3000`을 입력
3. `npx prisma db push`
4. `npm start`

API:
- `GET /health`
- `POST /api/notes` — JSON `{"text":"hello"}`
- `GET /api/notes`
- `POST /api/images` — Content-Type `image/png` 또는 `image/jpeg`, 본문은 파일 바이트
- `GET /api/images/:key`

`demo-v1` 태그는 worker가 없는 원본 앱입니다. `demo-v2` 태그는 worker가 추가된 앱입니다.
태그의 전체 커밋 SHA는 `git rev-parse demo-v1`과 `git rev-parse demo-v2`로 확인합니다.

DB 파일과 `uploads/`는 Git에 넣지 않습니다. 서버를 종료하고 다시 시작해도 같은 로컬 디렉터리에서 메모와 사진이 남아야 합니다.