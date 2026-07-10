// 소켓도 api처럼 진입점에 권한을 검사할 필요가 있기 때문에 socket.user 등록해주기
// 여기에서 auth 관련 이벤트를 처리해주는것이 아닌 소켓IO 미들웨어 등록이기 때문에 auth.socket가 아닌 socket.auth로 설정함.