// 모든 소켓 요청에 대해서 이벤트를 한번에 등록하기. (나중에 봤을 때 한번에 보기 편하고 수정도 편하게)

import { logger } from "../utils/logger.js"

// [2026-07-10 08:51:49] [생성] 소켓 서버를 받아서 이벤트를 등록해주기 (라우팅 느낌)
export default function registSocketEvent(io) {
  io.on("connection", (socket) => {
    logger("socket/index.js", `새 소켓 connection 발생. socketId: ${socket.id}`)



    socket.on("disconnect", () => {
      logger("socket/index.js", `소켓 disconnect 발생. socketId: ${socket.id}`)
    })
  })
}