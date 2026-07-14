// mediasoup 워커 생성 및 종료 관리

import mediasoup from "mediasoup"
import { logger } from "../utils/logger.js"
import config from "../config/env.js"

let worker = null

export async function initMediasoupWorker() {
  //
  logger("/mediasoup/mediasoup.service.js", `mediasoup 워커 생성중...`)
  
  if (worker) {
    return worker
  }

  worker = await mediasoup.createWorker({
    rtcMinPort: config.mediasoup.rtcMinPort,
    rtcMaxPort: config.mediasoup.rtcMaxPort,
  })

  worker.on("died", () => {
    logger("/mediasoup/mediasoup.service.js", `mediasoup 워커[${worker.pid}] 사망`)
    process.exit(1)
  })

  logger("/mediasoup/mediasoup.service.js", `mediasoup 워커 생성 완료. pid: [${worker.pid}]`)

  return worker
}

export function getMediasoupWorker() {
  if(!worker) {
    throw new Error("mediasoup worker is not iittialized")
  }

  return worker
}

export async function closeMediasoupWorker() {
  if(!worker) {
    return
  }

  worker.close()
  worker = null
}