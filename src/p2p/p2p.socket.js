// P2P 시그널링 offer/answer/iceCandidate전달 설정

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
      ack({
        ok: false,
        message: "P2P request create failed",
      })
    }
  })

  // 2. 다른 사용자가 p2p 연결 정보를 통해 참가 요청 (requestId)
  socket.on("p2p:join", ({ requestId }) => {
    // A. p2p.manager에서 해당 방이 있는지 찾아주기 (없으면 그대로 빠꾸)

    // B. 있으면 일단 동일인물은 아닌지 확인해주기

    // C. p2pRequest.calleeUserId에 추가해주기

    // D. p2pRequest.callerUserId에게 p2p:callee-joined 보내기

    // E. callee에게 p2p:joined 전송해주기
  })

  // // // // // // // // [signalling 작업 (ice-candidate 작업)] // // // // // // // //
  // 1. 한쪽에서 먼저 offer 요청하기
  socket.on("p2p:offer", ({requestId, offer}) => {
    // 자신이 아닌 socketId(userId)로 emit("p2p:offer" , offer) 보내기
  })

  // 2. 다른 쪽에서 answer 응답 보내주는거 확인해주기
  socket.on("p2p:answer", ({ requestId, answer }) => {
    // 자신이 아닌 socketId(userId)로 .to(user:{userId}).emit("p2p.answer")같은거 해주기
  })

  socket.on("p2p:ice-candidate", ({ requestId, candidate }) => {
    // 자신이 아닌 socketId로 candidate 보내기
  })

  // 양쪽에서 잘 연결되었다 하면 없애주기
  socket.on("p2p:connected", ({ requestId }) => {

  })


}