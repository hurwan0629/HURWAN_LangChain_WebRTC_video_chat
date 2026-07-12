// mediasoup 다중 화상통화 이벤트 처리. transport, connect, produce, consume 설정

import * as GroupRoomService from "../room/room.service.js"
import * as MediasoupService from "./mediasoup.service.js"
import { logger } from "../utils/logger.js"

export function registerMediasoupSocket(io, socket) {
  // 그룹 생성 흐름:
  // 1. host가 dashboard에서 group:create 요청 넣음
  socket.on("group:create", async ({ hostNickname }, callback) => {
    try {
      const hostUserId = socket.data.user.id

      logger("/mediasoup/mediasoup.socket.js group:create", 
        `room create request: hostId: ${hostUserId}, hostNickname: ${hostNickname}`)

      const roomCode = await GroupRoomService.createAndSetHostPeer({ hostUserId, hostNickname })

      logger("/mediasoup/mediasoup.socket.js group:create", 
        `room created: hostId: ${hostUserId}, roomCode: ${roomCode}`)

      callback({
        ok: true,
        roomCode
      })
    } catch(error) {
      logger("/mediasoup/mediasoup.socket.js group:create", `error occur ${error.message}`)
      callback({
        ok: false,
        error: error.message
      })
    }
  })
  // 2. 서버에서 create 한 뒤 응답 해주면 host가 group?roomCode=??? 로 이동
  // 3. 사용자가 group?roomCode 로 이동하면 일단 userId를 검사해서 호스트인지 확인
  //    - 호스트면 방 코드와 비밀번호 생성 및 제공(+암호화)해주면서 바로 연결 흐름으로 가주기
  //    - 참여자면 방이 존재할 시 비밀번호 입력을 요구하고 맞으면 연결 흐름으로 가기
  socket.on("group:host-ready", async ({ roomCode }, callback ) => {
    const userId = socket.data.user.id
    try {

      const { ok, plainPassword } = await GroupRoomService.tryHostReady({ roomCode, userId, socketId: socket.id })
      // 호스트가 아니면 
      if(!ok) {
        callback({
          ok: false,
          message: "not host"
        })
        return 
      }
      socket.join(roomCode)
      
      // 호스트면 plainPassword 보내주기
      callback({
        ok: true,
        plainPassword
      })
    } catch (error) {
      callback({
        ok: false,
        message: "room not exists"
      })
    }

  })

  // 4. [연결 흐름]
  // 4. 미디어 트랙 준비해두고 서버와 맞는지 확인하기
  socket.on("group:get-router-rtp-capabilities", ({ roomCode }, callback) => {
    try {

      // [2026-07-12 12:21:16] roomCode로부터 rtpCapabilities 반환해주기
      const rtpCapabilities = GroupRoomService.getRtpCapabilitiesByRoomCode({ roomCode })
  
      if(!rtpCapabilities) {
        callback({
          ok: false
        })
        return
      }
      else{
        callback({
          ok: true,
          rtpCapabilities
        })
      }
    } catch {
      callback({
        ok: false
      })
    }
  })
  // 5. send transport 준비하기
  socket.on("group:create-send-transport", async ({ roomCode }, callback) => {
    try {
      const userId = socket.data.user.id
      // room 가져오기
      const router = GroupRoomService.getRouterByRoomCode({ roomCode })
      // mediasoup service에 transport 하나 만들어서 producer로 뽑아달라고 요청하기
      const { transport, clientOptions } = await MediasoupService.initTransport({ router, socket })
      // room service에 사용자에 producer 추가해달라고 요청하기
      const setTransportResult = GroupRoomService.setPeerSendTransport({ roomCode, userId, transport })
  
      if(!setTransportResult) {
        callback({
          ok: false,
          message: "group:create-send-transport failed"
        })
      }
      else {
        callback({
          ok: true,
          clientOptions
        })
      }
    } catch(error) {
      callback({
        ok: false
      })
    }
  })
  // 6. 새로운 사용자에 대해서 recv transport받아주는 이벤트 추가해주기
  // [2026-07-12 13:47:01]
  socket.on("group:connect-send-transport", async ({ roomCode, dtlsParameters }, callback) => {
    try {
      const userId = socket.data.user.id
      // 기존에 userId 사용자 + roomCode 에 대해서 존재하는 사용자의 
      // sendTransport를 producer로 설정해서 연결해주기
      const result = await GroupRoomService.connectUserSendTransport({ roomCode, userId, dtlsParameters })
  
      if(!result) {
        callback({
          ok: false,
          message: "send-transport connection failed"
        })
        return 
      }
      callback({
        ok: true
      })
    } catch(error) {
      callback({
        ok: false
      })
    }
  })

  // [2026-07-12 13:55:17]
  // sendTransport 로 producer 만들어주는 함수
  socket.on("group:produce", async ({ roomCode, kind, rtpParameters, appData }, callback) => {
    try {
      const userId = socket.data.user.id
  
      const produceResult = await GroupRoomService.setUserSendTransportProduce({ roomCode, userId, kind, rtpParameters, appData })
      // 문제가 생겨 null이라면
      if(!produceResult) {
        callback({
          ok: false,
          message: "produce failed"
        })
        return 
      }

      
      callback({
        ok: true,
        producerId: produceResult
      })
      
      socket.to(roomCode).emit("group:new-producer", {
        producerId: produceResult,
        producerUserId: userId,
        kind,
        mediaTag: appData?.mediaTag ?? kind,
      });
    } catch (error) {
      callback({
        ok: false
      })
    }

  })


  // consume도 위와 동일하게 작업해주기
  socket.on("group:create-recv-transport", async ({ roomCode }, callback) => {
    try {
      const userId = socket.data.user.id
      // room 가져오기
      const router = GroupRoomService.getRouterByRoomCode({ roomCode })
      // mediasoup service에 transport 하나 만들어서 producer로 뽑아달라고 요청하기
      const { transport, clientOptions } = await MediasoupService.initTransport({ router, socket })
      // room service에 사용자에 producer 추가해달라고 요청하기
      const setTransportResult = GroupRoomService.setPeerRecvTransport({ roomCode, userId, transport })
  
      if(!setTransportResult) {
        callback({
          ok: false,
          message: "group:create-recv-transport failed"
        })
      }
      else {
        callback({
          ok: true,
          clientOptions
        })
      }
    } catch(error) {
      callback({
        ok: false
      })
    }
  })

  socket.on("group:connect-recv-transport", async ({ roomCode, dtlsParameters }, callback) => {
    try {
      const userId = socket.data.user.id
      // 기존에 userId 사용자 + roomCode 에 대해서 존재하는 사용자의 
      // sendTransport를 producer로 설정해서 연결해주기
      const result = await GroupRoomService.connectUserRecvTransport({ roomCode, userId, dtlsParameters })
  
      if(!result) {
        callback({
          ok: false,
          message: "recv-transport connection failed"
        })
        return 
      }
      callback({
        ok: true
      })
    } catch(error) {
      callback({
        ok: false
      })
    }
  })

  // [2026-07-12 14:30:25]
  // 사용자가 consumer transport 등록 후 사용자들에 대한 producer을 가져와서
  // 자신의 consumer 리스트에 넣어달라는 작업
  socket.on("group:consume-all-producers", async ({ roomCode , rtpCapabilities}, callback) => {
    try {
      const userId = socket.data.user.id
  
      const consumerOptionsList = await GroupRoomService.consumeAllProducersByRoomCodeAndUserId({ roomCode, userId, rtpCapabilities })
  
      if(consumerOptionsList) {
        callback({
          ok: true,
          consumers: consumerOptionsList
        })
        return
      }
      callback({
        ok: false
      })
    } catch(error) {
      console.log(error)
      callback({
        ok: false
      })
    }
  })

  socket.on("group:consumer-resume", async ({ roomCode, consumerId }, callback) => {
    logger("/mediasoup/group:consumer-resume", `roomCode: ${roomCode}, consumerId: ${consumerId}`)
    try {
      const userId = socket.data.user.id
      // 해당 
      const result = await GroupRoomService.resumeConsumer({ roomCode, userId, consumerId })
      callback({
        ok: result
      })
    } catch(error){
      console.log(error)
      callback({
        ok: false
      })
    }
  })

  // [2026-07-12 15:50:10] 외부 참여자가 참여
  socket.on("group:join", async ({ roomCode, passwordInput, nickname }, callback) => {
    try {
      const userId = socket.data.user.id
      const result = await GroupRoomService.checkRoomAndPasswordInput({ roomCode, passwordInput, userId, socketId: socket.id, nickname })

      if(result) {
        socket.join(roomCode)
        callback({
          ok: true
        })
        return
      }
      callback({
        ok: false
      })

    } catch(error){
      console.log(error)
      callback({
        ok: false
      })
    }
  })

  socket.on("group:consume", async ({ roomCode, producerId, rtpCapabilities }, callback) => {
    try {
      const userId = socket.data.user.id;

      const consumerOptions = await GroupRoomService.consumeProducerById({
        roomCode,
        userId,
        producerId,
        rtpCapabilities,
      });

      if (!consumerOptions) {
        callback({
          ok: false,
          message: "consume failed",
        });
        return;
      }

      callback({
        ok: true,
        consumer: consumerOptions,
      });
    } catch (error) {
      callback({
        ok: false,
        message: error.message,
      });
    }
  });  
  

  // 8. socket.disconnect 와 group:leave를 나눠서 disconnect 할 시에는 N초 타임아웃 걸어주기
  // 9. 방장이 group:leave 하거나 타임아웃 되면 방 삭제 및 정리하기
}