// [2026-07-11 13:12:09] 이제 소켓/mediasoup 개발 해야하는데 추적이 어려워서 만든 개발용 라우터

import { Router } from "express"
import { onlineUsers } from "../presence/presence.manager.js";
import { p2pRequests } from "../p2p/p2p.manager.js";
import { rooms } from "../room/room.manager.js";

// onlineUsers = new Map()
// presence = {
//   user: {
//     id: user.id,
//     name: user.name,
//     email: user.email
//   },
//   sockets: new Set(),
//   status: userConst.status.online,
// } 
// onlineUsers[userId] = presence

const router = Router()

router.get("/onlineUsers", (req, res) => { 
  const response = Array.from(onlineUsers.entries()).map(([userId, presence]) => ({
    userId,
    user: presence.user,
    status: presence.status,
    currentRoomCode: presence.currentRoomCode ?? null,
    socketsCount: presence.sockets.size,
    sockets: Array.from(presence.sockets)
  }))

  return res.status(200).json({ 
    usersCount: response.length,
    socketsCount: response.reduce((sum, user) => sum + user.socketsCount, 0),
    onlineUsers: response
  })
})

router.get("/p2pRequests", (req, res) => {
  const response = Array.from(p2pRequests.entries()).map(([requestId, request]) => ({
    requestId,
    passwordHash: request.passwordHash,
    caller: request.caller,
    callee: request.callee,
    createdAt: request.createdAt,
    expiresAt: request.expiresAt,
    timer: !!request.timerId ? "exists" : "not exists"
  }))
  return res.status(200).json({
    requestCount: response.length,
    requests: response
  })
})

router.get("/rooms", (req, res) => {
  const response = Array.from(rooms.entries()).map(([roomCode, room]) => ({
    roomCode,
    routerExists: !!room.router,
    passwordHash: room.passwordHash,
    status: room.status,
    hostUserId: room.hostUserId,
    peers: Array.from(room.peers.entries()).map(([userId, peer]) => ({
      userId,
      nickname: peer.nickname,
      role: peer.role,
      socketIds: Array.from(peer.socketIds ?? []),
      sendTransportId: peer.sendTransport?.id ?? null,
      recvTransportId: peer.recvTransport?.id ?? null,
      producers: {
        video: peer.producers?.video?.id ?? null,
        audio: peer.producers?.audio?.id ?? null,
        screen: peer.producers?.screen?.id ?? null,
      },
      consumers: Array.from(peer.consumers?.keys?.() ?? []),
      joinedAt: peer.joinedAt,
    })),
    graceTimers: room.graceTimers.size,
    createdAt: room.createdAt
  }))
  return res.status(200).json({
    roomCount: response.length,
    rooms: response
  })
})

export default router