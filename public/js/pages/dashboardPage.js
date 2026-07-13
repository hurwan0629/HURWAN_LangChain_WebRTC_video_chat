console.log("[loaded] dashboardPage.js")

// 대시보드에서 반드시 작업 해주는 스크립트 작업해주기
import { loadMe } from "/js/authClient.js"
import { apiFetch } from "../api/apiFetch.js"

// 미리 dashboard.html의 요소를 가져와놓기
const title = document.getElementById("title")
const userEmail = document.getElementById("user-email")
const userProfileImage = document.getElementById("user-profile-img")

// 알람용 ul 태그
const alarmLogList = document.getElementById("alarm-log")

// 버튼들
const createPrivateButton = document.getElementById("create-private")
const joinPrivateButton = document.getElementById("join-private")
const createGroupButton = document.getElementById("create-group")
const joinGroupButton = document.getElementById("join-group")
const logoutButton = document.getElementById("logout")

// 모든 작업 수행해주기
init()

// 빠르게 흐름 파악하기 쉽게 만든 함수.
async function init() {
  const user = await loadMe()
  if(!user) {
    alert("로그인이 필요한 페이지입니다.")
    window.location.href = "/index.html"
  }

  // 상태 가져왔으면 user-info 채워주기
  title.innerText = `어서오세요! ${user?.name}님!`
  userEmail.innerText = `이메일: ${user?.email ?? "등록되지 않음"}`
  userProfileImage.setAttribute("src", user?.profile_image_link)

  // 등록한 이후 index로 가지 않았으면 socket연결 해주기. (조작되어도 서버에서 검수함)
  const socket = io({
    withCredentials: true, // 연결 시 accessToken 필요 (모든 소켓 통신은 accessTokenCheck 소켓 미들웨어를 통함)
    autoConnect: false // 정확한 흐름을 위해 명시적 연겷해주기 (이벤트 걸어놓고 시작)
  })
  // socket은 쓸일이 잇을 수 있으니 남겨두고 인자로 넣어서 등록 및 연결해주기
  await connectSocket(socket)

  // // // // // // 버튼 누를 시 이벤트들 정의해주기 // // // // // // 
  // 개인 방 생성 후 p2p.html?requestId=[] 으로 이동시켜주기
  createPrivateButton.onclick = async () => {
    console.log("createPrivateButton clicked")

    const nickname = prompt("사용할 닉네임을 입력해주세요!")

    console.log(nickname)
    // 개인 방 생성시켜주기
    const response = await socket.emitWithAck("p2p:create", nickname)

    if(!response.ok) {
      alert("방 생성에 실패했습니다!")
      return
    }
    console.log(response.requestId)
    alert(`방이 생성되었습니다! 코드: ${response.requestId}`)
    window.location.href = `/p2p.html?requestId=${response.requestId}`
  }

  joinPrivateButton.onclick = () => {
    console.log("joinPrivateButton clicked")
    const requestId = prompt("참여할 p2p방의 코드를 입력해주세요")
    window.location.href = `/p2p.html?requestId=${requestId}`
  }

  // 그룹 방 생성해주기 -> 서버에서 만들엇다고 하면 그쪽으로 이동해주기
  createGroupButton.onclick = async () => {
    console.log("createGroupButton clicked")
    // 방장의 닉네임 먼저 정하기
    const hostNickname = prompt("사용할 닉네임을 입력해주세요!")

    // 서버에 자신을 방장으로 서버 제작 요청
    const createRoomResult = await socket.emitWithAck("group:create", { hostNickname })

    if(!createRoomResult.ok) {
      alert("방 생성에 실패하였습니다!")
      console.log(createRoomResult.error)
      return
    }

    else {
      alert(`방이 생성되었습니다! 코드: [${createRoomResult.roomCode}]`)
      window.location.href = `/room.html?roomCode=${createRoomResult.roomCode}`
    }
  }
  joinGroupButton.onclick = () => {
    console.log("joinGroupButton clicked")
    const roomCode = prompt("참여할 그룹 방의 코드를 입력해주세요")
    window.location.href = `/room.html?roomCode=${roomCode}`
  }

  logoutButton.onclick = async () => {
    await apiFetch("/auth/logout", {
      method: "POST"
    })

    window.location.href = "/index.html"
  }
}

/**
 * - on("connect") console.log 등록
 * 
 * - on("invite:received") 등록
 * 
 * - socket.connect() 실행
 * @param {*} socket 
 */
async function connectSocket(socket) {
  // 개발 로그용 소켓 확인
  socket.on("connect", () => {
    console.log("socket connected", socket.id)
  })

  // 알람 받는 이벤트 등록 
  // [2026-07-11 12:51:58] 기준 일단 구체적인 기능은 초대 기능 만든 이후 같이 개발할 예정
  socket.on("invite:received", (payload) => {
    console.log("invite received", payload)
    alarmLogList.innerHTML += `<li>${JSON.stringify(payload)}</li>`
  })


  // 이벤트 모두 등록한 후 socket 연결해주기
  socket.connect()
}

