// /app 에서 사용할 auth 미들웨어 (jwt 검증)

import { verifyAccessToken } from "./jwt.service.js"

// 사용자 req에 로그인 되어있는지 확인 후 req.user[id, email, name] 데이터 넣어주기
export function checkAccessToken(req, res, next) {
  // cookie-parser이 req.cookies를 만들어 줬기 때문에 확인만 하면 됨.
  const token = req?.cookies?.accessToken

  // 토큰이 없으면 일단 401 보내기
  if(!token) {
    return res.status(401).json({ message: "Invalid or expired token"})
  }

  // 해석하기 user[id, email, name]
  let payload;
  try {
     payload = verifyAccessToken(token)
  } catch(err) {
    return res.status(401).json({ message: "Invalid or expired token"})
  }

  req.user = {
    id: payload?.userId,
    email: payload?.email,
    name: payload?.name,
    profile_image_link: payload?.profile_image_link
  }

  next()
}