// ./auth.controller.js에서 사용하는 서비스 계층

import config from "../config/env.js"
import { logger } from "../utils/logger.js"

// [2026-07-10 11:17:42] 현재 controller에서 google oauth2 code -> token -> userinfo 까지 한 흐름 완성했고, 이제 코드를 분리해서 함수 3개로 분리할 예정.
// buildGoogleAuthUrl: 최초 사용자 접속 url 생성 (redirect)
// exchangeGoogleCodeForToken: 코드를 인자로 받아서 token 정보 반환하기
// fetchGoogleUserInfo: 토큰(accessToken)을 받아서 사용자 정보 보내주기

/**
 * 사용자가 리다이렉트하여 로그인 할 구글 리다이렉트 url을 생성해줌.
 * @returns redirectUrl
 */
export function buildGoogleAuthUrl() {
  // 구글 oauth url 사용
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline", // refresh token 요청
    prompt: "consent" // 사용자에게 동의 화면을 다시 보여주게 하기
  })

  const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`

  logger("/auth/auth.service.js buildGoogleAuthUrl", `redirect_url: ${redirectUrl}`)

  return redirectUrl
}

export async function exchangeGoogleCodeForToken(code) {
  logger("auth/auth.service.js exchangeGoogleCodeForToken", `googleapis code를 통해 accessToken 발급 요청`)

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.google.callbackUrl,
      grant_type: "authorization_code"
    })
  })

  logger("auth/auth.service.js exchangeGoogleCodeForToken",
    `redirect_url: ${config.google.callbackUrl}`
  )

  const tokenData = await tokenResponse.json()

  // 요청 자체가 실패했을 때 (네트워크 등)
  if (!tokenResponse.ok) {
    throw new Error(tokenData?.error_description ?? "Google token request failed");
  }
  // 필수적인 두 요소중 하나라도 존재하지 않을 때 
  if (!tokenData.access_token || !tokenData.token_type) {
    throw new Error("Google token response is incomplete");
  }

  // 사용자 권한 토큰
  const accessToken = tokenData?.access_token 
  // 토큰 만료일
  const expiresIn = tokenData?.expires_in 
  // 재발급 토큰. 안올수도 있음
  const refreshToken = tokenData?.refresh_token 
  // 제공 데이터 (openid, email, profile)
  const scope = tokenData?.scope 
  const scopeArr = scope?.split(" ").map(scope => {
    const lastPart = scope.split("/").at(-1);
    return lastPart;
  }) ?? undefined
  // 인증 타입. (보통 Bearer)
  const tokenType = tokenData?.token_type 
  // email 사용자 고유 id
  const idToken = tokenData?.id_token 
  logger("auth/auth.service.js exchangeGoogleCodeForToken", `
  토큰 응답 상태: 
      access_token: ${Boolean(accessToken)}
      expires_in: ${expiresIn}
      refresh_token: ${Boolean(refreshToken)} 
      scope: ${scopeArr}
      token_type: ${tokenType}
      id_token: ${Boolean(idToken)}`)

  return { googleAccessToken: accessToken, expiresIn, googleRefreshToken: refreshToken, scope, tokenType, idToken }
}

/**
 * googleapis openidconnect 를 이용하여 token -> userinfo로 변환
 * @param {string} token 구글 userid
 *  { sub, name, given_name, family_name, picture, email, email_verified } 반환
 */
export async function fetchGoogleUserInfo({ tokenType, googleAccessToken}) {
  const userInfoResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo", {
    method: "GET",
    headers: {
      Authorization: `${tokenType} ${googleAccessToken}`
    }
  })
  
  // 
  const userInfo = await userInfoResponse.json();

  // 사용자 정보 요청 자체가 실패했을 때
  if(!userInfoResponse.ok) {
    throw new Error(userInfo.error_description ?? "Google userinfo request failed")
  }

  // 필수적인 내용 (google_id와 이메일 )
  if (!userInfo.sub || !userInfo.email) {
    throw new Error("Google userinfo response is incomplete");
  }
  
  const sub = userInfo?.sub
  const name = userInfo?.name
  const givenName = userInfo?.given_name
  const familyName = userInfo?.family_name
  const picture = userInfo?.picture
  const email = userInfo?.email
  const emailVerified = userInfo?.email_verified



  // 로그 찍기
  logger("auth/auth.service.js fetchGoogleUserInfo", `
  openidconnect request responsed:
      sub: ${sub}
      name: ${name}
      given_name: ${givenName}
      family_name: ${familyName}
      picture: ${picture}
      email: ${email}
      email_verified: ${emailVerified}
  `)

  return { sub, name, givenName, familyName, picture, email, emailVerified }
}