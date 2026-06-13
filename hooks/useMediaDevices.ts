import { useCallback, useEffect, useRef, useState } from 'react'

export interface MediaDevicesState {
  /** The live local MediaStream (audio + video). Null until permissions are granted. */
  localStream: MediaStream | null
  /** True when the mic audio track is disabled. */
  isMuted: boolean
  /** True when the camera video track is enabled. */
  isVideoOn: boolean
  /** Non-null if getUserMedia was denied or failed. */
  error: string | null
  /** Toggle the microphone on/off without stopping the track. */
  toggleMute: () => void
  /** Toggle the camera on/off without stopping the track. */
  toggleVideo: () => void
}

/**
 * Requests camera + microphone access on mount.
 * Exposes the local MediaStream and toggle helpers that enable/disable tracks
 * (so the stream object stays the same — important for Phase 5 WebRTC renegotiation).
 * Stops all tracks on unmount to release the hardware.
 */
export function useMediaDevices(): MediaDevicesState {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep a ref so the cleanup closure always has the latest stream
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let cancelled = false

    async function requestMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        if (cancelled) {
          // Component unmounted before the promise resolved — release immediately
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream
        setLocalStream(stream)
        setError(null)
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Could not access camera/microphone'
          setError(msg)
        }
      }
    }

    requestMedia()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const toggleMute = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    const next = !isMuted
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !next
    })
    setIsMuted(next)
  }, [isMuted])

  const toggleVideo = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    const next = !isVideoOn
    stream.getVideoTracks().forEach((t) => {
      t.enabled = next
    })
    setIsVideoOn(next)
  }, [isVideoOn])

  return { localStream, isMuted, isVideoOn, error, toggleMute, toggleVideo }
}
