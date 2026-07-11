# API문서
> 원래라면 먼저 만들고 작업하는게 맞는데 머릿속에 구조가 안그려져서 하면서 추가합니다. (이벤트 + 상태기반 + rtc + 풀스택서버로 하려니까 더 힘든듯... ㅎ)

## middleware (accessToken)
해당 인증을 하는 

- 토큰없음(또는 만료): `res.status(401).json({ message: "Invalid or expired token"})` 
- 

## /auth
- `/login`

- `/google/callback`

- `/me`
```
# Request form
GET /auth/me
credentials-required: accessToken
Content-Type: application/json
body: none

# Response
{
  user: {
    userId: int, 
    name: str, 
    email: str, 
    profile_image_link: str, 
  }
}
```


- `/refresh`