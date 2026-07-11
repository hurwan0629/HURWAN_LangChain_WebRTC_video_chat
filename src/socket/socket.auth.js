// 소켓도 api처럼 진입점에 권한을 검사할 필요가 있기 때문에 socket.data.user 등록해주기
// 여기에서 auth 관련 이벤트를 처리해주는것이 아닌 소켓IO 미들웨어 등록이기 때문에 auth.socket가 아닌 socket.auth로 설정함.

import { verifyAccessToken } from "../auth/jwt.service.js"
import { parseCookie } from "../utils/cookieParser.js"

/**
 * 
 */
export function socketAccessTokenCheck(socket, next) {
  // 직접 쿠키 파싱해서 socket.data 에 데이터 넣어놔주기. (cookie 모듈 있는거같은데 일단 그냥 해보기)
  const cookies = parseCookie(socket.handshake.headers?.cookie ?? "")
  const accessToken = cookies.accessToken

  // payload가 만료되거나 유효하지 않으면 그냥 막아주기.
  // 안되면 프론트에서 알아서 다시 refresh로 받아오게 만들었음.
  if(!accessToken) {
    return next(new Error("UNAUTHORIZED"))
  }

  // 토큰 해석해서 socket.data.user에 넣어주기
  try {
    const payload = verifyAccessToken(accessToken)

    socket.data.user = {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
      profile_image_link: payload.profile_image_link,
    }
    
    next()
  } catch (err) {
    // payload가 만료되거나 유효하지 않으면 그냥 막아주기.
    // 안되면 프론트에서 알아서 다시 refresh로 받아오게 만들었음.
    next(new Error("UNAUTHORIZED"))
  }
}