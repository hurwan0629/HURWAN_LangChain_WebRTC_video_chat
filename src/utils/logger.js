// 서버 로그 출력 유틸

import { currTime } from "./date.js"

/**
 * 아래와 같은 포멧으로 일관되게 로그를 찍어줍니다.
 * [YYYY-MM-DD HH:mm:ss] [eventSource] content 
 * @param {string} eventSource 발생 경로 또는 작업
 * @param {string} message 구체적인 내용
 */
export function logger(eventSource, message) {
  console.log(`[${currTime()}] [${eventSource}] ${message}`)
}