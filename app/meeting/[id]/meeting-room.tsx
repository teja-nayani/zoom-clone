'use client'

import {
  Mic,
  MicOff,
  Monitor,
  MessageSquare,
  PhoneOff,
  Users,
  Video,
  VideoOff,
} from 'lucide-react'
import { useState } from 'react'

// ---------------------------------------------------------------------------
// Video tile
// ---------------------------------------------------------------------------

type VideoTileProps = {
  displayName: string
  isMuted?: boolean
  isVideoOn?: boolean
  isActiveSpeaker?: boolean
  isSelf?: boolean
}

function VideoTile({ displayName, isMuted, isVideoOn, isActiveSpeaker, isSelf }: VideoTileProps) {
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className={[
        'relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-video-tile',
        isActiveSpeaker ? 'ring-speaker ring-2' : '',
      ].join(' ')}
    >
      {isVideoOn ? (
        /* Real <video> element wired up in Phase 3 */
        <div className="absolute inset-0 flex items-center justify-center bg-video-tile">
          <span className="text-xs text-meeting-foreground/40">Camera feed</span>
        </div>
      ) : (
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
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger">
            <MicOff className="h-3 w-3 text-white" aria-label="Muted" />
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Video grid
// ---------------------------------------------------------------------------

type Participant = {
  id: string
  displayName: string
  isMuted: boolean
  isVideoOn: boolean
  isActiveSpeaker: boolean
  isSelf: boolean
}

function VideoGrid({ participants }: { participants: Participant[] }) {
  const count = participants.length

  const gridClass =
    count === 0
      ? 'grid-cols-1'
      : count === 1
        ? 'grid-cols-1'
        : count === 2
          ? 'grid-cols-2'
          : count <= 4
            ? 'grid-cols-2'
            : 'grid-cols-3'

  if (count === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-meeting-foreground/40">Waiting for participants…</p>
      </div>
    )
  }

  return (
    <div className={`grid flex-1 gap-3 ${gridClass} content-center`}>
      {participants.map((p) => (
        <VideoTile
          key={p.id}
          displayName={p.displayName}
          isMuted={p.isMuted}
          isVideoOn={p.isVideoOn}
          isActiveSpeaker={p.isActiveSpeaker}
          isSelf={p.isSelf}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Control bar button
// ---------------------------------------------------------------------------

type ControlButtonProps = {
  label: string
  icon: React.ReactNode
  activeIcon?: React.ReactNode
  active?: boolean
  danger?: boolean
  badge?: number
  onClick?: () => void
}

function ControlButton({ label, icon, activeIcon, active, danger, badge, onClick }: ControlButtonProps) {
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
            ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
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
// Control bar
// ---------------------------------------------------------------------------

type ControlBarProps = {
  isMuted: boolean
  isVideoOn: boolean
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
        activeIcon={<MicOff className="h-5 w-5" />}
        active={isMuted}
        onClick={onToggleMute}
      />
      <ControlButton
        label={isVideoOn ? 'Stop Video' : 'Start Video'}
        icon={<Video className="h-5 w-5" />}
        activeIcon={<VideoOff className="h-5 w-5" />}
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
        label="Share"
        icon={<Monitor className="h-5 w-5" />}
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
// Meeting info bar
// ---------------------------------------------------------------------------

function MeetingInfoBar({ meetingId }: { meetingId: string }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-3 sm:px-6">
      <span className="text-xs text-meeting-foreground/50">Meeting ID:</span>
      <span className="meeting-id text-xs font-medium text-meeting-foreground/80">{meetingId}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Side panel shell (participants / chat)
// ---------------------------------------------------------------------------

function SidePanel({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <aside
      role="region"
      aria-label={title}
      className="animate-slide-in-right fixed inset-y-0 right-0 z-[50] flex w-full flex-col border-l border-white/10 bg-[hsl(240_5%_15%)] sm:w-panel"
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
        <p className="text-xs text-meeting-foreground/40">
          {title} panel — wired up in Phase 2
        </p>
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Meeting room (client)
// ---------------------------------------------------------------------------

export function MeetingRoom({ meetingId }: { meetingId: string }) {
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [openPanel, setOpenPanel] = useState<'participants' | 'chat' | null>(null)

  // Placeholder participants — replaced with WebRTC/WebSocket state in Phase 3+
  const participants: Participant[] = [
    {
      id: 'self',
      displayName: 'Demo User',
      isMuted,
      isVideoOn,
      isActiveSpeaker: true,
      isSelf: true,
    },
  ]

  function togglePanel(panel: 'participants' | 'chat') {
    setOpenPanel((prev) => (prev === panel ? null : panel))
  }

  return (
    <div className="flex h-screen flex-col bg-meeting text-meeting-foreground">
      <MeetingInfoBar meetingId={meetingId} />

      {/* Main stage */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col p-3 pb-[calc(var(--spacing-control)+1.5rem)] sm:p-4 sm:pb-[calc(var(--spacing-control)+3rem)]">
          <VideoGrid participants={participants} />
        </div>

        {/* Side panel */}
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
        onToggleMute={() => setIsMuted((v) => !v)}
        onToggleVideo={() => setIsVideoOn((v) => !v)}
        onToggleParticipants={() => togglePanel('participants')}
        onToggleChat={() => togglePanel('chat')}
        onShareScreen={() => {/* screen share wired in Phase 6 */}}
        onLeave={() => { window.location.href = '/dashboard' }}
        participantCount={participants.length}
      />
    </div>
  )
}
