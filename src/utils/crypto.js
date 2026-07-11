import crypto from "node:crypto"

import config from "../config/env.js"

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

 export function createRequestId(length = config.p2p.p2pRoomIdLength) {
   let code = ""

   for (let i = 0; i < length; i++) {
     const index = crypto.randomInt(0, CHARS.length)
     code += CHARS[index]
    }

    return code
 }