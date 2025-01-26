import { Button } from "@/components/ui/button"
import { Camera, CameraOff, Mic, MicOff, SkipForward, LogOut } from "lucide-react"

interface VideoControlsProps {
  isCameraOn: boolean
  isMicOn: boolean
  onToggleCamera: () => void
  onToggleMic: () => void
  onNext: () => void
  onLeave: () => void
}

export function VideoControls({
  isCameraOn,
  isMicOn,
  onToggleCamera,
  onToggleMic,
  onNext,
  onLeave,
}: VideoControlsProps) {
  return (
    <div className="controls-overlay">
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-white/10 hover:bg-white/20"
          onClick={onToggleCamera}
        >
          {isCameraOn ? <Camera className="h-6 w-6" /> : <CameraOff className="h-6 w-6" />}
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-white/10 hover:bg-white/20"
          onClick={onToggleMic}
        >
          {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </Button>

        <Button variant="outline" size="icon" className="rounded-full bg-white/10 hover:bg-white/20" onClick={onNext}>
          <SkipForward className="h-6 w-6" />
        </Button>

        <Button variant="destructive" size="icon" className="rounded-full" onClick={onLeave}>
          <LogOut className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}

