// 실제 p2pRequests 데이터를 관리하기 위한 파일. Repository라고 생각하면 될듯

import { createRequestId } from "../utils/crypto.js"
import config from "../config/env.js"
import { logger } from "../utils/logger.js"

// p2pRequests = Map<requestId, {
//   requestId: 요청의 고유한 id, 
//   callerSocketId: {
//     userId: 요청을 시작한(offer한) users.id, 
//     connected: boolean,
//     socket
//   },
//   calleeSocketId: {
//     userId: answer할 users.id, 
//     connected: boolean,
//     socket
//   },
//   createdAt: Date,
//   expiresAt: Date,
//   timerId: setTimeout() 반환값
// }>
export const p2pRequests = new Map()

/** 1. 한 사용자가 p2p 연결 정보를 생성을 요청 
 * Map<requestId, {
 *   requestId: 요청의 고유한 id, 
 *   caller: {
 *     userId: 요청을 시작한(offer한) users.id, 
 *     connected: boolean,
 *     socketId
 *   },
 *   callee: {
 *     userId: answer할 users.id, 
 *     connected: boolean,
 *     socketId
 *   },
 *   createdAt: Date,
 *   expiresAt: Date,
 *   timerId: setTimeout() 반환값
 * }>
 * 생성 후 callee 없이. timerId에도 setTimeout env.js -> config p2p.timeout 어쩌고 이런 느낌으로 추가해주고
 * requestId roomCode와 동일한 방식으로 고유하게 생성해서 반환해주기
*/ 
export function createP2PRequest(userId, nickname) {
  let requestId

  do {
    requestId = createRequestId()
  } while (p2pRequests.has(requestId));

  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + config.p2p.p2pRequestTimeoutMs)

  const timerId = setTimeout(() => {
    p2pRequests.delete(requestId)
  }, config.p2p.p2pRequestTimeoutMs)

  const request = {
    requestId, 

    caller: {
      userId: userId, 
      nickname: nickname,
      connected: false,
      socketId: null
    },
    callee: {
      userId: undefined, 
      nickname: undefined,
      connected: undefined,
      socketId: undefined
    },
    createdAt,
    expiresAt,
    timerId
  }

  p2pRequests.set(requestId, request)

  logger("p2p/p2p.manager.js createP2PRequest", `p2pRequest created by user_id\d-${userId}, nickname: ${nickname}`)

  return requestId
}

// 2. 다른 사용자가 p2p 연결 정보를 통해 참가 요청 (requestId)
export function joinP2PRequest(calleeSocketId, userId, requestId) {
  // requestId 존재하는지 확인해서 callee에 등록하고 true 반환
  // 없거나 동일인물이거나 문제 발생 시 false 반환
}

// 양쪽에서 잘 연결되었다 하면 없애주기
export function handleP2PConnected(socketId, requestId) {
  // requestId로 찾아주기
  // caller/callee 중에 알맞은 socketId 있는지 확인 (없으면 false)
  // socketId에 대해서 connected = true로 설정해준 뒤 
  // 모두 connected이면 삭제 후 true 반환
}

// 상대 객체 받아오기
export function getOtherPeer(socketId, requestId) {

}