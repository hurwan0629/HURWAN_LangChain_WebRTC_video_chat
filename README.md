# 다중/P2P 화상회의 서비스

업데이트 날짜: [`2026-07-13 16:24:07`]
시작 날짜: [`2026-07-09 07:40:00`]
마감 날짜(발표준비까지): [`2026-07-13 16:23:39`]

### 목표
```
해당 프로젝트는 다음과 같은 목적을 위해 만들어졌습니다.
- 기술 공부
  - 깃 버전 관리 및 마이그레이션 연습 (`mongo/postgre`, `서버메모리/Redis`)
  - 오토스케일링
  - 이벤트 기반 프로그래밍
  - WebRTC (RTCPeerConnection, mediasoup)
  - Node서버 및 Express 프레임워크, Socket.io/mediasoup 라이브러리 사용연습
  - https 배포 연습 (ngrok -> 직접 인증서 구현까지)
  - google oauth 복습 (+jwt)
  - mediapipe
  - 시간 남으면 보안 및 디도스 등과 같은 보안까지 신경쓰기
  - 문서화 공부 (그냥 많이 할수록 좋으니까)
- 과제
```

---

- [NOTION](https://app.notion.com/p/WebRTC-398117a41d4d80aaa14cdc25833ef964?source=copy_link)

---

`2026-07-13 16:25:56`

## 실행 방법

루트에서

```bash
npm install
npm run dev
```

## 주요 기능

- Google OAuth 로그인 및 JWT 쿠키 인증
- Socket.IO 기반 실시간 접속 관리
- P2P 1:1 화상 통화
- mediasoup 기반 그룹 화상 회의
- 개발용 상태 확인 API(배포시 [app.js](./src/app/app.js)에서 주석 달고 실행): /devTest/onlineUsers, /devTest/p2pRequests, /devTest/rooms

## 환경 변수

`.env.example`을 참고해 `.env`를 생성하시면 됩니다.

> 전체적으로 채워져있는 상황이며 환경변수는 다음과 같습니다.
> google oauth는 직접 google console에서 클라이언트를 생성하셔야합니다.

```md
-  `PORT` 
-  `HOST_IP` (배포시 대체로 `0.0.0.0`)
-  `PUBLIC_PATH` (정적 자원 경로. 비워둬도 됨)
-  `CLIENT_ORIGIN`  ngrok 사용 시 ngrok 주소를 입력해야합니다.
-  `GOOGLE_CLIENT_ID` 
-  `GOOGLE_CLIENT_SECRET` 
-  `GOOGLE_CALLBACK_URL_PATH` 
-  `DB_HOST` 
-  `DB_PORT` 
-  `DB_NAME` 
-  `DB_USER` 
-  `DB_PASSWORD` 
-  `JWT_SECURE`  (true/false)
-  `JWT_SAME_SITE`  (true/false)
-  `JWT_HTTP_ONLY`  (true/false)
-  `JWT_ACCESS_SECRET`  (긴 랜덤 문자열 추천)
-  `JWT_ACCESS_EXPIRES_IN`  (숫자)
-  `JWT_ACCESS_COOKIE_MAX_AGE`  (숫자)
-  `JWT_REFRESH_SECRET`  (긴 랜덤 문자열 추천)
-  `JWT_REFRESH_EXPIRES_IN`  (숫자)
-  `JWT_REFRESH_COOKIE_MAX_AGE`  (숫자)
-  `P2P_ROOM_ID_LENGTH` 
-  `P2P_REQUEST_TIMEOUT_MS` 
-  `P2P_PASSWORD_LENGTH` 
-  `GROUP_ROOM_CODE_LENGTH` 
-  `GROUP_ROOM_PASSWORD_LENGTH` 
-  `BCRYPT_ROUND` (10~12 추천)
-  `MEDIASOUP_WORKER_MAX`  (`2026-07-13 16:31:38` 기준 실제로 쓰이지 않음)
-  `MEDIASOUP_LISTEN_IP`  (대체로 `0.0.0.0`)
-  `MEDIASOUP_ANNOUNCED_ADDRESS`  (로컬 밖에서 실행시 외부에서 볼 경로)
-  `MEDIASOUP_ENABLE_UDP`  (boolean)
-  `MEDIASOUP_ENABLE_TCP`  (boolean)
-  `MEDIASOUP_INITIAL_OUTGOING_BITRATE`  (숫자)
-  `MEDIASOUP_ENABLE_SCTP`  (boolean)
```

## 폴더 구조

- src/auth: 로그인, JWT, Google OAuth
- src/socket: Socket.IO 연결 및 인증
- src/p2p: 1:1 WebRTC 시그널링
- src/mediasoup: 그룹 화상 회의 transport/producer/consumer
- src/room: 그룹 방 상태 관리
- public: 정적 HTML, CSS, 클라이언트 JS
