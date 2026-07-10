// auth에서 올바른 controller을 호출해주는 계층

import { Router } from "express"

import { startGoogleLogin, handleGoogleCallback } from "./auth.controller.js"
import config from "../config/env.js"

const router = Router()

router.get("/login", startGoogleLogin)

// console.log(config.google.callbackUrl)

router.get("/google/callback", handleGoogleCallback)

export default router