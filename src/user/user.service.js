// 사용자 비즈니스계층

import * as UserRepository from "./user.repository.js"
import { logger } from "../utils/logger.js"

/**
 * 사용자 openid, 이름, 사진(링크), 이메일 받아서 생성 또는 조회해서 
 * 변경되었으면 업데이트 해주고, 없으면 생성해서 id 뽑아주기 
 * @param {*} param0 { id, google_id, email, profile_image_link, name, created_at, updated_at, last_login_at }
 */
export async function getOrCreateUserIdByUserInfo({ sub, name, picture, email }) {
  // 사용자 조회 (sub로)
  let user = await UserRepository.getUserByGoogleId(sub)

  // 있는지 확인
  if(!user) {
    // 없으면 생성
    user = await UserRepository.createUser({ sub, name, picture, email })
    logger("/user/user.service.js getOrCreateUserIdByUserInfo", `회원 최초 로그인! ${name} 로그인. google_id: ${user.id}, name: ${user.name}`)
  }

  return user
}

/**
 * 사용자 로그인 했을 때 자동으로 user 객체 반환 및 로그인 상태 업데이트 해주기
 * 리턴값: {  id, google_id, email, profile_image_link, name, created_at, updated_at, last_login_at }
 * @param {*} param0 
 */
export async function onUserLoginService({ sub, name, picture, email }) {
  const user = await getOrCreateUserIdByUserInfo({ sub, name, picture, email })

  // users.last_login_at 업데이트 해주기
  // 결과는 중요하지 않으니 로그만 찍어주기
  const updateLoginAtResult = await UserRepository.updateUserLastLoginAt(user.id)

  logger("/user/user.service.js onUserLoginService", `${name} last_login_at 업데이트 성공여부: ${updateLoginAtResult}`)

  return user
}

/**
 * users.id 받고 { id, google_id, email, profile_image_link, name, created_at, updated_at, last_login_at } 응답
 * @param {*} userId 
 * @returns 
 */
export async function getUserByUserId(userId) {
  return await UserRepository.getUserByUserId(userId)
}
