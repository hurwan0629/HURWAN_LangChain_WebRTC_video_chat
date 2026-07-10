// socketio와 app의 cors를 각각 관리해주기 위한 파일

import config from "./env.js"

// [2026-07-10 08:45:33] 에 완성
export const appCorsOptions = {
  origin: config.host.clientOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

export const socketCorsOptions = {
  origin: config.host.clientOrigin,
  credentials: true,
  methods: ["GET", "POST"],
}