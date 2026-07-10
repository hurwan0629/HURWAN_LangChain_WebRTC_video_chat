// express를 통해 어플리케이션 객체를 만들어서 반환해주는 파일

import express from "express"
import registAppMiddleware from "./middlewares.js"
import { logger } from "../utils/logger.js"
import authRoutes from "../auth/auth.routes.js"

const app = express()

// [2026-07-10 07:49:17]: 일단 미들웨어 등록을 위한 함수 걸기만 해주기. 
registAppMiddleware(app)
logger("/app/app.js", "어플리케이션 미들웨어가 등록되었습니다.")

// 라우팅 설정
app.use("/auth", authRoutes)

export default app