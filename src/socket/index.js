import { logger } from "../utils/logger.js"
import { socketAccessTokenCheck } from "./socket.auth.js"
import config from "../config/env.js"
import * as OnlineUsersManager from "../presence/presence.manager.js"
import { registerP2PSocket } from "../p2p/p2p.socket.js"
import { registerMediasoupSocket } from "../mediasoup/mediasoup.socket.js"

// devTest/ 를 통한 확인을 위해 sockets 객체 설정 및 export
export const sockets = {}

export default function registSocketEvent(io) {
  // io 연결은 무조건 로그인 된 상태에서 작업 해주기
  // 미들웨어 형태는 (socket, next) => {}
  io.use(socketAccessTokenCheck)

  io.on("connection", (socket) => {
    const user = socket.data.user

    // 사용자 onlineUsers에 넣어주기
    const presence = OnlineUsersManager.addUserSocket(user, socket.id)

    // sockets[socket.id] = {
    //   socket,
    //   id: socket?.id,
    //   user: {
    //     id: user?.id,
    //     name: user?.name,
    //     email: user?.email
    //   }
    // }

    logger(
      "socket/index.js",
      `socket connected. socketId: ${socket.id}, userId: ${user?.id}, name: ${user?.name}, connectionSocketsCount: ${presence?.sockets?.size}`
    )

    // 사용자 p2p 이벤트 걸어주기
    registerP2PSocket(io, socket)

    // mediasoup 소켓 이벤트 걸어주기 (그룹통화 관리용 이벤트)
    registerMediasoupSocket(io, socket)

    socket.on("disconnect", (reason) => {
      const leftSocketCount = OnlineUsersManager.removeUserSocket(socket.id)
      logger(
        "socket/index.js",
        `socket disconnected. socketId: ${socket.id}, userId: ${user?.id}, reason: ${reason}, leftSocketCount: ${leftSocketCount}`
      )
      // 소켓 삭제
      // delete sockets[socket.id]
    })
  })
}
