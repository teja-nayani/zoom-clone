'use client'

import Image from 'next/image'
import {
  Calendar,
  Check,
  Clock,
  Copy,
  HelpCircle,
  Loader2,
  Menu,
  Monitor,
  MoreHorizontal,
  Plus,
  Settings,
  User,
  Video,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// API types (mirroring backend schemas)
// ---------------------------------------------------------------------------

type MeetingStatus = 'scheduled' | 'live' | 'ended'

interface MeetingOut {
  id: number
  meeting_code: string
  title: string
  description: string | null
  host_user_id: number
  scheduled_start_time: string | null
  duration_minutes: number | null
  status: MeetingStatus
  invite_link: string | null
  created_at: string
}

interface RecentMeetingOut {
  id: number
  meeting_id: number
  user_id: number
  joined_at: string
  meeting: MeetingOut
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const API_BASE = 'http://localhost:8000'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Formatting utilities
// ---------------------------------------------------------------------------

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function formatMeetingCode(code: string): string {
  return code.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
}

function durationLabel(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return ` · ${minutes} min`
  return ` · ${minutes / 60}h`
}

// ---------------------------------------------------------------------------
// Navbar  (logo + quick-action text links + settings/avatar)
// ---------------------------------------------------------------------------

type SidebarView = 'home' | 'meetings'

function Navbar({
  onSchedule,
  onJoin,
  onHost,
  activeView,
  onNavigate,
  isMobileMenuOpen,
  onToggleMobileMenu,
}: {
  onSchedule: () => void
  onJoin: () => void
  onHost: () => void
  activeView: SidebarView
  onNavigate: (view: SidebarView) => void
  isMobileMenuOpen: boolean
  onToggleMobileMenu: () => void
}) {
  const mobileNavItems: { label: string; view: SidebarView }[] = [
    { label: 'Home', view: 'home' },
    { label: 'Meetings', view: 'meetings' },
  ]

  return (
    <header className="fixed inset-x-0 top-0 z-[30] border-b border-border bg-background">
      <div className="relative flex h-[var(--spacing-navbar,4rem)] items-center justify-between px-6 md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
            onClick={onToggleMobileMenu}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <Image
            src="/Zoom_logo.svg"
            alt="Zoom"
            width={115}
            height={28}
            priority
            className="h-auto"
          />
        </div>

        <div className="flex items-center gap-6">
          {/* Quick-action text links — match Zoom portal header */}
          <nav className="hidden items-center gap-6 sm:flex">
            {[
              { label: 'Schedule', onClick: onSchedule },
              { label: 'Join',     onClick: onJoin     },
              { label: 'Host',     onClick: onHost     },
            ].map(({ label, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="text-[16px] font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Divider */}
          <div className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />

          {/* Icon controls */}
          <div className="flex items-center gap-3">
            <button
              aria-label="Settings"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Settings className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
            </button>
            <button
              aria-label="Account menu"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              D
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation dropdown */}
      {isMobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="absolute left-0 right-0 top-full border-t border-border bg-background px-3 py-2 shadow-card lg:hidden"
        >
          {mobileNavItems.map(({ label, view }) => (
            <button
              key={view}
              type="button"
              onClick={() => onNavigate(view)}
              className={[
                'flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                activeView === view
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
    </header>
  )
}

// ---------------------------------------------------------------------------
// LeftSidebar  (2-column layout — Home + Meetings only, My Account + Support)
// ---------------------------------------------------------------------------

function LeftSidebar({
  activeView,
  onNavigate,
}: {
  activeView: SidebarView
  onNavigate: (v: SidebarView) => void
}) {
  const navItems: { label: string; view: SidebarView }[] = [
    { label: 'Home',     view: 'home'     },
    { label: 'Meetings', view: 'meetings' },
  ]

  const bottomItems: { label: string; icon: typeof User }[] = [
    { label: 'My Account', icon: User       },
    { label: 'Support',    icon: HelpCircle },
  ]

  return (
    <aside className="hidden w-60 flex-shrink-0 flex-col overflow-y-auto border-r border-border bg-background lg:flex">
      {/* Main navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ label, view }) => (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            className={[
              'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              activeView === view
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom account links */}
      <div className="border-t border-border px-3 py-3 space-y-0.5">
        {bottomItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={label}
      className={[
        'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
        'border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        copied
          ? 'border-success/30 bg-success/10 text-success'
          : 'bg-background text-foreground hover:bg-muted',
      ].join(' ')}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy Link'}
    </button>
  )
}

// ---------------------------------------------------------------------------
// MeetingCard
// ---------------------------------------------------------------------------

interface MeetingCardProps {
  title: string
  meta: string
  meetingCode: string
  inviteLink: string | null
  primaryAction: { label: string; onClick: () => void }
}

function MeetingCard({ title, meta, meetingCode, inviteLink, primaryAction }: MeetingCardProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-overlay">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Video className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{meta}</p>
          <p className="meeting-id mt-0.5 text-xs text-muted-foreground">
            {formatMeetingCode(meetingCode)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={primaryAction.onClick}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {primaryAction.label}
        </button>
        {inviteLink && (
          <CopyButton text={inviteLink} label={`Copy invite link for ${title}`} />
        )}
        <button
          aria-label="More options"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state / Skeleton / ErrorBanner
// ---------------------------------------------------------------------------

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 py-12 text-center">
      <Clock className="mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <div className="skeleton h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-1/3 rounded" />
        <div className="skeleton h-3 w-1/4 rounded" />
      </div>
      <div className="skeleton h-7 w-20 rounded-lg" />
    </div>
  )
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-danger/20 bg-danger/5 px-4 py-3">
      <p className="text-sm text-danger">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-4 text-xs font-medium text-danger underline underline-offset-2 hover:no-underline"
        >
          Retry
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ScheduleModal
// ---------------------------------------------------------------------------

interface ScheduleModalProps {
  onClose: () => void
  onSuccess: (meeting: MeetingOut) => void
}

function ScheduleModal({ onClose, onSuccess }: ScheduleModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { firstInputRef.current?.focus() }, [])

  useEffect(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000)
    setDate(d.toISOString().slice(0, 10))
    setTime(d.toTimeString().slice(0, 5))
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim() || !date || !time) return
    setLoading(true)
    setError(null)
    try {
      const scheduled_start_time = `${date}T${time}:00`
      const meeting = await apiFetch<MeetingOut>('/meetings/schedule', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null, scheduled_start_time, duration_minutes: duration }),
      })
      onSuccess(meeting)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const isValid = title.trim().length > 0 && date.length > 0 && time.length > 0

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="schedule-dialog-title" className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-150 rounded-2xl bg-card shadow-overlay">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="schedule-dialog-title" className="text-base font-semibold text-foreground">Schedule a Meeting</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <label htmlFor="sched-title" className="text-sm font-medium text-foreground">Title <span className="text-danger">*</span></label>
            <input ref={firstInputRef} id="sched-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Team Sync" maxLength={255} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sched-desc" className="text-sm font-medium text-foreground">Description</label>
            <textarea id="sched-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional agenda or notes" rows={2} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="sched-date" className="text-sm font-medium text-foreground">Date <span className="text-danger">*</span></label>
              <input id="sched-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sched-time" className="text-sm font-medium text-foreground">Time <span className="text-danger">*</span></label>
              <input id="sched-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sched-duration" className="text-sm font-medium text-foreground">Duration</label>
            <select id="sched-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {[15, 30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>{m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? 's' : ''}`}</option>
              ))}
            </select>
          </div>
          {error && <ErrorBanner message={error} />}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancel</button>
            <button type="submit" disabled={!isValid || loading} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {loading ? 'Scheduling…' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ScheduleSuccessBanner
// ---------------------------------------------------------------------------

function ScheduleSuccessBanner({ meeting, onDismiss }: { meeting: MeetingOut; onDismiss: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-success/30 bg-success/8 px-4 py-3">
      <div className="flex items-center gap-3">
        <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-foreground">Meeting scheduled!</p>
          <p className="text-xs text-muted-foreground">{meeting.title} · {formatDateTime(meeting.scheduled_start_time)}</p>
        </div>
      </div>
      <button onClick={onDismiss} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// JoinModal
// ---------------------------------------------------------------------------

interface JoinModalProps {
  onClose: () => void
}

function JoinModal({ onClose }: JoinModalProps) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [displayName, setDisplayName] = useState('Demo User')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function extractCode(raw: string): string {
    const cleaned = raw.trim().replace(/\s/g, '')
    const match = cleaned.match(/(\d{9})$/)
    return match ? match[1] : cleaned
  }

  async function handleJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const code = extractCode(input)
    if (!code || !displayName.trim()) return
    setLoading(true)
    setError(null)
    try {
      await apiFetch<MeetingOut>(`/meetings/${code}`)
      await apiFetch(`/meetings/${code}/join`, {
        method: 'POST',
        body: JSON.stringify({ display_name: displayName.trim() }),
      })
      router.push(`/meeting/${code}`)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  const isValid = input.trim().length > 0 && displayName.trim().length > 0

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="join-dialog-title" className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-sm animate-in fade-in zoom-in-95 duration-150 rounded-2xl bg-card shadow-overlay">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="join-dialog-title" className="text-base font-semibold text-foreground">Join a Meeting</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleJoin} className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <label htmlFor="join-code" className="text-sm font-medium text-foreground">Meeting ID or Link</label>
            <input ref={inputRef} id="join-code" type="text" value={input} onChange={(e) => { setInput(e.target.value); setError(null) }} placeholder="123 456 789" className={['w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', error ? 'border-danger' : 'border-input bg-background'].join(' ')} />
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="join-name" className="text-sm font-medium text-foreground">Your Name</label>
            <input id="join-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your display name" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancel</button>
            <button type="submit" disabled={!isValid || loading} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {loading ? 'Joining…' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page — 2-column layout with view-switching sidebar
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter()

  // ── Data state (unchanged) ────────────────────────────────────────────────
  const [upcoming, setUpcoming] = useState<MeetingOut[]>([])
  const [recent, setRecent] = useState<RecentMeetingOut[]>([])
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [upcomingError, setUpcomingError] = useState<string | null>(null)
  const [recentError, setRecentError] = useState<string | null>(null)

  // ── Action state (unchanged) ──────────────────────────────────────────────
  const [newMeetingLoading, setNewMeetingLoading] = useState(false)
  const [newMeetingError, setNewMeetingError] = useState<string | null>(null)

  // ── Modal & UI state (unchanged) ─────────────────────────────────────────
  const [showSchedule, setShowSchedule] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [scheduledMeeting, setScheduledMeeting] = useState<MeetingOut | null>(null)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'previous'>('upcoming')

  // ── Sidebar view state (new) ──────────────────────────────────────────────
  const [activeSidebarView, setActiveSidebarView] = useState<SidebarView>('home')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  function handleMobileNavigate(view: SidebarView) {
    setActiveSidebarView(view)
    setIsMobileMenuOpen(false)
  }

  // ── Data fetching (unchanged) ─────────────────────────────────────────────

  const fetchUpcoming = useCallback(async () => {
    setLoadingUpcoming(true)
    setUpcomingError(null)
    try {
      const data = await apiFetch<MeetingOut[]>('/meetings/upcoming')
      setUpcoming(data)
    } catch (err) {
      setUpcomingError((err as Error).message)
    } finally {
      setLoadingUpcoming(false)
    }
  }, [])

  const fetchRecent = useCallback(async () => {
    setLoadingRecent(true)
    setRecentError(null)
    try {
      const data = await apiFetch<RecentMeetingOut[]>('/meetings/recent')
      setRecent(data)
    } catch (err) {
      setRecentError((err as Error).message)
    } finally {
      setLoadingRecent(false)
    }
  }, [])

  useEffect(() => {
    fetchUpcoming()
    fetchRecent()
  }, [fetchUpcoming, fetchRecent])

  // ── Handlers (unchanged) ──────────────────────────────────────────────────

  async function handleNewMeeting() {
    if (newMeetingLoading) return
    setNewMeetingLoading(true)
    setNewMeetingError(null)
    try {
      const meeting = await apiFetch<MeetingOut>('/meetings/instant', { method: 'POST' })
      router.push(`/meeting/${meeting.meeting_code}`)
    } catch (err) {
      setNewMeetingError((err as Error).message)
      setNewMeetingLoading(false)
    }
  }

  function handleScheduleSuccess(meeting: MeetingOut) {
    setShowSchedule(false)
    setScheduledMeeting(meeting)
    // Switch to Meetings view so the new entry is immediately visible
    setActiveSidebarView('meetings')
    fetchUpcoming()
  }

  function openSchedule() {
    setScheduledMeeting(null)
    setShowSchedule(true)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // ─ Action button definitions shared by the Home view ─
  // iconBg uses Zoom brand colours: orange for "start meeting", blue for the rest
  const homeActions = [
    {
      label: 'New Meeting' as const,
      icon: newMeetingLoading
        ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        : <Video className="h-5 w-5" aria-hidden="true" />,
      onClick: handleNewMeeting,
      iconBg: '#ff742e',
      disabled: newMeetingLoading,
    },
    {
      label: 'Join' as const,
      icon: <Plus className="h-5 w-5" aria-hidden="true" />,
      onClick: () => setShowJoin(true),
      iconBg: '#0b5cff',
      disabled: false,
    },
    {
      label: 'Schedule' as const,
      icon: <Calendar className="h-5 w-5" aria-hidden="true" />,
      onClick: openSchedule,
      iconBg: '#0b5cff',
      disabled: false,
    },
    {
      label: 'Share Screen' as const,
      icon: <Monitor className="h-5 w-5" aria-hidden="true" />,
      onClick: () => {},
      iconBg: '#0b5cff',
      disabled: false,
    },
  ]

  return (
    <>
      {/* Modals */}
      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} onSuccess={handleScheduleSuccess} />}
      {showJoin     && <JoinModal onClose={() => setShowJoin(false)} />}

      {/* Fixed navbar */}
      <Navbar
        onSchedule={openSchedule}
        onJoin={() => setShowJoin(true)}
        onHost={handleNewMeeting}
        activeView={activeSidebarView}
        onNavigate={handleMobileNavigate}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen((open) => !open)}
      />

      {/* 2-column body below navbar */}
      <div className="flex h-[calc(100vh-var(--spacing-navbar,4rem))] overflow-hidden pt-[var(--spacing-navbar,4rem)]">

        {/* ── Left sidebar ───────────────────────────────────────────────────── */}
        <LeftSidebar activeView={activeSidebarView} onNavigate={setActiveSidebarView} />

        {/* ── Main content (scrollable) ──────────────────────────────────────── */}
        <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto">

          {/* ════════════════════════════════════════════════════════════════════
              HOME VIEW
              ════════════════════════════════════════════════════════════════════ */}
          {activeSidebarView === 'home' && (
            <div className="space-y-6 p-6">

              {/* Top row: Profile card (left) + Action tiles (right) */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">

                {/* Profile card */}
                <div className="flex-1 rounded-xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 text-lg font-semibold text-primary">
                        TN
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Teja Nayani</p>
                        <p className="text-sm text-muted-foreground">Plan: Basic</p>
                      </div>
                    </div>
                    <button className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      Manage Plan
                    </button>
                  </div>
                </div>

                {/* Action tiles — horizontal row, icon above text */}
                <div className="flex flex-shrink-0 gap-2">
                  {homeActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className="flex w-[78px] flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-foreground shadow-card transition-all hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {/* Icon circle uses the brand colour via inline style */}
                      <span
                        style={{ backgroundColor: action.iconBg }}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                      >
                        {action.icon}
                      </span>
                      <span className="text-center text-[11px] font-medium leading-tight">
                        {action.label === 'New Meeting' && newMeetingLoading ? 'Starting…' : action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* New meeting error */}
              {newMeetingError && (
                <ErrorBanner
                  message={`Failed to start meeting: ${newMeetingError}`}
                  onRetry={handleNewMeeting}
                />
              )}

              {/* Recent activity */}
              <div>
                <h2 className="mb-4 text-base font-semibold text-foreground">Recent activity</h2>

                {loadingRecent ? (
                  <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
                    <SkeletonRow /><SkeletonRow />
                  </div>
                ) : recent.length > 0 ? (
                  <div className="divide-y divide-border rounded-xl border border-border bg-card shadow-card">
                    {recent.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Video className="h-4 w-4 text-primary" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{r.meeting.title}</p>
                            <p className="text-xs text-muted-foreground">Joined {formatDateTime(r.joined_at)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => router.push(`/meeting/${r.meeting.meeting_code}`)}
                          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Start Again
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center shadow-card">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                      <Clock className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              MEETINGS VIEW
              ════════════════════════════════════════════════════════════════════ */}
          {activeSidebarView === 'meetings' && (
            <div className="p-6">

              {/* Success banner (shown after scheduling from any view) */}
              {scheduledMeeting && (
                <div className="mb-5">
                  <ScheduleSuccessBanner
                    meeting={scheduledMeeting}
                    onDismiss={() => setScheduledMeeting(null)}
                  />
                </div>
              )}

              {/* Section header */}
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-foreground">Meetings</h2>
                <button
                  onClick={openSchedule}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Schedule a Meeting
                </button>
              </div>

              {/* Tab bar */}
              <div className="mb-6 flex border-b border-border">
                {(['upcoming', 'previous'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={[
                      '-mb-px border-b-2 px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      activeTab === tab
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    ].join(' ')}
                  >
                    {tab === 'upcoming' ? 'Upcoming' : 'Previous'}
                  </button>
                ))}
              </div>

              {/* Upcoming tab content */}
              {activeTab === 'upcoming' && (
                loadingUpcoming ? (
                  <div className="space-y-3"><SkeletonRow /><SkeletonRow /></div>
                ) : upcomingError ? (
                  <ErrorBanner message={upcomingError} onRetry={fetchUpcoming} />
                ) : upcoming.length === 0 ? (
                  <EmptyState message="No upcoming meetings. Schedule one to get started." />
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((m) => (
                      <MeetingCard
                        key={m.id}
                        title={m.title}
                        meta={`${formatDateTime(m.scheduled_start_time)}${durationLabel(m.duration_minutes)}`}
                        meetingCode={m.meeting_code}
                        inviteLink={m.invite_link}
                        primaryAction={{ label: 'Start', onClick: () => router.push(`/meeting/${m.meeting_code}`) }}
                      />
                    ))}
                  </div>
                )
              )}

              {/* Previous tab content */}
              {activeTab === 'previous' && (
                loadingRecent ? (
                  <div className="space-y-3"><SkeletonRow /><SkeletonRow /></div>
                ) : recentError ? (
                  <ErrorBanner message={recentError} onRetry={fetchRecent} />
                ) : recent.length === 0 ? (
                  <EmptyState message="No previous meetings yet." />
                ) : (
                  <div className="space-y-3">
                    {recent.map((r) => (
                      <MeetingCard
                        key={r.id}
                        title={r.meeting.title}
                        meta={`Joined ${formatDateTime(r.joined_at)}`}
                        meetingCode={r.meeting.meeting_code}
                        inviteLink={r.meeting.invite_link}
                        primaryAction={{ label: 'Start Again', onClick: () => router.push(`/meeting/${r.meeting.meeting_code}`) }}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          )}

        </main>
      </div>
    </>
  )
}
