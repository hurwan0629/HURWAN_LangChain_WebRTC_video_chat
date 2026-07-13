// P2P localStream MediaPipe processing helper.
// Temporary implementation: MediaPipe Pose draws a skeleton overlay into a
// canvas, then sends canvas.captureStream() as the video track.

const POSE_SCRIPT =
  "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"

const POSE_ASSET_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/pose"

let mediaPipeScriptPromise = null

const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 29], [29, 31], [28, 30], [30, 32],
  [15, 17], [15, 19], [15, 21], [17, 19],
  [16, 18], [16, 20], [16, 22], [18, 20],
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
]

export async function createP2PMediaPipeSession(sourceStream) {
  const sourceVideoTrack = sourceStream.getVideoTracks()[0]

  if(!sourceVideoTrack) {
    throw new Error("MediaPipe requires a video track.")
  }

  await loadPose()

  const inputVideo = document.createElement("video")
  inputVideo.muted = true
  inputVideo.playsInline = true
  inputVideo.autoplay = true
  inputVideo.srcObject = new MediaStream([sourceVideoTrack])
  await inputVideo.play()

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  const settings = sourceVideoTrack.getSettings()
  canvas.width = settings.width || inputVideo.videoWidth || 640
  canvas.height = settings.height || inputVideo.videoHeight || 480

  const pose = new window.Pose({
    locateFile: (file) => `${POSE_ASSET_BASE}/${file}`,
  })

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })

  pose.onResults((results) => {
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)
    drawPoseSkeleton(ctx, results.poseLandmarks, canvas.width, canvas.height)
    ctx.restore()
  })

  let stopped = false
  let sending = false

  const renderFrame = async () => {
    if(stopped) {
      return
    }

    if(!sending && inputVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      sending = true
      try {
        await pose.send({ image: inputVideo })
      }
      finally {
        sending = false
      }
    }

    requestAnimationFrame(renderFrame)
  }

  renderFrame()

  const frameRate = settings.frameRate || 30
  const processedStream = canvas.captureStream(frameRate)

  sourceStream.getAudioTracks().forEach((track) => {
    processedStream.addTrack(track)
  })

  return {
    stream: processedStream,
    videoTrack: processedStream.getVideoTracks()[0],
    stop() {
      stopped = true
      processedStream.getVideoTracks().forEach((track) => track.stop())
      inputVideo.pause()
      inputVideo.srcObject = null
      pose.close()
    },
  }
}

function loadPose() {
  if(window.Pose) {
    return Promise.resolve()
  }

  if(!mediaPipeScriptPromise) {
    mediaPipeScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script")
      script.src = POSE_SCRIPT
      script.async = true
      script.onload = resolve
      script.onerror = () => reject(new Error("Failed to load MediaPipe Pose."))
      document.head.appendChild(script)
    })
  }

  return mediaPipeScriptPromise
}

function drawPoseSkeleton(ctx, landmarks, width, height) {
  if(!landmarks) {
    return
  }

  ctx.lineWidth = 4
  ctx.strokeStyle = "#00e5ff"
  ctx.fillStyle = "#ff2d55"

  POSE_CONNECTIONS.forEach(([fromIndex, toIndex]) => {
    const from = landmarks[fromIndex]
    const to = landmarks[toIndex]

    if(!isVisibleLandmark(from) || !isVisibleLandmark(to)) {
      return
    }

    ctx.beginPath()
    ctx.moveTo(from.x * width, from.y * height)
    ctx.lineTo(to.x * width, to.y * height)
    ctx.stroke()
  })

  landmarks.forEach((landmark) => {
    if(!isVisibleLandmark(landmark)) {
      return
    }

    ctx.beginPath()
    ctx.arc(landmark.x * width, landmark.y * height, 5, 0, Math.PI * 2)
    ctx.fill()
  })
}

function isVisibleLandmark(landmark) {
  return landmark && (landmark.visibility === undefined || landmark.visibility >= 0.5)
}
