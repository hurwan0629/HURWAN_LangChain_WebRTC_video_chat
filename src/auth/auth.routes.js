// auth에서 올바른 controller을 호출해주는 계층

import { Router } from "express"

import { startGoogleLogin, handleGoogleCallback, provideMe, handleRefreshTokenRequest, logout } from "./auth.controller.js"
import { checkAccessToken } from "./auth.middleware.js"
import config from "../config/env.js"

const router = Router()

router.get("/login", startGoogleLogin)

// console.log(config.google.callbackUrl)

router.get("/google/callback", handleGoogleCallback)

// 사용자가 자신의 정보 요청하면 정보들 주기
router.get("/me", checkAccessToken, provideMe)

router.post("/refresh", handleRefreshTokenRequest)

// [2026-07-12 20:12:54] 이제야 로그아웃 간단히 구현
router.post("/logout", logout)

export default router