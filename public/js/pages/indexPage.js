import { loadMe } from "../authClient.js";

init()


async function init() {
  // 만약에 로그인 되어있으면 바로 대시보드로 이동시켜주기
  const loginResult = await loadMe()

  if(loginResult) {
    window.location.href="/dashboard.html"
  }
}