// [2026-07-11 13:50:17] express는 cookie-parser가 있는데 socket.io는 없네. cookie 패키지 말고 직접 써보자.

/**
 * `a=123; b=456;`형태를 받아서
 * {
 *  a: "123",
 *  b: "456"
 * }
 * 으로 반환하는 함수
 * @param {*} cookieHeader 
 */
export function parseCookie(cookieHeader = "") {
  return cookieHeader.split(";")
  .map((cookie) => cookie.trim())
  .filter(trimCookie => !!trimCookie)
  .reduce((result, cookieStr) => {
    // 쿠키 문자열에 `=` 있는 경우를 생각
    const [key, ...rest] = cookieStr.split("=")
    result[key] = decodeURIComponent(rest.join("="))
    return result
  }, {})
}