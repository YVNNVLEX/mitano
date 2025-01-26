"use client"

import { useEffect, useRef, useState } from "react"
import { VideoControls } from "@/components/video-controls"
import { useRouter } from "next/navigation"
import { io, type Socket } from "socket.io-client"
import { Button } from "@/components/ui/button"

export default function ChatPage() {
  const router = useRouter()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const socketRef = useRef<Socket | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    })

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", event.candidate)
      }
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
        setIsConnected(true)
      }
    }

    return pc
  }

  const initWebRTC = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      const peerConnection = createPeerConnection()
      peerConnectionRef.current = peerConnection

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream)
      })

      socketRef.current?.emit("ready")
    } catch (error) {
      console.error("Erreur d'accès aux périphériques:", error)
    }
  }

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000")
    socketRef.current = socket

    socket.on("paired", async ({ roomId }) => {
      console.log("Jumelé dans la room:", roomId)
      try {
        const offer = await peerConnectionRef.current?.createOffer()
        await peerConnectionRef.current?.setLocalDescription(offer)
        socket.emit("offer", offer)
      } catch (err) {
        console.error("Erreur lors de la création de l'offre:", err)
      }
    })

    socket.on("offer", async (offer) => {
      try {
        await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await peerConnectionRef.current?.createAnswer()
        await peerConnectionRef.current?.setLocalDescription(answer)
        socket.emit("answer", answer)
      } catch (err) {
        console.error("Erreur lors du traitement de l'offre:", err)
      }
    })

    socket.on("answer", async (answer) => {
      try {
        await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(answer))
        socket.emit("connection-established")
      } catch (err) {
        console.error("Erreur lors du traitement de la réponse:", err)
      }
    })

    socket.on("ice-candidate", async (candidate) => {
      try {
        await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.error("Erreur lors de l'ajout du candidat ICE:", err)
      }
    })

    socket.on("peer-disconnected", () => {
      setIsConnected(false)
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
      }
      initWebRTC()
    })

    socket.on("pairing-timeout", () => {
      console.log("Timeout de jumelage, réessai...")
      initWebRTC()
    })

    initWebRTC()

    return () => {
      if (localVideoRef.current?.srcObject instanceof MediaStream) {
        localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop())
      }
      peerConnectionRef.current?.close()
      socket.close()
    }
  }, [])

  const toggleCamera = () => {
    const videoTrack =
      localVideoRef.current?.srcObject instanceof MediaStream && localVideoRef.current.srcObject.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setIsCameraOn(!isCameraOn)
    }
  }

  const toggleMic = () => {
    const audioTrack =
      localVideoRef.current?.srcObject instanceof MediaStream && localVideoRef.current.srcObject.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsMicOn(!isMicOn)
    }
  }

  const handleNext = () => {
    setIsConnected(false)
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    peerConnectionRef.current?.close()
    peerConnectionRef.current = createPeerConnection()
    socketRef.current?.emit("ready")
  }

  const handleLeave = () => {
    router.push("/")
  }

  return (
    <div className="fixed inset-0 bg-black">
      <div className="relative h-full">
        {/* Remote Video (Full Screen) */}
        <div className="absolute inset-0">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-32 h-48 md:w-48 md:h-72 bg-black rounded-lg overflow-hidden shadow-lg">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>

        {/* Waiting Message */}
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
              <p className="text-xl">En attente d&apos;un partenaire...</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <VideoControls
          isCameraOn={isCameraOn}
          isMicOn={isMicOn}
          onToggleCamera={toggleCamera}
          onToggleMic={toggleMic}
          onNext={handleNext}
          onLeave={handleLeave}
        />
      </div>
    </div>
  )
}

