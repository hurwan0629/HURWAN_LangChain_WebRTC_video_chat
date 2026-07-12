// WebRtcTransport의 생성 및 관리

import config from "../config/env.js";


/**
 * router 정보만 주면 transport 하나 만들어서
 * 서버가 가지고 있게 될 transport와 
 * 클라이언트에게 연결 정보로써 줄 clientOptions를 
 * { transport, clientOptions } 형태로 반환
 * @param {*} param0 
 * @returns 
 */
export async function createWebRtcTransport({ router }) {

  let listenInfos = []

  if(config.mediasoup.enableUdp) {
    listenInfos.push({
      protocol: "udp",
      ip: config.mediasoup.listenIp,
      announcedAddress: config.mediasoup.announcedAddress
    })
  }

  if(config.mediasoup.enableTcp) {
    listenInfos.push({
      protocol: "tcp",
      ip: config.mediasoup.listenIp,
      announcedAddress: config.mediasoup.announcedAddress
    })
  }
  

  const transport = await router.createWebRtcTransport({
    listenInfos,
    enableUdp: config.mediasoup.enableUdp,
    enableTcp: config.mediasoup.enableTcp,
    preferUdp: true,
    enableSctp: config.mediasoup.enableSctp,
    initialAvailableOutgoingBitrate: config.mediasoup.initialOutgoingBitrate,
  });
  
  transport.on("icestatechange", (state) => {
    console.log("ice state", transport.id, state);
  });

  transport.on("iceselectedtuplechange", (tuple) => {
    console.log("ice selected tuple", transport.id, tuple);
  });

  transport.on("dtlsstatechange", (state) => {
    console.log("dtls state", transport.id, state);
  });

  return {
    transport,
    clientOptions: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters,
    },
  };
}