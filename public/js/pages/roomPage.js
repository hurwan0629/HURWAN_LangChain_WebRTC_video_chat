import { loadMe } from "../authClient.js";
// commonjs를 module 방식으로 사용할 수 있게 해주는 esm cdn
import { Device } from "https://esm.sh/mediasoup-client@3";

const params = new URLSearchParams(window.location.search)

const roomCode = params.get("roomCode")
const localDevice = new Device();

// 방장일 경우 자동으로 넣어지는 비밀번호 변수
let roomPlainPasword;


// 스크립트에서 사용할 DOM 요소
const passwordDiv = document.getElementById("show-room-password")
const remoteContainer = document.getElementById("remote-container")
const localVideo = document.getElementById("local-video")
const groupLeaveButton = document.getElementById("group-leave")

init()


async function init() {
  const user = await loadMe()

  if(!user) {
    alert("로그인이 필요한 페이지입니다.")
    window.location.href = "/index.html"
  }

  const socket = io({
    withCredentials: true,
  })

  // [2026-07-12 20:00:23] 
  // 어짜피 해당 이벤트는 만들기 위해서 recvTransport같은 다른 객체 준비가 
  // 필요 없기 때문에 그냥 바로 등록해주기
  socket.on("group:peer-left", ({ userId }) => {
    document
      .querySelectorAll(`[data-producer-user-id="${userId}"]`)
      .forEach((video) => video.closest(".remote-user-container")?.remove())
  })

  // [2026-07-12 20:38:27]
  // 서버에서 group:leave - isHost 분기 추가 후 생성
  socket.on("group:room-closed", () => {
    alert("방장이 나가 회의가 종료되었습니다.")
    
    // [2026-07-12 20:43:53] 원래 타임아웃 없었는데 너무 빨리 나가지는 경우 있어서 잠깐 지연줌
    setTimeout(() => {
      window.location.href = "/dashboard.html"
    }, 500)
  })

  groupLeaveButton.onclick = async () => {
    await socket.emitWithAck("group:leave", { roomCode })
    window.location.href = "/dashboard.html"
  }


  // 내가 호스트인지 확인하기
  const hostInfo = await socket.emitWithAck("group:host-ready", { roomCode })
  if(hostInfo.ok) {
    roomPlainPasword = hostInfo.plainPassword
    console.log(`(호스트) 방의 코드: [${roomCode}] | 비밀번호: [${roomPlainPasword}]`)
    passwordDiv.innerText += `(호스트) 방의 코드: [${roomCode}] | 비밀번호: [${roomPlainPasword}]`
    // alert(`(호스트) 방의 코드: [${roomCode}] | 비밀번호: [${roomPlainPasword}]`)

    await hostBranch(socket)
  }
  else {
    await candidateBranch(socket)
  }
}


async function hostBranch(socket) {
  await readyDevice(socket)
}

async function candidateBranch(socket) {
  // 참여자의 경우에는 비밀번호 입력 요구 한번 하기
  const nickname = prompt("상대에게 보여질 닉네임을 입력하세요!")
  const passwordInput = prompt("비밀번호를 입력하세요!")

  const joinResult = await socket.emitWithAck("group:join", {
    roomCode, passwordInput, nickname
  })
  // console.log("if(joinResult.ok) {")
  if(joinResult.ok) {
    alert("방 참여 성공!")
  }
  else {
    alert("방 참여 실패....")
    window.location.href="/dashboard.html"
  }

  try{
    // alert(1)
    await readyDevice(socket)
  }
  catch( error ) {
    alert(error.message)
  }
}

async function readyDevice(socket, device=localDevice) {
  if(!socket?.connected) {
    throw Error("[readyDevice] socket not connected")
  }

  alert(`2 socket.connected=${socket.connected}, id=${socket.id}`)

  const rtpCapabilitiesResult = await socket.emitWithAck("group:get-router-rtp-capabilities", { roomCode })

  // alert(3)
  if(!rtpCapabilitiesResult.ok) {
    alert("존재하지 않는 방입니다.")
    window.location.href="dashboard.html"
  }
  else {
    await device.load({ 
      routerRtpCapabilities: rtpCapabilitiesResult.rtpCapabilities 
    })
  }
  
  alert("미디어 준비 시작")

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  })

  setLocalVideoSrc(stream)

  // 자신의 스트림이 준비되었다면 보낼 준비 하기
  const sendTransportResult = await socket.emitWithAck("group:create-send-transport", { roomCode })

  // 서버에 송신용 sendTransport 생성
  if(!sendTransportResult.ok) {
    alert("송신 작업 준비에 실패하였습니다!")
  }
  else{
    const sendTransport = device.createSendTransport(
      sendTransportResult.clientOptions
    )
  
    // sendTransport에 대해서 connect와 produce 이벤트 등록해주기
    registSendTransportEvent(sendTransport, socket)
  
    // 이제 sendTransport 에 미디어들 등록해주기
    for (const track of stream.getTracks()) {
      // [2026-07-12 13:41:53]
      // 이때 위에서 등록한 produce 이벤트 -> 서버에 group:produce 실행해서
      // Transport.produce() 로 받아주게 하기
      const producer = await sendTransport.produce({ track });

      console.log("producer", {
        id: producer.id,
        kind: producer.kind,
        paused: producer.paused,
        trackMuted: producer.track.muted,
        trackReadyState: producer.track.readyState,
      });
    }
  }

  // [2026-07-12 14:13:23]
  // 자기꺼 등록 완료했으면 상대방꺼 consume 할 준비 해주기
  const recvTransportResult = await socket.emitWithAck("group:create-recv-transport", { roomCode })

  if(!recvTransportResult.ok) {
    alert("수신 작업 준비에 실패하였습니다!")
  }
  else {
    const recvTransport = device.createRecvTransport(recvTransportResult.clientOptions)
    
    // [2026-07-12 14:29:00]
    // 여기에서는 producer에 대응되는 이벤트는 없고 그냥 connect만 해주고 
    // 따로 consume 하는 방식으로 진행된ㅁ
    registRecvTransportEvent(recvTransport, socket)

    // 먼저 new-producer 에 대한 이벤트 넣어주고 get-producers 받아와주기
    const consumerOptionsResult = await socket.emitWithAck("group:consume-all-producers", {
       roomCode, rtpCapabilities: device.rtpCapabilities
    })
    if(!consumerOptionsResult.ok) {
      alert("생산자 정보를 가져오지 못했습니다!")
    }
    else {
      for (const consumerOptions of consumerOptionsResult.consumers) {
        const consumer = await recvTransport.consume({
          id: consumerOptions.id,
          producerId: consumerOptions.producerId,
          kind: consumerOptions.kind,
          rtpParameters: consumerOptions.rtpParameters
        })
        consumer.track.onmute = () => {
          console.log("consumer track muted", consumer.id);
        };

        consumer.track.onunmute = () => {
          console.log("consumer track unmuted", consumer.id);
        };
        
        const result = await socket.emitWithAck("group:consumer-resume", {
          roomCode, consumerId: consumer.id,
        });


        console.log({
          id: consumer.id,
          kind: consumer.kind,
          trackReadyState: consumer.track.readyState,
          trackMuted: consumer.track.muted,
        });
        const stream = new MediaStream([consumer.track])
        if(consumer.kind === "video") {
          appendRemoteVideo({
            stream,
            consumerId: consumer.id,
            producerUserId: consumerOptions.producerUserId,
            mediaTag: consumerOptions.mediaTag,
            nickname: consumerOptions?.nickname
          });
        }


        if(result.ok) {
          // alert(`${consumer.id} consumer 성공! mediaTag: ${consumerOptions.mediaTag}`)
        }
        else {
          alert(`${consumer.id} consumer 실패... mediaTag: ${consumerOptions.mediaTag}`)
        }
      }

    }
    
  }

}

/**[2026-07-12 13:35:03]
 * connect: 미리 서버에 설정해둔 transport로 연결
 * produce: track를 등록할 때 일어나는 이벤트 등록
 * @param {*} sendTransport 
 */
function registSendTransportEvent(sendTransport, socket) {
  sendTransport.on("connectionstatechange", (state) => {
    console.log("sendTransport state", state);
  });

  // (mediasoup Clinet가 emit하는거임. 서버가 하는거 아님 [2026-07-12 13:44:39])
  sendTransport.on("connect", async ({ dtlsParameters }, callback, errback ) => {
    try{
      const result = await socket.emitWithAck("group:connect-send-transport", {
        roomCode,
        dtlsParameters
      })

      if(!result.ok) {
        throw new Error(result.message);
      }
      callback()
    } catch(error) {
      errback(error)
    }
  })

  // [2026-07-12 13:34:59]
  // 자신이 주는 이벤트 (mediasoup Clinet가 emit하는거임. 서버가 하는거 아님 [2026-07-12 13:44:39])
  sendTransport.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
    try {
      const result = await socket.emitWithAck("group:produce", {
        roomCode, kind, rtpParameters, appData,
      })

      if(!result.ok) {
        throw new Error(result.message)
      }

      callback({
        id: result.producerId
      })
    } catch(error) {
      errback(error)
    }
  })
}


// [2026-07-12 14:23:40]
// 클라이언트의 수신용 통신창에 이벤트들 등록해주기
function registRecvTransportEvent(recvTransport, socket) {
  // 가장먼저 중간에 다른 접속자가 들어올 시에 이를 받아주는 이벤트 걸어주기
  socket.on("group:new-producer", async ({ producerId, producerUserId, kind, mediaTag }) => {
    console.log("new producer", { producerId, producerUserId, kind, mediaTag });

    // 소켓과 
    await consumeOneProducer({
      socket,
      recvTransport,
      producerId,
      producerUserId,
      mediaTag,
    });
  });


  recvTransport.on("connectionstatechange", (state) => {
    console.log("recvTransport state", state);
  });


  recvTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
    try{
      const recvTransportResult = await socket.emitWithAck("group:connect-recv-transport", { roomCode, dtlsParameters })

      if(!recvTransportResult.ok) {
        throw new Error(recvTransportResult.message)
      }

      callback()
    } catch(error) {
      errback(error)
    }
  })
}

 function setLocalVideoSrc(stream) {
    localVideo.autoplay = true;
    localVideo.muted = true;
    localVideo.playsInline = true;
    localVideo.srcObject = stream;
    localVideo.dataset.type = "local";
  }
  
function appendRemoteVideo({ stream, consumerId, producerUserId, mediaTag, nickname="remoteUser" }) {
    console.log("appendRemoteVideo")
    const video = document.createElement("video");
    const userName = document.createElement("h6")
    const remoteUserContainer = document.createElement("div")
    userName.innerText = nickname
    remoteUserContainer.setAttribute("class", "remote-user-container")
    
    remoteUserContainer.appendChild(video)
    remoteUserContainer.appendChild(userName)
    remoteContainer.appendChild(remoteUserContainer)
    
    video.autoplay = true
    video.srcObject = stream
    video.dataset.consumerId = consumerId
    video.dataset.producerUserId = producerUserId
    video.dataset.mediaTag = mediaTag
    video.playsInline = true
    video.play().catch(console.error)
    

  return video;
}


async function consumeOneProducer({ socket, recvTransport, producerId, producerUserId, mediaTag }) {
  // 서버로 해당 
  const result = await socket.emitWithAck("group:consume", {
    roomCode,
    producerId,
    rtpCapabilities: localDevice.rtpCapabilities,
  });

  if (!result.ok) {
    console.error("consume failed", result)
    return;
  }

  const consumerOptions = result.consumer;

  // 서버로부터 해당 데이터 받겠다고 하기
  const consumer = await recvTransport.consume({
    id: consumerOptions.id,
    producerId: consumerOptions.producerId,
    kind: consumerOptions.kind,
    rtpParameters: consumerOptions.rtpParameters,
  });

  // 트랙이 초기에는 paused로 오지만 이후 group:consumer-resume를 통해 풀릴 예정
  consumer.track.onunmute = () => {
    console.log("consumer track unmuted", consumer.id)
  };

  const resumeResult = await socket.emitWithAck("group:consumer-resume", {
    roomCode,
    consumerId: consumer.id,
  });

  if (!resumeResult.ok) {
    console.error("consumer resume failed", resumeResult)
    return;
  }

  if (consumer.kind === "video") {
    const stream = new MediaStream([consumer.track])

    appendRemoteVideo({
      stream,
      consumerId: consumer.id,
      producerUserId,
      mediaTag,
      nickname: consumerOptions?.nickname
    });
  }
}