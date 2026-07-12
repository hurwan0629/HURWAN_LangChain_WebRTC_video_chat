// 실제 p2pRequests 데이터를 관리하기 위한 파일. Repository라고 생각하면 될듯

import { createRequestId } from "../utils/crypto.js"
import config from "../config/env.js"
import { logger } from "../utils/logger.js"
import { comparePassword } from "../utils/hash.js"

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
  let requestId = createRequestId()

  while (p2pRequests.has(requestId)) {
    requestId = createRequestId()
  }

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

  logger("p2p/p2p.manager.js createP2PRequest", `p2pRequest created by user_id: ${userId}, nickname: ${nickname}`)

  return requestId
}

// 2. 다른 사용자가 p2p 연결 정보를 통해 참가 요청 (requestId)
export function joinP2PRequest(calleeSocketId, userId, requestId) {
  // requestId 존재하는지 확인해서 callee에 등록하고 true 반환
  const request = p2pRequests.get(requestId)

  // 없거나 동일인물이거나 문제 발생 시 false 반환
  // 없으면 return false
  if(!request) {
    return false
  }

  // 이미 userId가 점유되어있으면 반환
  if(request.callee.userId) {
    return false
  }

  // 이제 등록해주기 (등록하고 다른 이벤트에서 닉네임 받아주기)
  request.callee.userId = userId
  request.callee.socketId = calleeSocketId
  return true
}

/**
 * 방에 대해서 참여자가 입력한 비밀번호가 맞는지 확인하여
 * true 또는 false로 반환하는 명령어
 * @param {*} requestId 
 * @param {*} passwordInput 
 */
export async function checkRequestIdPasswordInput(requestId, passwordInput) {
  const request = p2pRequests.get(requestId)
  if(!request?.passwordHash) {
    // 존재하지 않으면 false 반환해주기
    return false
  }
  return await comparePassword(passwordInput, request.passwordHash)
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
  const request = p2pRequests.get(requestId)
  if(!request) {
    return null
  }

  if(request.caller.socketId === socketId) {
    return request.callee.socketId
  }
  else {
    return request.caller.socketId
  }
}

export function getHostNickname(requestId) {
  const request = p2pRequests.get(requestId)

  logger("/p2p/p2p.manager.js getHostNickname", `requestId: ${requestId}, request: ${request}`)

  if(request.caller.nickname) {
    return request.caller.nickname
  }
  return ""
}

// requestId 에 대한 호스트 주인 userId 뽑아주기
export function getRequestHostUserId(requestId) {
  const request = p2pRequests.get(requestId)
  return request?.caller.userId
}

// 비밀번호 설정해주기
export function setRequestPasswordHash(requestId, passwordHash) {
  const request = p2pRequests.get(requestId)
  request.passwordHash = passwordHash
}

/**
 * host socketId 설정해주는 함수
 */
export function setRequestHostSocketId(requestId, userId, hostSocketId) {
  const request = p2pRequests.get(requestId)
  logger("p2p/p2p.manager.js setRequestHostSocketId", `requestId: ${requestId}, request: ${request}`)
  logger("p2p/p2p.manager.js setRequestHostSocketId", `typeof caller.userId: ${typeof(request.caller.userId)}, typeof inputUserId: ${typeof(userId)}`)
  logger("p2p/p2p.manager.js setRequestHostSocketId", `caller.userId: ${request.caller.userId}, inputUserId: ${userId}`)
  if(request.caller.userId === userId) {
    logger("p2p/p2p.manager.js setRequestHostSocketId", `check`)
    request.caller.socketId = hostSocketId
    return true
  }
  return false
}

/**
 * requestId, userId, nickname 받아서 requestId의 callee와 userId 가 매칭되면 
 * nickname로 설정해주기
 * 참고로 현재 시간 [2026-07-11 20:51:21]
 */
export function setCalleeNickname(requestId, userId, nickname) {
  const request = p2pRequests.get(requestId)
  logger("p2p/p2p.manager.js setCalleeNickname", `typeof callee.userId: ${typeof(request.callee.userId)}, typeof inputUserId: ${typeof(userId)}`)
  logger("p2p/p2p.manager.js setCalleeNickname", `callee.userId: ${request.callee.userId}, inputUserId: ${userId}`)
  if(request.callee.userId === userId) {
    request.callee.nickname = nickname
    return true
  }
  return false
}

/**
 * [2026-07-12 09:09:03] 생성
 * userId에 대해서 connected 설정해준 뒤 
 * 모두 되어있으면 삭제해주기
 */
export function checkAndRemoveRequest(requestId, userId) {
  const request = p2pRequests.get(requestId)
  
  logger("p2p/p2p.manager.js checkAndRemoveRequest", `requestId: ${requestId}, request: ${request}`)

  // caller
  if(request.caller.userId === userId) {
    request.caller.connected = true 
  }
  else if (request.callee.userId === userId) {
    request.callee.connected = true 
  }

  if(request.callee.connected && request.caller.connected) {
    p2pRequests.delete(requestId)
    return true 
  }
  return false 
}