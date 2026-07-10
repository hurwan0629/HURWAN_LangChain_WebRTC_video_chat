// auth에서 작업하는 컨트롤러에 대한 파일

import config from "../config/env.js"
import { logger } from "../utils/logger.js"

import { exchangeGoogleCodeForToken, buildGoogleAuthUrl, fetchGoogleUserInfo } from "./auth.service.js"


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
    logger("auth/auth.controller.js handleGoogleCallback", `code exists: ${Boolean(code)}`)

    // token API를 이용해서 구글에 [code] -> [사용자 정보 교환용 토큰] 요청
    const { accessToken, expiresIn, refreshToken, scope, tokenType, idToken } = await exchangeGoogleCodeForToken(code)
    
    // token을 통해 googleapis의 openidconnect를 통해 userInfo 받기.
    const { sub, name, given_name, family_name, picture, email, email_verified } = await fetchGoogleUserInfo({ tokenType, accessToken})

    // 
    
    res.send({ sub, name, given_name, family_name, picture, email, email_verified })
  } catch(error) {
    next(error)
  }
}