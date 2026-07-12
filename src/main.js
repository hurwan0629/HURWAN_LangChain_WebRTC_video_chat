// 최초로 실행하는 파일. express, httpserver, socketio 연결해서 서버 시작

import httpServer from "./server/httpServer.js"
import config from "./config/env.js"
import { logger } from "./utils/logger.js"
import { initMediasoupWorker } from "./mediasoup/worker.js"

await initMediasoupWorker()

console.log(config)

httpServer.listen(config.host.port, config.host.ip, () => {
  logger("main.js", `서버가 구동되었습니다. ${config.host.ip}:${config.host.port}`)
  // console.log(config)
})