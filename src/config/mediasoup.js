// 사용하는 코덱이나 전송 옵션, 워커 개수, 사용 ip/포트 범위 등을 설정하는 파일

export const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },

  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
  },

  {
    kind: "video",
    mimeType: "video/H264",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "profile-level-id": "42e01f",
      "level-asymmetry-allowed": 1,
    },
  },
];