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
  Send,
  UserX,
  Users,
  Video,
  VideoOff,
  VolumeX,
  WifiOff,
} from 'lucide-react'
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'

// ---------------------------------------------------------------------------
// Stable client ID — module-level so it survives re-renders
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

interface ChatMessage {
  id: string
  clientId: string
  displayName: string
  text: string
  timestamp: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatMsgTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

function VideoTile({ displayName, isMuted, isVideoOn, isActiveSpeaker, isSelf, stream }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.srcObject = stream ?? null
  }, [stream])

  const initials = getInitials(displayName)
  const showVideo = Boolean(isVideoOn && stream)

  return (
    <div
      className={[
        'relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-video-tile',
        isActiveSpeaker ? 'ring-speaker ring-2' : '',
      ].join(' ')}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        className={[
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-200',
          showVideo ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />
      {!showVideo && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-xl font-semibold text-meeting-foreground">
            {initials}
          </div>
        </div>
      )}
      <div className="tile-scrim absolute inset-x-0 bottom-0 flex items-end justify-between px-3 pb-2 pt-8">
        <span className="text-xs font-medium text-white">
          {displayName}
          {isSelf && <span className="ml-1 text-white/60">(You)</span>}
        </span>
        {isMuted && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger" aria-label="Muted">
            <MicOff className="h-3 w-3 text-white" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// VideoGrid
// ---------------------------------------------------------------------------

function gridColsClass(count: number): string {
  if (count <= 1) return 'grid-cols-1'
  if (count <= 4) return 'grid-cols-2'
  if (count <= 6) return 'grid-cols-3'
  return 'grid-cols-3'
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
    <div className={`grid flex-1 gap-3 ${gridColsClass(participants.length)} content-center`}>
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
  /** Tailwind bg class for the badge — defaults to 'bg-danger' */
  badgeColor?: string
  onClick?: () => void
}

function ControlButton({ label, icon, activeIcon, active, danger, badge, badgeColor = 'bg-danger', onClick }: ControlButtonProps) {
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
          <span className={`absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full ${badgeColor} text-[10px] font-bold text-white`}>
            {badge > 99 ? '99+' : badge}
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
  openPanel: 'participants' | 'chat' | null
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleParticipants: () => void
  onToggleChat: () => void
  onShareScreen: () => void
  onLeave: () => void
  participantCount: number
  chatUnread: number
}

function ControlBar({
  isMuted,
  isVideoOn,
  isScreenSharing,
  openPanel,
  onToggleMute,
  onToggleVideo,
  onToggleParticipants,
  onToggleChat,
  onShareScreen,
  onLeave,
  participantCount,
  chatUnread,
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
        active={openPanel === 'participants'}
        badge={participantCount}
        badgeColor="bg-primary/80"
        onClick={onToggleParticipants}
      />
      <ControlButton
        label="Chat"
        icon={<MessageSquare className="h-5 w-5" />}
        active={openPanel === 'chat'}
        badge={chatUnread}
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
// MeetingInfoBar
// ---------------------------------------------------------------------------

const WS_STATUS_CFG: Record<WsStatus, { dot: string; label: string }> = {
  connecting: { dot: 'bg-yellow-400 animate-pulse', label: 'Connecting…' },
  open:        { dot: 'bg-success',                  label: 'Connected'    },
  closed:      { dot: 'bg-muted-foreground',          label: 'Disconnected' },
  error:       { dot: 'bg-danger',                   label: 'Error'        },
}

function MeetingInfoBar({ meetingId, wsStatus }: { meetingId: string; wsStatus: WsStatus }) {
  const { dot, label } = WS_STATUS_CFG[wsStatus]
  return (
    <div className="flex items-center justify-between px-4 pt-3 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="text-xs text-meeting-foreground/50">Meeting ID:</span>
        <span className="meeting-id text-xs font-medium text-meeting-foreground/80">{meetingId}</span>
      </div>
      <div className="flex items-center gap-2" title={`WebSocket: ${label}`}>
        {wsStatus === 'error' && <WifiOff className="h-3.5 w-3.5 text-danger" aria-hidden="true" />}
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-label={`Connection: ${label}`} />
        <span className="hidden text-xs text-meeting-foreground/40 sm:block">{label}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

function MediaErrorOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-meeting/95 p-6 text-center">
      <VideoOff className="h-12 w-12 text-danger" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold text-meeting-foreground">Camera / Microphone access denied</p>
        <p className="mt-1 text-sm text-meeting-foreground/60">{message}</p>
        <p className="mt-3 text-xs text-meeting-foreground/40">Allow access in your browser settings and reload the page.</p>
      </div>
    </div>
  )
}

function RemovedOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-meeting/95 p-6 text-center">
      <PhoneOff className="h-12 w-12 text-danger" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold text-meeting-foreground">You were removed from the meeting</p>
        <p className="mt-1 text-sm text-meeting-foreground/60">The host ended your participation.</p>
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
// Shared panel shell
// ---------------------------------------------------------------------------

const PANEL_CLASSES =
  'fixed inset-y-0 right-0 z-[50] flex w-full flex-col border-l border-white/10 bg-[hsl(240_5%_15%)] animate-in slide-in-from-right duration-200 ease-out sm:w-80'

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
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
  )
}

// ---------------------------------------------------------------------------
// ParticipantsPanel
// ---------------------------------------------------------------------------

interface ParticipantsPanelProps {
  participants: Participant[]
  myClientId: string
  onClose: () => void
  onMuteParticipant: (clientId: string) => void
  onRemoveParticipant: (clientId: string) => void
}

function ParticipantsPanel({ participants, myClientId, onClose, onMuteParticipant, onRemoveParticipant }: ParticipantsPanelProps) {
  return (
    <aside role="region" aria-label="Participants" className={PANEL_CLASSES}>
      <PanelHeader
        title={`Participants (${participants.length})`}
        onClose={onClose}
      />

      <div className="no-scrollbar flex-1 overflow-y-auto py-2">
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/5"
          >
            {/* Avatar bubble */}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/25 text-xs font-semibold text-meeting-foreground">
              {getInitials(p.displayName)}
            </div>

            {/* Name + badges */}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-sm font-medium text-meeting-foreground">
                  {p.displayName}
                </span>
                {/* MVP: local user is always the host */}
                {p.isSelf && (
                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none bg-primary/25 text-primary">
                    Host
                  </span>
                )}
                {p.isSelf && (
                  <span className="text-xs text-meeting-foreground/40">(You)</span>
                )}
              </div>
              {p.isMuted && (
                <div className="flex items-center gap-1">
                  <MicOff className="h-3 w-3 text-danger" />
                  <span className="text-[11px] text-danger">Muted</span>
                </div>
              )}
            </div>

            {/* Host controls — only shown for remote participants */}
            {p.id !== myClientId && (
              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  aria-label={`Mute ${p.displayName}`}
                  title="Mute participant"
                  onClick={() => onMuteParticipant(p.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-meeting-foreground/40 transition-colors hover:bg-white/10 hover:text-danger focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <VolumeX className="h-3.5 w-3.5" />
                </button>
                <button
                  aria-label={`Remove ${p.displayName}`}
                  title="Remove participant"
                  onClick={() => onRemoveParticipant(p.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-meeting-foreground/40 transition-colors hover:bg-white/10 hover:text-danger focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <UserX className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// ChatPanel
// ---------------------------------------------------------------------------

interface ChatPanelProps {
  messages: ChatMessage[]
  myClientId: string
  onClose: () => void
  onSendMessage: (text: string) => void
}

function ChatPanel({ messages, myClientId, onClose, onSendMessage }: ChatPanelProps) {
  const [inputText, setInputText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const text = inputText.trim()
    if (!text) return
    onSendMessage(text)
    setInputText('')
  }

  return (
    <aside role="region" aria-label="Chat" className={PANEL_CLASSES}>
      <PanelHeader title="Chat" onClose={onClose} />

      {/* Messages */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8">
            <MessageSquare className="h-8 w-8 text-meeting-foreground/20" aria-hidden="true" />
            <p className="text-center text-xs text-meeting-foreground/40">
              No messages yet.<br />Start the conversation!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => {
              const isMine = msg.clientId === myClientId
              return (
                <div key={msg.id} className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                  {!isMine && (
                    <span className="px-1 text-[11px] font-medium text-meeting-foreground/60">
                      {msg.displayName}
                    </span>
                  )}
                  <div
                    className={[
                      'max-w-[85%] break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                      isMine
                        ? 'rounded-tr-sm bg-primary text-primary-foreground'
                        : 'rounded-tl-sm bg-[hsl(240_6%_20%)] text-meeting-foreground',
                    ].join(' ')}
                  >
                    {msg.text}
                  </div>
                  <span className="px-1 text-[10px] text-meeting-foreground/30">
                    {formatMsgTime(msg.timestamp)}
                  </span>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-white/10 px-3 py-3"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a message…"
          maxLength={500}
          className="flex-1 rounded-xl bg-[hsl(240_6%_20%)] px-3.5 py-2 text-sm text-meeting-foreground placeholder:text-meeting-foreground/30 outline-none transition-shadow focus:ring-1 focus:ring-ring/50"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          aria-label="Send message"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// MeetingRoom — main client component
// ---------------------------------------------------------------------------

export function MeetingRoom({ meetingId }: { meetingId: string }) {
  const [openPanel, setOpenPanel] = useState<'participants' | 'chat' | null>(null)

  // Keep a ref so the message subscription closure always reads the current panel
  const openPanelRef = useRef(openPanel)
  useEffect(() => { openPanelRef.current = openPanel }, [openPanel])

  // ── Media devices ─────────────────────────────────────────────────────────
  const {
    localStream,
    isMuted,
    isVideoOn,
    isScreenSharing,
    activeVideoTrack,
    error: mediaError,
    toggleMute,
    setMuted,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useMediaDevices()

  // ── WebSocket signaling channel ───────────────────────────────────────────
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

  // ── Remote participant media-state tracking ───────────────────────────────
  // Populated by participant-audio-updated / participant-video-updated WS events.
  const [remoteMeta, setRemoteMeta] = useState<Map<string, { isMuted: boolean; isVideoOn: boolean }>>(new Map())

  // ── Chat state ────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatUnread, setChatUnread] = useState(0)

  // ── Subscription for UI-layer WS events ──────────────────────────────────
  useEffect(() => {
    return subscribeToMessages((msg) => {
      switch (msg.type) {
        case 'participant-audio-updated': {
          const id = msg.payload.client_id as string
          const isMutedRemote = msg.payload.is_muted as boolean
          setRemoteMeta((prev) => {
            const next = new Map(prev)
            const curr = next.get(id) ?? { isMuted: false, isVideoOn: true }
            next.set(id, { ...curr, isMuted: isMutedRemote })
            return next
          })
          break
        }
        case 'participant-video-updated': {
          const id = msg.payload.client_id as string
          const isVideoOnRemote = msg.payload.is_video_on as boolean
          setRemoteMeta((prev) => {
            const next = new Map(prev)
            const curr = next.get(id) ?? { isMuted: false, isVideoOn: true }
            next.set(id, { ...curr, isVideoOn: isVideoOnRemote })
            return next
          })
          break
        }
        case 'participant-left': {
          // Clean up meta for departed participants
          const leftId = msg.payload.client_id as string
          setRemoteMeta((prev) => {
            const next = new Map(prev)
            next.delete(leftId)
            return next
          })
          break
        }
        case 'chat-message': {
          const newMsg: ChatMessage = {
            id: `${Date.now()}-${Math.random()}`,
            clientId: msg.payload.client_id as string,
            displayName: msg.payload.display_name as string,
            text: msg.payload.text as string,
            timestamp: new Date().toISOString(),
          }
          setChatMessages((prev) => [...prev, newMsg])
          if (openPanelRef.current !== 'chat') {
            setChatUnread((c) => c + 1)
          }
          break
        }
        case 'host-muted-you':
          setMuted(true)
          break
        default:
          break
      }
    })
  }, [subscribeToMessages, setMuted])

  // Reset unread badge when the chat panel opens
  useEffect(() => {
    if (openPanel === 'chat') setChatUnread(0)
  }, [openPanel])

  // ── Side-effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (isRemovedFromMeeting) {
      setTimeout(() => { window.location.href = '/dashboard' }, 3000)
    }
  }, [isRemovedFromMeeting])

  useEffect(() => {
    if (wsStatus !== 'open') return
    sendMessage({ type: 'toggle-audio', payload: { is_muted: isMuted } })
  }, [isMuted, wsStatus, sendMessage])

  useEffect(() => {
    if (wsStatus !== 'open') return
    sendMessage({ type: 'toggle-video', payload: { is_video_on: isVideoOn } })
  }, [isVideoOn, wsStatus, sendMessage])

  // Replace the outbound WebRTC video track whenever camera ↔ screen share toggles
  useEffect(() => {
    replaceLocalVideoTrack(activeVideoTrack).catch(console.error)
  }, [activeVideoTrack, replaceLocalVideoTrack])

  // ── Participant list ──────────────────────────────────────────────────────

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
      isMuted: remoteMeta.get(rp.clientId)?.isMuted ?? false,
      isVideoOn: remoteMeta.get(rp.clientId)?.isVideoOn ?? true,
      isActiveSpeaker: false,
      isSelf: false,
      stream: rp.stream,
    })),
  ]

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleScreenShare() {
    if (isScreenSharing) {
      stopScreenShare()
      sendMessage({ type: 'screen-share-stopped', payload: {} })
    } else {
      const started = await startScreenShare()
      if (started) sendMessage({ type: 'screen-share-started', payload: {} })
    }
  }

  function handleSendMessage(text: string) {
    sendMessage({ type: 'chat-message', payload: { text } })
  }

  function handleMuteParticipant(clientId: string) {
    sendMessage({ type: 'mute-participant', payload: { target: clientId } })
  }

  function handleRemoveParticipant(clientId: string) {
    sendMessage({ type: 'remove-participant', payload: { target: clientId } })
  }

  function togglePanel(panel: 'participants' | 'chat') {
    setOpenPanel((prev) => (prev === panel ? null : panel))
  }

  function handleLeave() {
    sendMessage({ type: 'leave-room', payload: {} })
    window.location.href = '/dashboard'
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex h-screen flex-col bg-meeting text-meeting-foreground">

      {/* Full-screen overlays */}
      {mediaError && <MediaErrorOverlay message={mediaError} />}
      {isRemovedFromMeeting && <RemovedOverlay />}

      <MeetingInfoBar meetingId={meetingId} wsStatus={wsStatus} />

      {/* Stage + side panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col p-3 pb-[calc(5rem+1.5rem)] sm:p-4 sm:pb-[calc(5rem+3rem)]">
          <VideoGrid participants={participants} />
        </div>

        {openPanel === 'participants' && (
          <ParticipantsPanel
            participants={participants}
            myClientId={CLIENT_ID}
            onClose={() => setOpenPanel(null)}
            onMuteParticipant={handleMuteParticipant}
            onRemoveParticipant={handleRemoveParticipant}
          />
        )}

        {openPanel === 'chat' && (
          <ChatPanel
            messages={chatMessages}
            myClientId={CLIENT_ID}
            onClose={() => setOpenPanel(null)}
            onSendMessage={handleSendMessage}
          />
        )}
      </div>

      {/* Control bar */}
      <ControlBar
        isMuted={isMuted}
        isVideoOn={isVideoOn}
        isScreenSharing={isScreenSharing}
        openPanel={openPanel}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleParticipants={() => togglePanel('participants')}
        onToggleChat={() => togglePanel('chat')}
        onShareScreen={handleScreenShare}
        onLeave={handleLeave}
        participantCount={participants.length}
        chatUnread={chatUnread}
      />
    </div>
  )
}
