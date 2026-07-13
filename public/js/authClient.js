// 클라이언트 로그인 상태 확인

import { getMe, refreshToken } from "./api/authApi.js"

/**
 * accessToken 시도 -> refresh시도 -> access 시도 함수 
 * 성공 시 user { userId: number, email: str, name: str, profile_image_link: str } 반환
 */
export async function loadMe(){
  // 로드 되자마자 자신의 상태 가져와주기
  try{
    const me = await getMe()
    return me.user
  } catch (err) {
    try {
      await refreshToken()
      const meAgain = await getMe()
      return meAgain.user
    } catch (refrError) {
      return null
    }
  }
}
