// cors, route, 파서, jwt , 공통에러 등 처리


import express from "express"
import morgan from "morgan"
import cookieParser from "cookie-parser"
import cors from "cors"
import { currTime } from "../utils/date.js"
import config from "../config/env.js"
import { appCorsOptions } from "../config/cors.js"

// [2026-07-10 07:55:12]: app는 참조객체이기 때문에 반환값은 없어도 됨. 등록만 해주며 기본적으로 동기이기 때문에 async는 없이 사용
/**
 * app 어플리케이션을 넣으면 여기에 미들웨어를 등록해준다. [2026-07-10 07:59:37] 동기 기준으로 작업
 * @param {Express} app 
 */
export default function registAppMiddleware(app) {
  
  // cors 설정
  app.use(cors(appCorsOptions))

  // // // // // // [기본설정] // // // // // // 
  // Content-Type: applicaion/json 자동 파싱
  app.use(express.json()) 
  // Content-Type: application/x-www-form-urlencoded 자동파싱
  app.use(express.urlencoded({ extended: true }))
  // 쿠키 파서
  app.use(cookieParser())
  // 정적 파일 설정
  app.use(express.static(config.host.publicPath))

  // // // // // // [morgan] // // // // // // 
  // morgan은 일단 따로 분리하지 않고 사용
  morgan.token("curr-time", (req, res) => {
    return currTime()
  })
  morgan.token('url-path', (req, res) => {
    return req.path; // 쿼리 스트링(?a=1&b=2)이 완전히 제거된 경로만 반환
  });
  // 처리 도중 에러날 수 있으니 앞뒤로 로그 써주기
  app.use(morgan("[:curr-time] [morgan pre] :remote-addr :method :url-path status\::status", { immediate: false }))
  app.use(morgan("[:curr-time] [morgan fin] :remote-addr :method :url-path status\::status response-time\::response-time ms - res-size\::res[content-length]"))



}