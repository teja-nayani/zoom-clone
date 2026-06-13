'use client'

import { useMediaDevices } from '@/hooks/useMediaDevices'
import { useWebRTC } from '@/hooks/useWebRTC'
import { useWebSocket, type WsStatus } from '@/hooks/useWebSocket'
import {
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Users,
  Video,
  VideoOff,
  WifiOff,
} from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Stable client ID — created once per page load, never changes
// ---------------------------------------------------------------------------

function makeClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const CLIENT_ID = makeClientId()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Participant {
  id: string
  displayName: string
  isMuted: boolean
  isVideoOn: boolean
  isActiveSpeaker: boolean
  isSelf: boolean
  stream: MediaStream | null
}

// ---------------------------------------------------------------------------
// VideoTile
// ---------------------------------------------------------------------------

interface VideoTileProps {
  displayName: string
  isMuted?: boolean
  isVideoOn?: boolean
  isActiveSpeaker?: boolean
  isSelf?: boolean
  stream?: MediaStream | null
}

function VideoTile({
  displayName,
  isMuted,
  isVideoOn,
  isActiveSpeaker,
  isSelf,
  stream,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.srcObject = stream ?? null
  }, [stream])

  const initials = displayName
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const showVideo = Boolean(isVideoOn && stream)

  return (
    <div
      className={[
        'relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-video-tile',
        isActiveSpeaker ? 'ring-speaker ring-2' : '',
      ].join(' ')}
    >
      {/* Live video element — always in DOM, visibility toggled via opacity */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf} // prevent self-feedback; remote audio must play
        className={[
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-200',
          showVideo ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />

      {/* Avatar — visible when video is off or stream is unavailable */}
      {!showVideo && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-xl font-semibold text-meeting-foreground">
            {initials}
          </div>
        </div>
      )}

      {/* Name label + muted badge */}
      <div className="tile-scrim absolute inset-x-0 bottom-0 flex items-end justify-between px-3 pb-2 pt-8">
        <span className="text-xs font-medium text-white">
          {displayName}
          {isSelf && <span className="ml-1 text-white/60">(You)</span>}
        </span>
        {isMuted && (
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full bg-danger"
            aria-label="Muted"
          >
            <MicOff className="h-3 w-3 text-white" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// VideoGrid — responsive column layout driven by participant count
// ---------------------------------------------------------------------------

function gridColsClass(count: number): string {
  if (count <= 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-2'
  if (count <= 4) return 'grid-cols-2'
  if (count <= 6) return 'grid-cols-3'
  return 'grid-cols-3' // 7–9 still 3×3; Phase 7 can add pagination
}

function VideoGrid({ participants }: { participants: Participant[] }) {
  if (participants.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-meeting-foreground/40">Waiting for participants…</p>
      </div>
    )
  }

  return (
    <div
      className={`grid flex-1 gap-3 ${gridColsClass(participants.length)} content-center`}
    >
      {participants.map((p) => (
        <VideoTile
          key={p.id}
          displayName={p.displayName}
          isMuted={p.isMuted}
          isVideoOn={p.isVideoOn}
          isActiveSpeaker={p.isActiveSpeaker}
          isSelf={p.isSelf}
          stream={p.stream}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ControlButton
// ---------------------------------------------------------------------------

interface ControlButtonProps {
  label: string
  icon: ReactNode
  activeIcon?: ReactNode
  active?: boolean
  danger?: boolean
  badge?: number
  onClick?: () => void
}

function ControlButton({
  label,
  icon,
  activeIcon,
  active,
  danger,
  badge,
  onClick,
}: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={[
        'relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'min-w-[56px]',
        danger
          ? 'bg-danger text-danger-foreground hover:bg-danger-hover'
          : active
            ? 'bg-primary/30 text-white'
            : 'text-meeting-foreground hover:bg-white/10',
      ].join(' ')}
    >
      <span className="relative">
        {active && activeIcon ? activeIcon : icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {badge}
          </span>
        )}
      </span>
      <span className="hidden sm:block">{label}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// ControlBar
// ---------------------------------------------------------------------------

interface ControlBarProps {
  isMuted: boolean
  isVideoOn: boolean
  isScreenSharing: boolean
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleParticipants: () => void
  onToggleChat: () => void
  onShareScreen: () => void
  onLeave: () => void
  participantCount: number
}

function ControlBar({
  isMuted,
  isVideoOn,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleParticipants,
  onToggleChat,
  onShareScreen,
  onLeave,
  participantCount,
}: ControlBarProps) {
  return (
    <div className="glass-dark fixed inset-x-0 bottom-0 z-[40] flex items-center justify-center gap-2 px-4 py-3 shadow-control sm:bottom-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl sm:px-6">
      <ControlButton
        label={isMuted ? 'Unmute' : 'Mute'}
        icon={<Mic className="h-5 w-5" />}
        activeIcon={<MicOff className="h-5 w-5 text-danger" />}
        active={isMuted}
        onClick={onToggleMute}
      />
      <ControlButton
        label={isVideoOn ? 'Stop Video' : 'Start Video'}
        icon={<Video className="h-5 w-5" />}
        activeIcon={<VideoOff className="h-5 w-5 text-danger" />}
        active={!isVideoOn}
        onClick={onToggleVideo}
      />

      <div className="mx-1 h-8 w-px bg-white/10" aria-hidden="true" />

      <ControlButton
        label="Participants"
        icon={<Users className="h-5 w-5" />}
        badge={participantCount}
        onClick={onToggleParticipants}
      />
      <ControlButton
        label="Chat"
        icon={<MessageSquare className="h-5 w-5" />}
        onClick={onToggleChat}
      />
      <ControlButton
        label={isScreenSharing ? 'Stop Share' : 'Share'}
        icon={<Monitor className="h-5 w-5" />}
        active={isScreenSharing}
        onClick={onShareScreen}
      />

      <div className="mx-1 h-8 w-px bg-white/10" aria-hidden="true" />

      <ControlButton
        label="Leave"
        icon={<PhoneOff className="h-5 w-5" />}
        danger
        onClick={onLeave}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// MeetingInfoBar — shows meeting ID and live WS connection status dot
// ---------------------------------------------------------------------------

const WS_STATUS_CFG: Record<WsStatus, { dot: string; label: string }> = {
  connecting: { dot: 'bg-yellow-400 animate-pulse', label: 'Connecting…' },
  open:        { dot: 'bg-success',                  label: 'Connected'    },
  closed:      { dot: 'bg-muted-foreground',          label: 'Disconnected' },
  error:       { dot: 'bg-danger',                   label: 'Error'        },
}

function MeetingInfoBar({
  meetingId,
  wsStatus,
}: {
  meetingId: string
  wsStatus: WsStatus
}) {
  const { dot, label } = WS_STATUS_CFG[wsStatus]
  return (
    <div className="flex items-center justify-between px-4 pt-3 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="text-xs text-meeting-foreground/50">Meeting ID:</span>
        <span className="meeting-id text-xs font-medium text-meeting-foreground/80">
          {meetingId}
        </span>
      </div>
      <div className="flex items-center gap-2" title={`WebSocket: ${label}`}>
        {wsStatus === 'error' && (
          <WifiOff className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
        )}
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-label={`Connection: ${label}`} />
        <span className="hidden text-xs text-meeting-foreground/40 sm:block">{label}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Media permission error overlay
// ---------------------------------------------------------------------------

function MediaErrorOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-meeting/95 p-6 text-center">
      <VideoOff className="h-12 w-12 text-danger" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold text-meeting-foreground">
          Camera / Microphone access denied
        </p>
        <p className="mt-1 text-sm text-meeting-foreground/60">{message}</p>
        <p className="mt-3 text-xs text-meeting-foreground/40">
          Allow access in your browser settings and reload the page.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Removed-from-meeting overlay
// ---------------------------------------------------------------------------

function RemovedOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-meeting/95 p-6 text-center">
      <PhoneOff className="h-12 w-12 text-danger" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold text-meeting-foreground">
          You were removed from the meeting
        </p>
        <p className="mt-1 text-sm text-meeting-foreground/60">
          The host ended your participation.
        </p>
      </div>
      <button
        onClick={() => { window.location.href = '/dashboard' }}
        className="mt-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
      >
        Return to Home
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SidePanel
// ---------------------------------------------------------------------------

function SidePanel({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <aside
      role="region"
      aria-label={title}
      className="animate-slide-in-right fixed inset-y-0 right-0 z-[50] flex w-full flex-col border-l border-white/10 bg-[hsl(240_5%_15%)] sm:w-[var(--spacing-panel,20rem)]"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-meeting-foreground">{title}</h2>
        <button
          aria-label={`Close ${title}`}
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-meeting-foreground/60 transition-colors hover:bg-white/10 hover:text-meeting-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xs text-meeting-foreground/40">{title} — Phase 7</p>
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// MeetingRoom — main client component
// ---------------------------------------------------------------------------

export function MeetingRoom({ meetingId }: { meetingId: string }) {
  const [openPanel, setOpenPanel] = useState<'participants' | 'chat' | null>(null)

  // ── Media devices (camera + mic + screen share) ──────────────────────────
  const {
    localStream,
    isMuted,
    isVideoOn,
    isScreenSharing,
    activeVideoTrack,
    error: mediaError,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useMediaDevices()

  // ── WebSocket signaling channel ──────────────────────────────────────────
  const { status: wsStatus, sendMessage, subscribeToMessages } = useWebSocket(
    meetingId,
    CLIENT_ID,
    'Demo User',
  )

  // ── WebRTC peer connections ───────────────────────────────────────────────
  const { remoteParticipants, isRemovedFromMeeting, replaceLocalVideoTrack } = useWebRTC(
    CLIENT_ID,
    localStream,
    wsStatus,
    sendMessage,
    subscribeToMessages,
  )

  // Redirect when removed by host
  useEffect(() => {
    if (isRemovedFromMeeting) {
      setTimeout(() => { window.location.href = '/dashboard' }, 3000)
    }
  }, [isRemovedFromMeeting])

  // Notify the room of local audio/video state changes so other participants'
  // UI can reflect our mute/video status.
  useEffect(() => {
    if (wsStatus !== 'open') return
    sendMessage({ type: 'toggle-audio', payload: { is_muted: isMuted } })
  }, [isMuted, wsStatus, sendMessage])

  useEffect(() => {
    if (wsStatus !== 'open') return
    sendMessage({ type: 'toggle-video', payload: { is_video_on: isVideoOn } })
  }, [isVideoOn, wsStatus, sendMessage])

  // ── Build participant list (self first, then remotes) ────────────────────
  const selfParticipant: Participant = {
    id: CLIENT_ID,
    displayName: 'Demo User',
    isMuted,
    isVideoOn,
    isActiveSpeaker: remoteParticipants.length === 0,
    isSelf: true,
    stream: localStream,
  }

  const participants: Participant[] = [
    selfParticipant,
    ...remoteParticipants.map((rp) => ({
      id: rp.clientId,
      displayName: rp.displayName,
      isMuted: false,   // remote mute state reflected via participant-audio-updated (Phase 7)
      isVideoOn: true,  // remote video state reflected via participant-video-updated (Phase 7)
      isActiveSpeaker: false,
      isSelf: false,
      stream: rp.stream,
    })),
  ]

  // Whenever the active video track changes (camera ↔ screen), replace it in all
  // active WebRTC senders so remote participants see the correct video.
  useEffect(() => {
    replaceLocalVideoTrack(activeVideoTrack).catch(console.error)
  }, [activeVideoTrack, replaceLocalVideoTrack])

  async function handleScreenShare() {
    if (isScreenSharing) {
      stopScreenShare()
      sendMessage({ type: 'screen-share-stopped', payload: {} })
    } else {
      const started = await startScreenShare()
      if (started) {
        sendMessage({ type: 'screen-share-started', payload: {} })
      }
    }
  }

  function togglePanel(panel: 'participants' | 'chat') {
    setOpenPanel((prev) => (prev === panel ? null : panel))
  }

  function handleLeave() {
    sendMessage({ type: 'leave-room', payload: {} })
    window.location.href = '/dashboard'
  }

  return (
    <div className="relative flex h-screen flex-col bg-meeting text-meeting-foreground">

      {/* Overlays — rendered on top of everything */}
      {mediaError && <MediaErrorOverlay message={mediaError} />}
      {isRemovedFromMeeting && <RemovedOverlay />}

      <MeetingInfoBar meetingId={meetingId} wsStatus={wsStatus} />

      {/* Stage */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col p-3 pb-[calc(5rem+1.5rem)] sm:p-4 sm:pb-[calc(5rem+3rem)]">
          <VideoGrid participants={participants} />
        </div>

        {openPanel && (
          <SidePanel
            title={openPanel === 'participants' ? `Participants (${participants.length})` : 'Chat'}
            onClose={() => setOpenPanel(null)}
          />
        )}
      </div>

      {/* Control bar */}
      <ControlBar
        isMuted={isMuted}
        isVideoOn={isVideoOn}
        isScreenSharing={isScreenSharing}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleParticipants={() => togglePanel('participants')}
        onToggleChat={() => togglePanel('chat')}
        onShareScreen={handleScreenShare}
        onLeave={handleLeave}
        participantCount={participants.length}
      />
    </div>
  )
}
