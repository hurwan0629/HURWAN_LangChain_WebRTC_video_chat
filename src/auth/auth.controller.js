// auth에서 작업하는 컨트롤러에 대한 파일

import config from "../config/env.js"
import { logger } from "../utils/logger.js"

import { exchangeGoogleCodeForToken, buildGoogleAuthUrl, fetchGoogleUserInfo } from "./auth.service.js"
import { onUserLoginService, getUserByUserId } from "../user/user.service.js"
import { createAuthTokens, verifyRefreshToken, createAccessToken } from "./jwt.service.js"

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
      path: "/auth/refresh", // refreshToken 노출 최소화
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

/**
 *  사용자가 /auth/me 를 하였을 때 사용자의 정보 (토큰에 들어있는)를 주는 함수
 * accessToken에서 해석해서 주는 것이기 때문에 데이터베이스 및 네트워크 작업 없음
 * token: { iat, exp, userId, name, email, profile_image_link }
 */
export function provideMe(req, res, next) {
  const user = req?.user

  // 사용자가 있는지 다시 확인
  if(!user) {
    logger("/auth/auth.controller.js provideMe", "user없는데 provideMe 도달됨 (/auth/me의 checkAccessToken 문제일 수 있음)")
    return res.status(401).json({ message: "Invalid access try"})
  }

  logger("/auth/auth.controller.js provideMe", `사용자의 정보 확인 ${JSON.stringify(user)}`)
  // 사용자 정보 뽑아서 응답해주기
  return res.status(200).json({
    user: user
  })
}


/**
 * 사용자의 refreshToken요청에 대해서 확인 후 발급해주기
 */
export async function handleRefreshTokenRequest(req, res, next) {
  // 사용자의 refreshToken이 왔는지 확인해보기
  const refreshToken = req?.cookies?.refreshToken

  // 없으면 반환
  if(!refreshToken) {
    return res.status(401).json({ message: "Invalid or Expired requestToken"})
  }

  // 있으면 조회
  try {
    const {iat, exp, userId } = verifyRefreshToken(refreshToken)

    // userId를 통해서 email, userId, name, profile_image_link 뽑아와주기
    let user
    try {
      user = await getUserByUserId(userId)
    }
    catch(err) {
      logger("/auth/auth.controller.js handleRefreshTokenRequest", `삭제된 회원 ${user?.name}님의 DB 조회 실패`)  
      return res.status(400).json({ message: "User not exists" })
    }

    logger("/auth/auth.controller.js handleRefreshTokenRequest", `${user?.name}님의 토큰 재발급 google_id: ${user?.google_id}, email: ${user?.email} `)

    // accessToken 다시 발급해주기
    const accessToken = createAccessToken({ 
      id: user?.id, 
      name: user?.name, 
      email: user?.email,
      profile_image_link: user?.profile_image_link
    })

    // 사용자에게 토큰 (쿠키)를 주며 페이지로 리다이렉트 시켜주기
    res.cookie("accessToken", accessToken, {
      path: "/",
      httpOnly: config.jwt.httponly,
      sameSite: config.jwt.sameSite,
      secure: config.jwt.secure, 
      maxAge: config.jwt.accessCookieMaxAge
    })

    return res.status(200).json({ message: "accessToken issued"})

  } catch(err) {
    // 유효하지 않은 쿠키일 경우에는 반환해주기
    logger("/auth/auth.controller.js handleRefreshTokenRequest", "유효하지 않은 refreshToken를 통한 accessToken 발급요청")
    return res.status(401).json({ message: "Invalid or Expired requestToken"})
  }
}

// [2026-07-12 20:13:43] 
// 그냥 비어있는 accessToken, refreshToken 보내버리기
export function logout(req, res, next) {
  // 사용자에게 토큰 (쿠키)를 주며 페이지로 리다이렉트 시켜주기
  res.cookie("accessToken", "", {
    path: "/",
    httpOnly: config.jwt.httponly,
    sameSite: config.jwt.sameSite,
    secure: config.jwt.secure, 
    maxAge: 0
  })

  res.cookie("refreshToken", "", {
    path: "/auth/refresh", // refreshToken 노출 최소화
    httpOnly: config.jwt.httponly,
    sameSite: config.jwt.sameSite,
    secure: config.jwt.secure, 
    maxAge: 0
  })
  
  res.status(200).json({ 
    ok: true,
  })
}