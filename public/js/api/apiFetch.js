// 클라이언트의 js에서 전역적으로 사용할 fetch 래퍼를 만들어주기

/**
 * 요청을 보내서 성패 여부에 따라 Error 또는 response.json() 을 반환해준다.
 * @param {*} path 요청할 경로 문자열
 * @param {*} options fetch 두번째 인자에 들어가는 옵션들. 기본값은 application/json + 쿠키 포함
 * @returns 
 */
export async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options
  })

  const data = await response.json().catch(() => null)
  
  if(!response.ok) {
    throw new Error(data?.message ?? "Request failed")
  }


  return data
}