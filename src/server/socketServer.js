// 소켓서버를 생성하여 이벤트를 넣어주는 파일

import { Server } from "socket.io"
import config from "../config/env.js"
import { socketCorsOptions } from "../config/cors.js"
import { logger } from "../utils/logger.js"
import registSocketEvent from "../socket/index.js"


// [2026-07-10 08:23:35]에 생성
/**
 * 서버에 이벤트 등과 같은 소켓io 서버를 붙여주는 함수
 * express 어플리케이션과 다른 서버이기 때문에 cors, csrf, credentials 설정 등을 여기에서 따로 설정해준다.
 * @param {http.Server} httpServer 
 */
export default function registSocketServer(httpServer) {

  // 소켓 서버 만들어주기
  const io = new Server(httpServer, {
    cors: socketCorsOptions
  })

  logger("/server/socketServer.js", "소켓 서버가 생성되었습니다.")

  // 소켓에 이벤트 넣어주기
  registSocketEvent(io)
  logger("/server/socketServer.js", "소켓 이벤트들의 등록이 완료되었습니다.")

  return io
}