// auth에서 작업하는 컨트롤러에 대한 파일

import config from "../config/env.js"
import { logger } from "../utils/logger.js"

import { exchangeGoogleCodeForToken, buildGoogleAuthUrl, fetchGoogleUserInfo } from "./auth.service.js"
import { onUserLoginService } from "../user/user.service.js"
import { createAuthTokens } from "./jwt.service.js"

// 1. auth 로그인 하려는 사용자를 구글 로그인 화면으로 보내주기
export function startGoogleLogin(req, res) {

  // 사용자가 로그인할 구글 로그인 url을 받아옴
  const googleLoginRedirectUrl = buildGoogleAuthUrl()
  
  res.redirect(googleLoginRedirectUrl)
}

// 2. 구글이 리다이렉트 uri로 보내주는 주소로 받아주기
export async function handleGoogleCallback(req, res, next) {
  // 여기에서 Google Oauth가 iss[발급지], code[토큰 교환권(서버용)], scope[제공 범위], authuser[브라우저의 사용자 번호(고유X)]
  try {
    // 코드 확인하기
    const { code } = req.query

    logger("auth/auth.controller.js handleGoogleCallback", `code exists: ${!!code}`)

    if (!code) {
      return res.redirect("/index.html?error=missing_google_code");
    }

    // token API를 이용해서 구글에 [code] -> [사용자 정보 교환용 토큰] 요청
    const { 
      googleAccessToken, expiresIn, googleRefreshToken, scope, tokenType, idToken 
    } = await exchangeGoogleCodeForToken(code)
    
    // logger("auth/auth.controller.js handleGoogleCallback", `${JSON.stringify({ 
    //   googleAccessToken, expiresIn, googleRefreshToken, scope, tokenType, idToken 
    // })}`)

    // token을 통해 googleapis의 openidconnect를 통해 userInfo 받기.
    const { 
      sub, name, givenName, familyName, picture, email, emailVerified 
    } = await fetchGoogleUserInfo({ tokenType, googleAccessToken})

    // DB에서 sub를 이용해서 사용자 조회 및 최신 로그인 기록 업데이트
    const user = await onUserLoginService({ sub, name, picture, email })
    
    // jwt 토큰 발급
    const { accessToken, refreshToken } = createAuthTokens(user)

    // 사용자에게 토큰 (쿠키)를 주며 페이지로 리다이렉트 시켜주기
    res.cookie("accessToken", accessToken, {
      path: "/",
      httpOnly: config.jwt.httponly,
      sameSite: config.jwt.sameSite,
      secure: config.jwt.secure, 
      maxAge: config.jwt.accessCookieMaxAge
    })

    res.cookie("refreshToken", refreshToken, {
      path: "/",
      httpOnly: config.jwt.httponly,
      sameSite: config.jwt.sameSite,
      secure: config.jwt.secure, 
      maxAge: config.jwt.refreshCookieMaxAge
    })

    logger("/auth/auth.controller.js handleGoogleCallback", `${user.name}님 로그인! users.id: ${user.id}`)
    
    res.redirect("/dashboard.html")
  } catch (error) {
    logger("/auth/auth.controller.js handleGoogleCallback", error.message);
    return res.redirect("/index.html?error=google_login_failed");
  }
}