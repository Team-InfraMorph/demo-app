# InfraMorph 체험 보드

화이트·파랑·보라 화면에서 기존 메모와 이미지 API를 직접 사용합니다. 기존 V1은 web/DB/파일 저장, V2는 메모 집계 worker를 제공합니다.
V3는 V2의 기능과 데이터 구조를 유지하면서 체험 화면을 추가합니다. 구성 배지는 실행 성공의 증거가 아닙니다.

## 로컬 확인

Node 22에서 `npm ci`, `npx prisma generate`, `DATABASE_URL=file:./dev.db npx prisma db push` 후
같은 DATABASE_URL로 `npm start`합니다. 빈 SQLite 파일이 필요한 환경에서는 먼저 생성하세요.
`BOARD_URL=http://127.0.0.1:3000 node --test tests/board-contract.mjs`로 실제 API 계약을 확인합니다.

화면은 src/web만 정적으로 제공하며 외부 CDN은 사용하지 않습니다. PNG/JPEG 원본 바이트를 업로드합니다.
메모는 500자, 이미지는 5MB까지입니다. 확인키는 서버 이미지 조회에 사용합니다. 브라우저 저장소는 사용하지 않습니다.

## 그림 자료

src/web/assets의 JSON 6개는 id/title/description/kind/mime/data(Base64)를 포함합니다.
각 파일은 220KiB 이하입니다. 표시와 업로드에 같은 바이트를 사용합니다.
5개는 설명 그림이며 tools/make-diagrams.py로 생성한 원본입니다. 나머지는 캡션에 날짜·정책·재생 분석 여부를 명시한 실제 조종실 캡처입니다.
설명 그림, 구성 표기, 과거 캡처를 현재 배포 검증 결과로 해석하지 않습니다.

## 변경 배포 확인

같은 프로젝트에서 기존 V2의 API로 메모와 이미지를 등록하고 ID·확인키·이미지 해시를 보관합니다.
V3 배포 후 서버에서 메모와 이미지를 다시 조회합니다.
V2→V3는 worker 추가가 아닌 화면 추가입니다. worker 컨테이너와 현재 실행의 note_count 이벤트는 InfraMorph 실행 검사에서 따로 검증합니다.
실제 AI, Docker, 공개 접속, 휴대폰 확인은 각각 별도로 기록합니다.
