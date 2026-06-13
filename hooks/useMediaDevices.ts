import { useCallback, useEffect, useRef, useState } from 'react'

export interface MediaDevicesState {
  localStream: MediaStream | null
  isMuted: boolean
  isVideoOn: boolean
  isScreenSharing: boolean
  /**
   * The currently active video track — camera while not sharing, screen share track
   * while sharing. Components should watch this to replace the outbound WebRTC track.
   */
  activeVideoTrack: MediaStreamTrack | null
  error: string | null
  toggleMute: () => void
  /** Host-forced mute — updates UI state and disables the mic track. */
  setMuted: (muted: boolean) => void
  toggleVideo: () => void
  /**
   * Requests getDisplayMedia, swaps the video track in localStream for the screen
   * track, updates activeVideoTrack, and registers a listener for the native browser
   * "Stop sharing" button so the swap reverts automatically.
   * Returns true on success, false if the user cancelled or permission was denied.
   */
  startScreenShare: () => Promise<boolean>
  /**
   * Explicitly stops screen sharing: removes the screen track, restores the camera
   * track in localStream, and updates activeVideoTrack.
   */
  stopScreenShare: () => void
}

export function useMediaDevices(
  initialAudio = true,
  initialVideo = true,
): MediaDevicesState {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(!initialAudio)
  const [isVideoOn, setIsVideoOn] = useState(initialVideo)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [activeVideoTrack, setActiveVideoTrack] = useState<MediaStreamTrack | null>(null)
  const [error, setError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  /** Original camera video track — kept alive (but possibly removed from stream) during screen share. */
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null)
  /** Active screen-share video track, or null when not sharing. */
  const screenTrackRef = useRef<MediaStreamTrack | null>(null)
  /**
   * Stable ref to stopScreenShare so the 'ended' event listener (attached inside
   * startScreenShare) always calls the latest version without a stale closure.
   */
  const stopScreenShareRef = useRef<() => void>(() => {})

  // ── Acquire camera + mic on mount ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function requestMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        // Apply pre-join privacy constraints immediately
        stream.getAudioTracks().forEach((t) => { t.enabled = initialAudio })
        stream.getVideoTracks().forEach((t) => { t.enabled = initialVideo })

        const videoTrack = stream.getVideoTracks()[0] ?? null
        cameraTrackRef.current = videoTrack
        streamRef.current = stream
        setLocalStream(stream)
        setActiveVideoTrack(videoTrack)
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not access camera/microphone')
        }
      }
    }

    requestMedia()

    return () => {
      cancelled = true
      // Stop all tracks to release hardware
      streamRef.current?.getTracks().forEach((t) => t.stop())
      screenTrackRef.current?.stop()
      streamRef.current = null
      screenTrackRef.current = null
      cameraTrackRef.current = null
    }
  }, [])

  // ── toggleMute / toggleVideo ──────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    const next = !isMuted
    stream.getAudioTracks().forEach((t) => { t.enabled = !next })
    setIsMuted(next)
  }, [isMuted])

  const setMuted = useCallback((muted: boolean) => {
    const stream = streamRef.current
    if (!stream) return
    stream.getAudioTracks().forEach((t) => { t.enabled = !muted })
    setIsMuted(muted)
  }, [])

  const toggleVideo = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    const next = !isVideoOn
    stream.getVideoTracks().forEach((t) => { t.enabled = next })
    setIsVideoOn(next)
  }, [isVideoOn])

  // ── stopScreenShare ───────────────────────────────────────────────────────
  const stopScreenShare = useCallback(() => {
    const stream = streamRef.current
    const screenTrack = screenTrackRef.current
    const cameraTrack = cameraTrackRef.current

    if (screenTrack) {
      // Remove 'ended' listener to avoid double-firing
      screenTrack.removeEventListener('ended', stopScreenShareRef.current)
      if (stream) stream.removeTrack(screenTrack)
      screenTrack.stop()
      screenTrackRef.current = null
    }

    if (cameraTrack && stream) {
      // Re-insert the camera track (it was never stopped, just removed)
      stream.addTrack(cameraTrack)
      setActiveVideoTrack(cameraTrack)
    } else {
      setActiveVideoTrack(null)
    }

    setIsScreenSharing(false)
  }, [])

  // Keep the ref up to date so the 'ended' listener always calls the latest version
  useEffect(() => { stopScreenShareRef.current = stopScreenShare }, [stopScreenShare])

  // ── startScreenShare ──────────────────────────────────────────────────────
  const startScreenShare = useCallback(async (): Promise<boolean> => {
    if (isScreenSharing) return false
    const stream = streamRef.current
    if (!stream) return false

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const screenTrack = screenStream.getVideoTracks()[0]
      if (!screenTrack) return false

      // Remove the camera track from the stream (without stopping it)
      const cameraTrack = stream.getVideoTracks()[0]
      if (cameraTrack) {
        stream.removeTrack(cameraTrack)
        cameraTrackRef.current = cameraTrack
      }

      // Add the screen track to the existing stream
      stream.addTrack(screenTrack)
      screenTrackRef.current = screenTrack

      setActiveVideoTrack(screenTrack)
      setIsScreenSharing(true)

      // When the user clicks the browser's native "Stop sharing" button
      screenTrack.addEventListener('ended', () => stopScreenShareRef.current())

      return true
    } catch {
      // User cancelled getDisplayMedia or permission denied — not an error
      return false
    }
  }, [isScreenSharing])

  return {
    localStream,
    isMuted,
    isVideoOn,
    isScreenSharing,
    activeVideoTrack,
    error,
    toggleMute,
    setMuted,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  }
}
