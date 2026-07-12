// room에 대한 service 계층

import * as GroupRoomManager from "../room/room.manager.js"
import { logger } from "../utils/logger.js"
import { createGroupRooomPlainPassword, hashPassword, comparePassword } from "../utils/hash.js"

/**
  * hostUserId, hostNickname 받아서
 * 만들어진 roomCode 반환
 * @param {*} param0 
 * @returns 
 */
export async function createAndSetHostPeer({ hostUserId, hostNickname}) {
  // 방 만들기
  const roomCode = await GroupRoomManager.createGroupRoom({ hostUserId })
  // 서버에 호스트 닉네임 및 id, role 정도만 설정해주기
  GroupRoomManager.initGroupRoomHost({ roomCode, hostUserId, hostNickname })

  return roomCode
}

/**
 * roomCode와 userId를 넣어서 userId가 roomCode의 방장이면 방장으로 등록하고
 * 비번 생성 및 반환 + 암호화(2026-07-12 11:19:33 기준 bcrypt) 저장해서 반환하기
 * 호스트 및 작업 성공 여부는 객체의 { ok: bool } 형태로 반환
 * 성공 시 { ok, plainPassword } 반환
 * @param {*} param0 
 */
export async function tryHostReady({ roomCode, userId, socketId }) {
  // 해당 userId가 호스트인지 확인하기
  const isHost = GroupRoomManager.checkIsHost({ roomCode, userId })

  // 호스트가 아니라면 ok: false 반환
  if(!isHost) {
    return { ok: false }
  }

  // 호스트 추가해주기
  const hostAddedResult = GroupRoomManager.addPeerToGroupRoom({ roomCode, userId, socketId })

  // bcrypt 랜덤으로 만들어거 등록 및 반환해주기
  const plainPassword = await createPasswordHashAndReturnPlain({ roomCode })

  logger("/room/room.service.js tryHostReady", 
    `isHost: ${isHost}, hostAddedResult: ${hostAddedResult}, plainPassword: ${!!plainPassword},`)
  return {
    ok: true,
    plainPassword
  }
}

/**
 * { roomCode, userId, socketId, nickname } 를 받아서 
 * 
 * 성공 여부 true/false를 반환하는 함수
 * @param {*} param0 
 * @returns 
 */
export function addPeerToGroupRoom({ roomCode, userId, socketId, nickname }) {
  const result = GroupRoomManager.addPeerToGroupRoom({ roomCode, userId, socketId, nickname })
  logger("/room/room.service.js addPeerToGroupRoom", `peer added: ${result}`)
  return result
}

/** [2026-07-12 11:38:54]
 * roomCode에 대해 랜덤 bcrypt 암호 생성 후 평문 비밀번호 반환해주는 로직
 * @param {*} param0 
 */
export async function createPasswordHashAndReturnPlain({ roomCode }) {
  const plainPassword = createGroupRooomPlainPassword()
  const passwordHash = await hashPassword(plainPassword)
  const setRoomPasswordHashResult = GroupRoomManager.setRoomPasswordHash({ roomCode, passwordHash }) 

  logger("/room/room.service.js createPasswordHashAndReturnPlain", 
    `plainPassword: ${!!plainPassword}, passwordHash: ${!!passwordHash}, setRoomPasswordHashResult: ${setRoomPasswordHashResult},`)

  return plainPassword
}
/**
  * roomCode 받고 거기에 대한 router의 rtpCapabilities 반환받음
 * 에러나면 null 반환
 * @param {*} param0 
 * @returns 
 */
export function getRtpCapabilitiesByRoomCode({ roomCode }){
  return GroupRoomManager.getRtpCapabilitiesByRoomCode({ roomCode })
}

/** [2026-07-12 12:44:25]
 * roomCode -> router객체 (검수 없음)
 * @param {*} param0 
 * @returns 
 */
export function getRouterByRoomCode({ roomCode}) {
  return GroupRoomManager.getRouterByRoomCode({ roomCode })
}

/**
 * roomCode 에 존재하는 userId에 대한 peer에 sendTransrpot 에 transport 추가해주기
 * 결과 여부 true/false 반환
 * @param {*} param0 
 */
export function setPeerSendTransport({ roomCode, userId, transport }) {
  return GroupRoomManager.setPeerSendTransport({ roomCode, userId, transport })
}

/** [2026-07-12 14:19:26]
 * roomCode 에 존재하는 userId에 대한 peer에 recvTransport 에 transport 추가해주기
 * 결과 여부 true/false 반환
 * @param {*} param0 
 */
export function setPeerRecvTransport({ roomCode, userId, transport }) {
  return GroupRoomManager.setPeerRecvTransport({ roomCode, userId, transport })
}


/**[2026-07-12 13:53:37]
 *  roomCode.peer[userId].sendTransport.connect({dtlsParameters})
 * 
 *  => true/false
 * @param {*} param0 
 * @returns 
 */
export async function connectUserSendTransport({ roomCode, userId, dtlsParameters }) {
  return await GroupRoomManager.connectUserSendTransport({ roomCode, userId, dtlsParameters })
}


/**[2026-07-12 14:25:53]
 *  roomCode.peer[userId].recvTransport.connect({dtlsParameters})
 * 
 *  => true/false
 * @param {*} param0 
 * @returns 
 */
export async function connectUserRecvTransport({ roomCode, userId, dtlsParameters }) {
  return await GroupRoomManager.connectUserRecvTransport({ roomCode, userId, dtlsParameters })
}


/**[2026-07-12 13:58:10]
 * 입력 값: { roomCode, userId, kind, rtpParamters, appData }
 * 
 * 동작: produce 생성 후 사용자의 produce에 넣어주기 
 *     kind에 따라 video/audio/screen 에 넣어줌. 다른건 없음
 * 
 * 반환 값: producer.id 또는 null
 * @param {*} param0 
 * @returns 
 */
export async function setUserSendTransportProduce({ roomCode, userId, kind, rtpParameters, appData }) {
  return await GroupRoomManager.setUserSendTransportProduce({ roomCode, userId, kind, rtpParameters, appData })
}

/** [2026-07-12 14:34:27]
 *  roomCode[userId]의 consumers에 모든 사용자의 producer.id: Consumer 넣어주기
 * @param {*} param0 
 */
export async function consumeAllProducersByRoomCodeAndUserId({ roomCode, userId, rtpCapabilities }) {
  return GroupRoomManager.consumeAllProducersByRoomCodeAndUserId({ roomCode, userId, rtpCapabilities })
}

export async function resumeConsumer({ roomCode, userId, consumerId }) {
  return await GroupRoomManager.resumeConsumer({ roomCode, userId, consumerId })
}

// 2026-07-12 15:56:20
export async function checkRoomAndPasswordInput({ roomCode, passwordInput, userId, socketId, nickname }) {
  const passwordResult = await GroupRoomManager.checkPasswordByRoomCodeAndPasswordInput({ roomCode, passwordInput })

  if(!passwordResult) {
    logger("/room/room.service.js checkRoomAndPasswordInput", 
      `passwordResult: false, userId: ${userId}, passwordInput: ${passwordInput}`)
    return false
  }
  else {
    const addResult = await GroupRoomManager.addPeerToGroupRoom({ roomCode, userId, socketId, nickname })
    logger("/room/room.service.js checkRoomAndPasswordInput", 
      `passwordResult: true, userId: ${userId}, roomCode: ${roomCode}, socketId: ${socketId}`)
    return addResult && passwordResult
  }
}

export async function consumeProducerById({ roomCode, userId, producerId, rtpCapabilities }) {
  return await GroupRoomManager.consumeProducerById({ roomCode, userId, producerId, rtpCapabilities });
}