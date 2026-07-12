// 페이지 url: /p2p.html?requestId=ABC123&role=[caller | callee]

import { loadMe } from "../authClient.js"

const params = new URLSearchParams(window.location.search)

const requestId = params.get("requestId")

// 호스트라면 전역으로 저장할 비밀번호 저장하기
// callee라면 영원히 undefined
let plainPassword;

// document의 요소들 가져오는 부분
const showPasswordButton = document.getElementById("show-room-password")
const localVideo = document.getElementById("local-video")
const remoteVideo = document.getElementById("remote-video")
const remoteUserNickname = document.getElementById("remote-nickname")
const localUSerNickname = document.getElementById("local-nickname")


// RTCPeerConnection용 인자들
let localStream = null
let remoteStream = null

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302"}
  ]
}


init()

// 흐름 정리해보기

// 현재 페이지에서 연결 다시 해주기
async function init() {

  

  const user = await loadMe()
  
  const socket = io({
    withCredentials: true, // 연결 시 accessToken 필요 (모든 소켓 통신은 accessTokenCheck 소켓 미들웨어를 통함)
  })

  // P2P request에 connect 전까지 작업하기
  await connectToP2PRoom(socket)

  // 사용할 수 있는 

  // caller로써 작업 

}

async function connectToP2PRoom(socket) {
  // 호스트라면 서버로부터 제공하는 password 제공받기
  // 여기에서 role=caller 뿐만 아니라 토큰의 userId 자체가 p2pRequest의 userId와 동일해야함
  // 여기에서 호스트라면 방에 들어가짐
  const passwordResult = await socket.emitWithAck("p2p:host-ready", requestId)

  
  console.log("passwordResult:", passwordResult)
  // 호스트라면 ok: true로 응답이 옴
  if(passwordResult.ok) {
    localUSerNickname.innerText = passwordResult.nickname
    plainPassword = passwordResult.password
    alert(`해당 방의 비밀번호는 [${passwordResult.password}] 입니다.`)

    showPasswordButton.hidden = false
    showPasswordButton.onclick = () => {
      alert(`방의 코드: ${requestId} | 비밀번호: ${passwordResult.password}`)
    }

    // 미리 connection 준비 등록시켜놓고 바로 socket.on("p2p:callee-ready") 등록을 위해 
    // await는 .on() 안에서 걸어주기
    const callerPeerConnectionAsync = prepareRTCPeerConnection(socket)

    // caller라면 방 준비하고 callee의 응답 준비하기
    socket.on("p2p:callee-ready", async ({ requestId, callee={ nickname: "참여자" }}) => {
      remoteUserNickname.innerText = callee.nickname
      const callerPeerConnection = await callerPeerConnectionAsync
      // media 준비 후 offer 시작
      const offer = await callerPeerConnection.createOffer()
      await callerPeerConnection.setLocalDescription(offer)

      socket.emit("p2p:offer", { requestId, offer })
    })

    socket.on("p2p:answer", async ({ answer }) => {
      const callerPeerConnection = await callerPeerConnectionAsync
      await callerPeerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      )
    })
    
    return true
  }
  // 위에서 들어가지 못했다면 방에 들어가있는지 확인하고 들어가주기
  // callee 인 경우로 판단
  else {
    console.log(passwordResult.message)
    const passwordInput = prompt("비밀번호를 입력하세요")
    const joinResult = await socket.emitWithAck("p2p:join", { requestId, passwordInput })
    // join 되었으면 닉네임 설정해주기
    if(joinResult.ok) {

      // callee라면 callee의 socket 이벤트를 활성화해주기
      socket.on("p2p:wait-offer", ({ requestId, caller={ nickname: "호스트" } }) => {
        // 상대 닉네임 설정해주기
        console.log(`hostNickname = ${caller.nickname}`)
        console.log(`caller: ${JSON.stringify(caller)}`)
        remoteUserNickname.innerText = caller.nickname
      })

      const nickname = prompt("사용할 닉네임을 설정해주세요")
      const calleeNicknameResult = await socket.emitWithAck("p2p:callee-nickname", { requestId, nickname })
      if(calleeNicknameResult.ok) {
        localUSerNickname.innerText = calleeNicknameResult.nickname
        alert(`닉네임 설정 성공! [${calleeNicknameResult.nickname}]`)
      }
      

      // 이제 caller의 offer 기다리기
      const calleePeerConnectionAsync = prepareRTCPeerConnection(socket)
      socket.on("p2p:offer", async ({ offer }) => {
        const calleePeerConnection = await calleePeerConnectionAsync
        
        await calleePeerConnection.setRemoteDescription(
          new RTCSessionDescription(offer)
        )

        const answer = await calleePeerConnection.createAnswer()
        await calleePeerConnection.setLocalDescription(answer)

        socket.emit("p2p:answer", {
          requestId, answer
        })
      })

      // 이제 RTCPeerConnection 기다리면서 서버에게 알려주기 전에 RTCPeerConnection 준비하기

      
      return true
    }
    else {
      alert("방이 존재하지 않거나 올바르지 않은 비밀번호입니다!")
      window.location.href = "/dashboard.html"
      return false
    }
  }
}

// 완료 된 후 양쪽 caller/callee 에서 해야할 RTCPeerConnection 생성 작업을
// 공통으로 사용하기 위해 함수 생성 
// [2026-07-11 23:49:41] 기준 스파게티코드가 되었는데 마지막 자존심으로 함수 만들었다..  
/**
 *  socket를 넣어주면 사용자의 미디어를 탐색해서 RTCPeerConnection에 produce로 등록해주고
 * 상대에게서 받을 경우 추가해주는,
 * 주소 후보 자동 등록 및 서버에 요청 해주는 RTCPeerConnection객체 반환
 * 이때 [p2p:(on)offer(ed)]과 [p2p:(on)answer(ed)]은 caller/callee 가 각각 알아서 걸어주어야함
 */
async function prepareRTCPeerConnection(socket) {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  })

  localVideo.srcObject = localStream
  localVideo.muted = true

  remoteStream = new MediaStream()
  
  remoteVideo.srcObject = remoteStream

  const peerConnection = new RTCPeerConnection(rtcConfig)

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream)
  })

  // 연결되기 전부터 일단 외부 track 들어오는 것에 대해서 event.stream은 보통 
  // 의도적으로 쪼개거나 2개의 스트림이 오는 경우를 제외하고 대체로 1개이기 때문에 [0]
  // [0]만 뽑아주기 -> 트랙들 뽑아서 remoteStream에 넣어주기
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track)
    })
  }

  socket.on("p2p:ice-candidate", async ({ candidate }) => {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
  })

  // stun서버에서 reflection 주소 부호 나오면 emit 해주기
  peerConnection.onicecandidate = (event) => {
    // ice 서버 (2026-07-11 23:53:15 기준 구글 stun 서버)에서 ice 이벤트 터졌는데
    // 후보 목록이 없으면 반환해주기
    if(!event.candidate) {
      return
    }

    socket.emit("p2p:ice-candidate", {
      requestId,
      candidate: event.candidate,
    })
  }

  // connected 되면 서버에 알림줄 것을 예약해놓기
  // 이벤트 이름도 진짜 기괴하게 길다 ㅋㅋ
  peerConnection.onconnectionstatechange = () => {
    if(peerConnection.connectionState === "connected") {
      socket.emit("p2p:connected", { requestId })
    }
  }

  return peerConnection
}


// 1. dashboard에서 사용자가 방 생성
//  -> 서버가 방 requestId 및 password 생성
// 2. p2p페이지로 사용자 이동
// 3. socket 다시 연결 후 caller에 자신의 socketId 등록 
// 4. caller가 자신의 nickname를 입력하고 방 코드와 비밀번호 받기
// 5. callee가 방 코드 및 비번 입력하고 들어와서 닉네임 입력하기
// 6. caller가 join 확인 후 offer 시작