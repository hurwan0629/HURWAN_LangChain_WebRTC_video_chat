// 방 비번 관리용 bcrypt해싱 (다른 방식일수도 있고)

import { createRequestId } from "./crypto.js"
import bcrypt from "bcrypt"
import config from "../config/env.js"
import { logger } from "./logger.js"

export async function hashPassword(password) {
  return await bcrypt.hash(password, 10)
}

export async function comparePassword(password, passwordHash) {
  logger("/utils/comparePassword", `password: ${password}, passwordHash: ${passwordHash}`)
  return await bcrypt.compare(password, passwordHash)
}

export function createP2PPlainPassword(length = config.p2p.p2pPasswordLength) {
  return createRequestId(length)
}

export function createGroupRooomPlainPassword(length = config.group.groupRoomPasswordLength) {
  return createRequestId(length)
}