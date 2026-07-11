// 페이지 url: /p2p.html?requestId=ABC123&role=[caller | callee]


// 흐름 정리해보기
// 1. dashboard에서 사용자가 방 생성
//  -> 서버가 방 requestId 및 password 생성
// 2. p2p페이지로 사용자 이동
// 3. socket 다시 연결 후 caller에 자신의 socketId 등록 
// 4. caller가 자신의 nickname를 입력하고 방 코드와 비밀번호 받기
// 5. callee가 방 코드 및 비번 입력하고 들어와서 닉네임 입력하기
// 6. caller가 join 확인 후 offer 시작