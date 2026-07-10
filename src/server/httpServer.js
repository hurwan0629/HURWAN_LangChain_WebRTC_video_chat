// socket.io를 사용하기 위한 httpServer생성용 파일 (createServer(app))

import { createServer } from "http"
import registSocketServer from "./socketServer.js"
import app from "../app/app.js"
import { logger } from "../utils/logger.js"

// express 어플리케이션으로 서버 등록해주기 (라우팅 등도 여기에서 진행됨)
const httpServer = createServer(app)
logger("/server/httpServer.js", "http 서버가 생성되엇습니다.")

// socketio 서버 만들어서 등록해주기. (이벤트 등록도 내부적으로 해줌)
registSocketServer(httpServer)
logger("/server/httpServer.js", "소켓 서버가 생성되엇습니다.")

export default httpServer