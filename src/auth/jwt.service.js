// 그냥 jwt를 뜯어서 뭔가 뽑아쓸 때 사용할 함수 또는 값들을 설정하는 공간

import jwt from "jsonwebtoken"
import config from "../config/env.js"

/**
 * 
 * @param {*} user // user[id, email, name] 사용 
 * @returns accessToken 문자열 발급 (string)
 */
export function createAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      profile_image_link: user?.profile_image_link
    },
    config.jwt.accessSecret,
    {
      expiresIn: config.jwt.accessExpiresIn
    }
  )
}

/**
 * 
 * @param {*} user user.id 필요
 * @returns 
 */
export function createRefreshToken(user) {
  return jwt.sign(
    {
      userId: user.id,
    },
    config.jwt.refreshSecret,
    {
      expiresIn: config.jwt.refreshExpiresIn
    }
  )
}

// [2026-07-10 16:08:50] 중간 시간 기록


/**
 * 재발급/접근 토큰 모두 생성해주는 함수
 * @param {*} user user[id, email, name, profile_image_link] 필요
 * @returns {string} { refreshToken: string, accessToken: string }
 */
export function createAuthTokens(user) {
  return {
    accessToken: createAccessToken(user),
    refreshToken: createRefreshToken(user),
  }
}

/**
 * access토큰을 읽어서 분해해주는 함수 
 * @param {*} token 사용자가 준 토큰 (access)
 * @returns {object} { 
 *  iat: 발급시간, (유닉스 시간)
 *  exp: 만료 시간, (유닉스 시간)
 *  userId,
 *  email,
 *  name,
 *  profile_image_link
 * }
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret)
}

/**
 * refresh 토큰을 다시 보내주는 방식
 * @param {*} token 사용자가 준 토큰 (access)
 * @returns {object} { 
 *  iat: 발급시간, (유닉스 시간)
 *  exp: 만료 시간, (유닉스 시간)
 *  userId,
 * }
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret)
}

