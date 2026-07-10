// [2026-07-10 07:57:10] morgan에서 사용 및 여기저기에서 사용할 함수

/**
 * 'YYYY-mm-dd HH:MM:ss'를 반환한다.
 */
export function currTime() {
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() +1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hour = String(now.getHours()).padStart(2, "0")
  const min = String(now.getMinutes()).padStart(2, "0")
  const sec = String(now.getSeconds()).padStart(2, "0")
  
  return `${year}-${month}-${day} ${hour}:${min}:${sec}`
}

