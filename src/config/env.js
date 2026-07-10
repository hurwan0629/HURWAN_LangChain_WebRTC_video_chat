// 어떤 환경변수 파일을 사용할 것인지 선택하는 파일 + 외부로 export

import dotenv from "dotenv"
import { fileURLToPath } from "node:url"
import path from "path"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const __publicpath = path.resolve(__dirname, "..", "..", "public")

const DEFAULT_PORT = "8080"

// [2026-07-10 08:08:09]에 생성
/**
 * 키 이름을 인자로 넣으면 해당 값을 환경변수에서 가져와주는 함수
 * @param {string} key 가져올 키 이름
 * @param {any} defaultKey 없을시에 대체할 값. 안넣으면 에러처리
 */
function required(key, defaultKey=undefined) {
  const value = process.env[key] ?? defaultKey // key가 없으면 defaultKey
  if(!value) {
    // 없으면 추정 가능하게 보내기
    throw new Error(`[Error] [/config/env.js] required Value(${key}) not exist Error`) 
  }
  return value
}

const config = {
  host: {
    publicPath: required("PUBLIC_PATH", __publicpath),
    port: parseInt(required("PORT", "8080")),
    ip: required("HOST_IP", "localhost"),
    clientOrigin: required("CLIENT_ORIGIN", `http://localhost:${required("PORT", DEFAULT_PORT)}`),
    credentialAllow: true
  },

  google: {
    clientId: required("GOOGLE_CLIENT_ID"),
    clientSecret: required("GOOGLE_CLIENT_SECRET"),
    callbackUrl: `http://localhost:${required("PORT", DEFAULT_PORT)}` + required("GOOGLE_CALLBACK_URL_PATH")
  }
}

export default config