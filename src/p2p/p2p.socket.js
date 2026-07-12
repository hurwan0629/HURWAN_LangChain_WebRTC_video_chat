// P2P 시그널링 offer/answer/iceCandidate전달 설정

import { createP2PPlainPassword, hashPassword } from "../utils/hash.js"
import { logger } from "../utils/logger.js"
import * as P2PManager from "./p2p.manager.js"

/**
 * p2p를 하기 위한 이벤트들 모두 묶어놓기
 */
export function registerP2PSocket(io, socket) {

  // 1. 한 사용자가 p2p 연결 정보를 생성을 요청 
  socket.on("p2p:create", (nickname, callback) => {
    try{
      // A. p2pRequest에 생성 및 N분 뒤 자동 만료되게 설정하기 
      const requestId = P2PManager.createP2PRequest(socket.data.user.id, nickname)

      // B. 요청을 한 socket으로 `p2p:created` 응답하기
      callback({
        ok: true,
        requestId
      })
    } catch (err) {
      callback({
        ok: false,
        message: "P2P request create failed",
      })
    }
  })

  socket.on("p2p:host-ready", async (requestId, callback) => {
    try {
      // 받은 요청에 대해서 호스트가 맞는지 먼저 확인하기
      const userId = socket.data.user.id
  
      // requestId에 대해서 호스트 주인 가져오기
      const isHost = P2PManager.getRequestHostUserId(requestId) === userId
      logger("p2p/p2p.socket.js p2p:host-ready", `source userId: ${userId}, isHost: ${isHost}`)

      // 호스트가 맞으면 비밀번호 만들어서 해싱 저장 + 평문 반환
      // 추가로 소켓 등록해주기
      if(isHost) {
        const setHostSocketIdResult = P2PManager.setRequestHostSocketId(requestId, userId, socket.id)

        if(!setHostSocketIdResult) {
          callback({
            ok: false,
            message: "not host"
          })
          return 
        }
        const plainPassword = createP2PPlainPassword()
  
        const hashedPassword = await hashPassword(plainPassword)
  
        const setPasswordResult = P2PManager.setRequestPasswordHash(requestId, hashedPassword)

        const hostNickname = P2PManager.getHostNickname(requestId)
  
        // 반환해주기
        callback({
          ok: true,
          password: plainPassword,
          nickname: hostNickname
        })
        return
      }
      callback({
        ok: false,
        message: "not host"
      })
    } catch(err) {
      callback({
        ok: false,
        message: err.message
      })
    }
  })

  // 2. 다른 사용자가 p2p 연결 정보를 통해 참가 요청 (requestId)
  /**
   * callee가 방에 들어가기위해 사용하는 이벤트
   */
  socket.on("p2p:join", async ({ requestId, passwordInput }, callback) => {
    const userId = socket.data.user.id
    logger("/p2p/p2p.socket.js p2p:join", `requestId: ${requestId}, passwordInput: ${passwordInput}`)
    try {
      // 비밀번호 잘 입력했는지 확인하기
      const passwordResult = await P2PManager.checkRequestIdPasswordInput(requestId, passwordInput)
      logger("/p2p/p2p.socket.js p2p:join", `passwordResult: ${passwordResult}`)
      if(!passwordResult) {
        callback({
          ok: false,
          message: "room not exists or password invalid"
        })
        return
      }
      // A. p2p.manager에서 해당 방에 넣어주기 찾아주기 (없으면 그대로 빠꾸)
      const calleeJoinResult = P2PManager.joinP2PRequest(socket.id, userId, requestId)
      if(calleeJoinResult) {
        callback({
          ok: true
        })
        return
      }
      callback({
        ok: false
      })
    } catch(err) {
      logger("/p2p/p2p.socket.js registerP2PSocket", `error ${err.message}`)
      callback({
        ok: false
      })
    }
  })

  socket.on("p2p:callee-nickname", ({requestId, nickname}, callback) => {
    // 닉네임 설정해주기
    const userId = socket.data.user.id
    
    // 그냥 userId/닉네임/requestId 넣으면 알아서 매니저가 검증해줄것임
    logger("/p2p/p2p.coekt.js callee-nickname", `requestId: ${requestId}, userId: ${userId}, nickname: ${nickname}`)
    const calleeNicknameResult = P2PManager.setCalleeNickname(requestId, userId, nickname)

    if(calleeNicknameResult) {

      // callee의 nickname이 설정되는 시점에 연결 작업이 완료된다 판단
      // 양쪽 socket.id에 caller:"p2p:callee-ready"와 callee:"p2p:wait-offer" 작업을 실행
      io.to(P2PManager.getOtherPeer(socket.id, requestId))
          .emit("p2p:callee-ready", {
        requestId,
        callee: {
          nickname // caller에게 보내는 이벤트
        }
      })

      // host nickname
      const hostNickname = P2PManager.getHostNickname(requestId)

      socket.emit("p2p:wait-offer", {
        requestId,
        caller: {
           nickname: hostNickname// callee 자신에게 보내는 이벤트
        }
      })
      
      callback({
        ok: true,
        nickname: nickname
      })
      return
    }
    else{
      callback({
        ok: false
      })
    }
  }) 

  // // // // // // // // [signalling 작업 (ice-candidate 작업)] // // // // // // // //
  // 1. 한쪽에서 먼저 offer 요청하기
  socket.on("p2p:offer", ({requestId, offer}) => {
    // 자신이 아닌 socketId(userId)로 emit("p2p:offer" , offer) 보내기
    io.to(P2PManager.getOtherPeer(socket.id, requestId))
          .emit("p2p:offer", { offer })
  })

  // 2. 다른 쪽에서 answer 응답 보내주는거 확인해주기
  socket.on("p2p:answer", ({ requestId, answer }) => {
    // 자신이 아닌 socketId(userId)로 .to(user:{userId}).emit("p2p.answer")같은거 해주기
    io.to(P2PManager.getOtherPeer(socket.id, requestId))
          .emit("p2p:answer", { answer })
  })

  socket.on("p2p:ice-candidate", ({ requestId, candidate }) => {
    // 자신이 아닌 socketId로 candidate 보내기
    io.to(P2PManager.getOtherPeer(socket.id, requestId))
          .emit("p2p:ice-candidate", { candidate })
  })

  // 양쪽에서 잘 연결되었다 하면 없애주기
  // 만약에 한쪽만 되었으면 유지
  socket.on("p2p:connected", ({ requestId }) => {
    const userId = socket.data.user.id

    const checkAndRemoveRequestResult = P2PManager.checkAndRemoveRequest(requestId, userId)
    logger("/p2p/p2p.socket.js p2p:connected", `requestId: ${requestId} deleted: ${checkAndRemoveRequestResult}`)

  })


}