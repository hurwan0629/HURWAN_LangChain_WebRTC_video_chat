// [/auth/me] + [accessToken] 을 이용해서 자신의 정보 가져오기
// 실패하면 [/auth/refresh]를 통해 [refreshToken]을 용해서 [accessToken] 재발급받기 (응답으로 200 또는 401을 통해 성패 여부 확인)
// 성공하면 다시 [/auth/me] 사용하기

import { apiFetch } from "./apiFetch.js";

/**
 * accessToken을 통해서 /auth/me 로 
 * 사용자의 정보를 일반객체 형태로 반환한다.
 * 실패하면 Error 발생시킴
 */
export async function getMe() {
  return await apiFetch("/auth/me")
}

/**
 * 서버에 /auth/refresh 요청하여 성공 여부 (200/401)을 받고 200이면 accessToken을 발급받는다.
 * refreshToken은 path가 /auth/refresh이기 때문에 이 요청 이외에는 나갈일이 없다고 봐도 된다.
 */
export async function refreshToken() {
  return await apiFetch("/auth/refresh", { method: "POST" })
}