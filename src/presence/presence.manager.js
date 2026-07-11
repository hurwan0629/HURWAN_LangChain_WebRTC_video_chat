// 현재 접속중인 사용자의 관리자 파일 (onlineUsers)

import { userConst } from "../constants/userStatus.js"

// onlineUsers = Map<userId, {
//   sockets: Set<socketId>, // 2개 이상의 디바이스로 접속
//   status: "online" | "busy" // 메모리에 있다 = 무조건 온라인이긴 하다라는 
//   currentRoomCode: string | null,
// }>
export const onlineUsers = new Map()

const socketUsers = new Map()

// 사용자가 connect 되었을 때
// user에는 [id, name, email, profile_image_link]가 존재
export function addUserSocket(user, socketId) {
  const userId = user.id

  // 사용자가 이미 다른 디바이스 등으로 접속했는지 확인 한번 해주기
  let presence = onlineUsers.get(userId)

  // 최초 디바이스 접속이면 객체 하나 미리 생성해주기 (소켓id는 공통으로 추가해주기)
  if(!presence) {
    presence = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      sockets: new Set(),
      status: userConst.status.online,
    }

    // 관리하는 상태에 사용자 추가해주기
    onlineUsers.set(userId, presence)
  }

  presence.sockets.add(socketId)
  presence.status = userConst.status.online

  // socketId로 접근 가능하게 열어주기
  socketUsers.set(socketId, userId)

  return presence
}

// socket.on("disconnect") 할 때 호출해주기 위해 등록해주기
/**
 * socket.id 를 넣으면
 * 사용자 소켓이 disconnect할 때 onlineUsers에서 삭제해주기. 
 * 사용자의 남은 접속 디바이스 개수 (int)를 반환
 * @param {*} socketId 
 * @returns 
 */
export function removeUserSocket(socketId) {
  const userId = socketUsers.get(socketId)

  // 존재하지 않을 경우에는 그냥 아무것도 안해주기
  if (!userId) {
    return 0
  }

  // socketUsers(역참조)에는 존재하는데 onlineUsers에는 없으면 정리해주기
  const presence = onlineUsers.get(userId)
  if(!presence) {
    socketUsers.delete(socketId)
    return 0
  }

  // Set에서 socket하나 없애주고 역참조도 없애주기
  presence.sockets.delete(socketId)
  socketUsers.delete(socketId)

  // 사용자의 모든 디바이스 접속이 끝났다면 정리해주기
  if (presence.sockets.size === 0) {
    onlineUsers.delete(userId)

    return 0
  }

  return presence.sockets.size
}