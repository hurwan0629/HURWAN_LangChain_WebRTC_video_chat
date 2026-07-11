// users 관련 레포

import { query } from "../config/db.js"


/**
 * users.id 받고 { id, google_id, email, profile_image_link, name, created_at, updated_at, last_login_at } 응답
 * @param {*} userId 
 */
export async function getUserByUserId(userId) {
  const { rows } =  await query(`
    SELECT id, google_id, email, profile_image_link, name, created_at, updated_at, last_login_at
    FROM users
    WHERE id = $1
    `, [userId])

  return rows[0] ?? null
}


/**
 * 입력: googleId (sub, openid)
 * 조회 field: id, google_id, email, profile_image_link, name, created_at, updated_at, last_login_at
 * 
 * @param {*} googleId 
 */
export async function getUserByGoogleId(googleId) {
  const { rows } =  await query(`
    SELECT id, google_id, email, profile_image_link, name, created_at, updated_at, last_login_at
    FROM users
    WHERE google_id = $1
    `, [googleId])

  // if(!rows?.length) {
  //   return null
  // }
  // else {
  //   return rows[0]
  // }
  // [2026-07-10 15:41:45] 위에 6줄이 아래 한줄하고 같은 결과라고? ㅋㅋ
  return rows[0] ?? null
}

export async function createUser({ sub, name, picture, email }) {
  const { rows } = await query(`
    INSERT INTO users (google_id, email, profile_image_link, name) 
    VALUES($1, $2, $3, $4)
    RETURNING id, google_id, email, profile_image_link, name, created_at, updated_at, last_login_at
    `, [sub, email, picture, name])

  return rows[0];
}

/**
 * 사용자의 최종 로그인 시간 (users.last_login_at)을 현재로 업데이트 및 결과 개수에 따라 true/false 반환
 * 결과 개수가 1 이상이면 true
 * users.id를 인자로 받음 (where 탐색 조건)
 * @param {*} userId 
 */
export async function updateUserLastLoginAt(userId) {
  const { rowCount } = await query(`
    UPDATE users
    SET last_login_at = NOW()
    WHERE id = $1
    `, [userId])
  return !!rowCount
}