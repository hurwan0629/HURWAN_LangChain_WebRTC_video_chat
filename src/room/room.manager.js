// 사용자가 접속중인 router(room)에 대한 서버 메모리 관리자 파일

import { getMediasoupWorker } from "../mediasoup/worker.js"
import { createRoomCode } from "../utils/crypto.js"
import { mediaCodecs } from "../config/mediasoup.js"
import { roomConst } from "../constants/roomStatus.js"
import { logger } from "../utils/logger.js"
import { comparePassword } from "../utils/hash.js"

// rooms = Map<roomCode, {
//   roomId: int, // db에 넣을 용도, [2026-07-12 10:28:52] 에는 없이 함
//   roomCode: string,
//   router: mediasoup.worker.Router | null
//   passwordHash: string,
//   status: "waiting" | "active" | "closed",
//   hostUserId: users.id,
//   peers: Map<userId, {
// 	  socketIds: Set<Socket.id>,
// 	  nickname: 사용자 입력,
// 	  sendTransport: producer에 쓰이는 transport | null,
// 	  recvTransport: consumer에 쓰이는 transport | null,
// 	  producers: {
// 		  video: Producer | null,
// 		  audio: Producer | null,
// 		  screen: Producer | null
// 	  },
// 	  consumers: Map<Consumer.id: Consumer>,
// 	  role: "host" | "participant",
// 	  joinedAt: Date
//   }>,
//   graceTimers: Map<userId, timerId>: 나간 사용자에대한 setTimeout,
//   createdAt: Date
// }>
export const rooms = new Map()

/**
 * 방 생성 및 hostNickname 등록 
 * roomCode 반환
 * @param {*} param0 
 * @returns 
 */
export async function createGroupRoom({ hostUserId }) {
  let room
  try {
    // 사용하는 유일([2026-07-12 10:27:23]기준) 워커 가져와주기
    const worker = getMediasoupWorker()
    
    // 해당 방 코드를 통해 방 생성해주기
    const router = await worker.createRouter({ mediaCodecs })
    
    // 방 코드 생성해주기
    let roomCode = createRoomCode()
    while(rooms.has(roomCode)) {
      roomCode = createRoomCode()
    }
    
    // rooms에 추가해주기
    room =  {
      // roomId: int, // db에 넣을 용도, [2026-07-12 10:28:52] 에는 없이 함
      roomCode,
      router,
      passwordHash: null,
      status: roomConst.status.waiting,
      hostUserId: hostUserId,
      peers: new Map(),
      graceTimers: new Map(),
      createdAt: Date()
    }

    logger("/room/room.manager.js createGroupRoom", 
          `room created: roomCode: ${roomCode}, hostId: ${hostUserId}`)

      rooms.set(roomCode, room)

      return roomCode
  } catch (error) {
    logger("/room/room.managers.js initGroupRoomHost",
      `error occuered: ${error.message}, roomCode: ${roomCode}, room: ${!!room}`)
    return null
  }
}

export function initGroupRoomHost({ roomCode, hostUserId, hostNickname }) {
  let room
  try {
    room = rooms.get(roomCode)
  
    logger("/room/room.manager.js initGroupRoomHost", 
      `roomCode: ${roomCode}, room: ${room}, hostId: ${hostUserId}, hostNickname: ${hostNickname}`)
  
    // 이후에 호스트가 닉네임 설정 들어가서 안하기 때문에 미리 설정해놓기
    // [2026-07-12 10:41:46] 안써도 되나 싶지만 일단 쓰기
    const hostPeer = {
      nickname: hostNickname,
      role: roomConst.role.host
    }
  
    room.peers.set(hostUserId, hostPeer)
  } catch (error) {
    logger("/room/room.managers.js initGroupRoomHost",
      `error occuered: ${error.message}, roomCode: ${roomCode}, room: ${!!room}`
    )
    return false
  }
}

export function addPeerToGroupRoom({ roomCode, userId, socketId, nickname }) {
  let room
  try {

    room = rooms.get(roomCode)
    
    let role = roomConst.role.participant
    // role의 경우에는 hostId와 대조해서 설정하기
    if(room.hostUserId === userId) {
      role = roomConst.role.host
    }
  
    const peer = {
      socketIds: new Set(), // 밑에서 추가함
      nickname: nickname ?? room.peers.get(userId)?.nickname, // 이미 존재하면 그걸로 하기
      sendTransport: null,
      recvTransport: null,
      producers: {
        video: null,
        audio: null,
        screen: null,
      },
      consumers: new Map(),
      role,
      joinedAt: new Date()
    }
  
    peer.socketIds.add(socketId)
  
    room.peers.set(userId, peer)
    logger("/room/room.managers.js addPeerToGroupRoom",
      `peer added. roomCode: ${roomCode} | userId: ${userId}, socketId: ${socketId}, nickname: ${nickname}`)
    return true
  } catch (error) {
    logger("/room/room.managers.js addPeerToGroupRoom",
      `error occuered: ${error.message}, roomCode: ${roomCode}, room: ${!!room}`
    )
    return false
  }
}

/**
 * 객체의 userId가 roomCode의 host가 맞는지 true/false로 반환
 * @param {*} param0 
 * @returns 
 */
export function checkIsHost({ roomCode, userId }) {
  let room
  try {
    room = rooms.get(roomCode)
    
    logger("/room/room.managers.js checkIsHost",
      `isHost: ${room.hostUserId === userId}`)

    if(room.hostUserId === userId) {
      return true
    }
    return false
  } catch(error) {
    logger("/room/room.managers.js checkIsHost",
      `error occuered: ${error.message}, roomCode: ${roomCode}, room: ${!!room}`)
    return false
  }
}

export function setRoomPasswordHash({ roomCode, passwordHash }) {
  let room
  try {
    room = rooms.get(roomCode) 

    // 비번 저장해주기
    room.passwordHash = passwordHash
    return true
  } catch(error) {
    logger("/room/room.managers.js setRoomPasswordHash",
      `roomCode does not exists: ${error.message}, roomCode: ${roomCode}, room: ${!!room}`)
    return false
  }
}

/**
 * roomCode 받고 거기에 대한 router의 rtpCapabilities 반환받음
 * 에러나면 null 반환
 * @param {*} param0 
 * @returns 
 */
export function getRtpCapabilitiesByRoomCode({ roomCode }) {
  let room
  let router
  try {
    room = rooms.get(roomCode) 

    router = room.router

    logger("/room/room.managers.js setRoomPasswordHash",
      `!!router.rtpCapabilities: ${!!router.rtpCapabilities}`)
    return router.rtpCapabilities

  } catch (error) {
    logger("/room/room.managers.js setRoomPasswordHash",
      `room or router not exists: ${error.message}, roomCode: ${roomCode}, room: ${!!room}, router: ${!!router}`)
    return null
  }
}

/**[2026-07-12 12:43:59]
 * roomCode -> router 객체 검수 없음
 * @param {*} param0 
 * @returns 
 */
export function getRouterByRoomCode({ roomCode }) {
  return rooms.get(roomCode)?.router
}

export function setPeerSendTransport({ roomCode, userId, transport }) {
  let room
  let peer
  try {
    room = rooms.get(roomCode)
  
    peer = room.peers.get(userId)

    peer.sendTransport = transport

    logger("/room/room.managers.js setPeerSendTransport",
      `sendTransrpot 생성 완료. userId: ${userId}`)

    return true
  } catch (error) {
    logger("/room/room.managers.js setPeerSendTransport",
      `room or router not exists: ${error.message}, roomCode: ${roomCode}, room: ${!!room}, userId: ${userId}, peer: ${peer}`)
    return false
  }
}

// [2026-07-12 14:20:33]
export function setPeerRecvTransport({ roomCode, userId, transport }) {
  let room
  let peer
  try {
    room = rooms.get(roomCode)
  
    peer = room.peers.get(userId)

    peer.recvTransport = transport

    logger("/room/room.managers.js setPeerRecvTransport",
      `sendTransrpot 생성 완료. userId: ${userId}`)

    return true
  } catch (error) {
    logger("/room/room.managers.js setPeerRecvTransport",
      `room or router not exists: ${error.message}, roomCode: ${roomCode}, room: ${!!room}, userId: ${userId}, peer: ${peer}`)
    return false
  }
}



// [2026-07-12 13:51:09]
export async function connectUserSendTransport({ roomCode, userId, dtlsParameters }) {
  let room
  let peer
  try {
    room = rooms.get(roomCode)

    peer = room.peers.get(userId)

    const sendTransport = peer.sendTransport

    await sendTransport.connect({ dtlsParameters })
    logger("/room/room.managers.js connectUserSendTransport",
      `sendTransrpot 연결 완료. userId: ${userId}`)
    return true
  } catch (error) {
    logger("/room/room.managers.js connectUserSendTransport",
      `room or router not exists: ${error.message}, roomCode: ${roomCode}, room: ${!!room}, userId: ${userId}, peer: ${peer}`)
    return false
  }
}


// [2026-07-12 14:26:11]
export async function connectUserRecvTransport({ roomCode, userId, dtlsParameters }) {
  let room
  let peer
  try {
    room = rooms.get(roomCode)

    peer = room.peers.get(userId)

    const recvTransport = peer.recvTransport

    await recvTransport.connect({ dtlsParameters })
    logger("/room/room.managers.js connectUserRecvTransport",
      `sendTransrpot 연결 완료. userId: ${userId}`)
    return true
  } catch (error) {
    logger("/room/room.managers.js connectUserRecvTransport",
      `room or router not exists: ${error.message}, roomCode: ${roomCode}, room: ${!!room}, userId: ${userId}, peer: ${peer}`)
    return false
  }
}

// [2026-07-12 13:59:00]
/**
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
  let room
  let peer
  let sendTransport
  
  try {
    room = rooms.get(roomCode) 

    peer = room.peers.get(userId)

    sendTransport = peer.sendTransport


    const producer = await sendTransport.produce({
      kind, rtpParameters, appData
    })


    if(kind === "video") {
      peer.producers.video = producer
    }
    if(kind === "audio") {
      peer.producers.audio = producer
    }
    if(kind === "screen") {
      peer.producers.screen = producer
    }

    logger("/room/room.managers.js setUserSendTransportProduce",
      `producer created. userId: ${userId}, producerId: ${producer.id}, transportId: ${sendTransport.id}`)

    return producer.id
  } catch (error) {
    logger("/room/room.managers.js setUserSendTransportProduce",
      `room or router not exists: ${error.message}, roomCode: ${roomCode}, room: ${!!room}, userId: ${userId}, peer: ${peer}`)
    return null
  }
}

/**
 * roomCode의 userId에 다른 user들의 producer을 consumers에 producer.id:consumer
 * 형태로 저장 후 
 * 
 * consumerOptionsList: List<{
*        id: consumer.id,
*        producerId: producer.id,
*        kind: consumer.kind,
*        rtpParameters: consumer.rtpParameters,
*        producerUserId: peerId,
*        mediaTag,
*      }>
*      반환
 * @param {*} param0 
 * @returns 
 */
export async function consumeAllProducersByRoomCodeAndUserId({ roomCode, userId, rtpCapabilities }) {
  let consumerOptionsList = []
  let room
  let recvPeer
  let recvTransport
  let router
  try {
     room = rooms.get(roomCode)

     recvPeer = room.peers.get(userId)

     recvTransport = recvPeer.recvTransport

     router = room.router

    // 다른 사용자의 모든 producerId를 받아와서 consume 생성 후 넣어주기
    for(const [peerId, peer] of room.peers) {
      // 자기꺼는 패스
      if(peerId === userId) {
        continue
      }
      for(const [mediaTag, producer] of Object.entries(peer.producers)) {
        if(!producer) {
          continue
        }
        if(!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
          continue
        }
        const consumer = await recvTransport.consume({
          producerId: producer.id,
          rtpCapabilities,
          paused: true
        })
        recvPeer.consumers.set(consumer.id, consumer)

        consumerOptionsList.push({
          id: consumer.id,
          producerId: producer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          producerUserId: peerId,
          mediaTag,
          nickname: peer?.nickname
        });
      }

    }
    logger("/room/room.managers.js consumeAllProducersByRoomCodeAndUserId",
`roomCode: ${roomCode}, room: ${!!room}, 
userId: ${userId}, peer: ${recvPeer}, consumerOptionsList.length: ${consumerOptionsList.length}
recvTransport.id: ${recvTransport.id}`)

    return consumerOptionsList
  } catch(error) {
    logger("/room/room.managers.js consumeAllProducersByRoomCodeAndUserId",
      `\n   error.message: ${error.message}, roomCode: ${roomCode}, room: ${!!room}, 
        userId: ${userId}, peer: ${recvPeer}, consumerOptionsList.length: ${consumerOptionsList.length}
        recvTransport.id: ${recvTransport.id}`)
    return null
  }
}

export async function resumeConsumer({ roomCode, userId, consumerId }) {
  try {
    const room = rooms.get(roomCode)

    const peer = room.peers.get(userId)

    const consumer = peer.consumers.get(consumerId)

    await consumer.resume()

    logger("/room/room.managers.js resumeConsumer",
      `consumer: ${consumer.id} resumed`)
    return true 
  } catch(error) {
    logger("/room/room.managers.js resumeConsumer",
      `\n   error.message: ${error.message}`)
    return false
  } 
}

export async function checkPasswordByRoomCodeAndPasswordInput({ roomCode, passwordInput }) {
  let room
  try {
    room = rooms.get(roomCode)

    const passwordHash = room.passwordHash

    return await comparePassword(passwordInput, passwordHash)
  } catch(error) {
    console.log(error)
    return false
  }
}

// 2026-07-12 19:09:07
// producerId 하나를 통해 consume를 하는 함수
// 새로운 참여자가 발생하였을 때 사용되는 함수
export async function consumeProducerById({ roomCode, userId, producerId, rtpCapabilities }) {
  const room = rooms.get(roomCode);
  if (!room) {
    return null
  }

  const recvPeer = room.peers.get(userId);
  if (!recvPeer?.recvTransport) {
    return null
  }

  const producerInfo = findProducerById({ room, producerId });
  if (!producerInfo) {
    return null
  }

  if (!room.router.canConsume({ producerId, rtpCapabilities })) {
    return null
  }

  const consumer = await recvPeer.recvTransport.consume({
    producerId,
    rtpCapabilities,
    paused: true,
  });

  recvPeer.consumers.set(consumer.id, consumer);

  return {
    id: consumer.id,
    producerId,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
    producerUserId: producerInfo.userId,
    mediaTag: producerInfo.mediaTag,
    nickname: producerInfo?.nickname
  }
}

// room(router)에 존재하는 producerId를 통해 해당 producer 정보 가져오기
function findProducerById({ room, producerId }) {
  for (const [userId, peer] of room.peers) {
    for (const [mediaTag, producer] of Object.entries(peer.producers)) {
      if (producer?.id === producerId) {
        return {
          userId,
          mediaTag,
          producer,
          nickname: peer?.nickname
        }
      }
    }
  }
  // 없으면 null 반환
  return null;
}

// [2026-07-12 19:41:46]
export function removeUser({ roomCode, userId }) {
  let room
  let leavingPeer
  try {
    room = rooms.get(roomCode)

    if(!room){
      return false
    }
    
    leavingPeer = room.peers.get(userId)

    if (!leavingPeer) {
      return false
    }

    // 해당 사용자의 producerId 뽑아주기
    const videoProducerId = leavingPeer.producers.video?.id
    const audioProducerId = leavingPeer.producers.audio?.id
    const screenProducerId = leavingPeer.producers.screen?.id

    const leavingProducerIds = new Set([
      videoProducerId,
      audioProducerId,
      screenProducerId
    ].filter(Boolean))

    // 모든 사용자 순회하며 consumer.producerId가 맞는것을 순회
    for(const [peerId, peer] of room.peers) {
      if(peerId === userId) {
        continue
      }

      for (const [consumerId, consumer] of peer.consumers) {
        if (leavingProducerIds.has(consumer.producerId)) {
          consumer.close();
          peer.consumers.delete(consumerId)
        }
      }
    }
    return true
  } catch (error) {
    console.log(error)
    return false
  }
}

// [2026-07-12 19:46:00]
// 위에 removeUser을 통해 userId 제외한 모든 곳 정리해주고
// 이번에는 사용자의 메모리 정리해주기
export function closeUser({ roomCode, userId }) {
  let room
  let peer

  try {
    room = rooms.get(roomCode)
    if(!room) {
      return false
    }
    // 사용자 가져오기
    peer = room.peers.get(userId)

    if (!peer) {
      return false
    }
    // 안에있는 모든 연결들 정리하기
    // consumer
    for (const consumer of peer.consumers.values()) {
      consumer.close()
    }
    peer.consumers.clear() // Map 정리
    // producer
    for (const producer of Object.values(peer.producers)) {
      producer?.close()
    }
    // 닫힌 producers 없애주기 (지우기)
    peer.producers.video = null
    peer.producers.audio = null
    peer.producers.screen = null
    
    // sendTransport
    peer.sendTransport?.close()
    // recvTransport
    peer.recvTransport?.close()

    // 최종적으로 영원히 삭제해주기
    room.peers.delete(userId)

    return true
  } catch(error) {
    console.log(error)
    return false
  }
}

// [2026-07-12 20:30:14]
// 방장이 나가는 경우에 방을 아예 완전히 없애버리는 함수
export function closeRoom({ roomCode }) {
  try {
    const room = rooms.get(roomCode)
    if (!room) {
      return false
    }
  
    // 모든 사용자에 대해서 순회하면서 그냥 닥치는데로 닫아주기
    for (const [userId, peer] of room.peers) {
      // consumer
      for (const consumer of peer.consumers.values()) {
        consumer.close()
      }
      peer.consumers.clear()
  
      // producer
      for (const producer of Object.values(peer.producers ?? {})) {
        producer?.close()
      }
  
      // sendTransport
      peer.sendTransport?.close()
      // recvTransport
      peer.recvTransport?.close()
    }
  
    // [2026-07-12 20:31:31] 기준 구현하진 않았지만
    // 방장이 나갔을 때 타임아웃 걸거고
    // 이후 업데이트 하게 된다면 일반 사용자에게도 할 여지가 있음
    for (const timerId of room.graceTimers.values()) {
      clearTimeout(timerId)
    }
  
    // 라우터 닫고 아예 메모리에서 삭제해주기
    room.router?.close()
    rooms.delete(roomCode)
  
    return true
  } catch(error) {
    console.log(error)
  }
}