// mediasoup의 router, transport, producer, consumer의 생성과 관리 에 대해서 일관되게 관리하는 파일

import { logger } from "../utils/logger.js";
import { createWebRtcTransport } from "./transport.js";

// 
/**
 * 라우터와 socket을 통해서 transport 하나 생성해서 반환해주기
 * { transport, clientOptions }
 */
export async function initTransport({ router, socket }) {
  logger("/mediasoup/mediasoup.service.js initTransport",
    `create Transport By ${socket.data.user.name} offer. routerId: ${router.id}`
  )

  return await createWebRtcTransport({ router })
}