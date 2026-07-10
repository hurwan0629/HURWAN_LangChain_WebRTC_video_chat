// 데이터베이스 관련 어떤 데이터베이스 (지금은 몽고와 postgres)를 사용할 지 선택하는파일

import pg from "pg"
import config from "./env.js"
import { logger } from "../utils/logger.js"

const { Pool } = pg

// [2026-07-10 15:04:30] 커넥션 풀인가 했는데 맞네.
/**
 *   트랜잭션은 client = pool.connect() -> client.query("BEGIN")
 *  -> [작업] -> client.query("COMMIT") -> finally { client.release() }
 */ 
export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: 10 // 너무 많지 않게 설정
})

/**
 * 
 * @param {*} text 쿼리 / 인자는 $[번호] 방식으로 설정하고
 * @param {*} params 쿼리 인자. 배열 타입
 * @returns { result } 결과[result]
 */
export async function query(text, params) {
  // const start = Date.now()

  try {
    // 풀에서 쿼리 실행하는듯. 
    // text = 쿼리 / 인자는 $[번호] 방식으로 설정하고
    // params = 쿼리 인자. 배열 타입
    const result = await pool.query(text, params)
    // const duration = Date.now() - start



    return result 
  } catch (error) {
    logger("config/db.js query", error.message);
    throw error;
  }
}

// 
export async function closeDB() {
  await pool.end()
}