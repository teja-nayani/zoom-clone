import { useCallback, useEffect, useRef, useState } from 'react'

export type WsStatus = 'connecting' | 'open' | 'closed' | 'error'

export interface WsMessage {
  type: string
  payload: Record<string, unknown>
}

export interface UseWebSocketReturn {
  /** Current connection state. */
  status: WsStatus
  /** Send a structured message to the server. No-ops if the socket is not open. */
  sendMessage: (msg: WsMessage) => void
  /** The most recently received message (parsed JSON), or null. */
  lastMessage: WsMessage | null
  /** Subscribe to every inbound message (avoids dropping rapid back-to-back events). */
  subscribeToMessages: (listener: (msg: WsMessage) => void) => () => void
}

const WS_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000').replace(
  /^http/,
  'ws',
)

/**
 * Opens a WebSocket connection to the signaling server for a specific meeting room.
 *
 * Connection URL: ws://localhost:8000/ws/{meetingCode}/{clientId}?display_name={displayName}
 *
 * Reconnects automatically when meetingCode, clientId, or displayName change.
 * Closes cleanly on unmount.
 */
export function useWebSocket(
  meetingCode: string,
  clientId: string,
  displayName: string,
): UseWebSocketReturn {
  const [status, setStatus] = useState<WsStatus>('connecting')
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const listenersRef = useRef(new Set<(msg: WsMessage) => void>())
  const pendingMessagesRef = useRef<WsMessage[]>([])

  const subscribeToMessages = useCallback((listener: (msg: WsMessage) => void) => {
    listenersRef.current.add(listener)
    // Replay messages that arrived before the listener subscribed (refresh race).
    const pending = pendingMessagesRef.current.splice(0)
    pending.forEach((msg) => listener(msg))
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  useEffect(() => {
    if (!meetingCode || !clientId) return

    let disposed = false
    pendingMessagesRef.current = []
    const url = `${WS_BASE}/ws/${meetingCode}/${clientId}?display_name=${encodeURIComponent(displayName)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (disposed) return
      setStatus('open')
      console.log(`[WS] Connected to room ${meetingCode} as ${clientId}`)
    }

    ws.onclose = (ev) => {
      if (disposed) return
      setStatus('closed')
      console.log(`[WS] Disconnected from room ${meetingCode} (code ${ev.code})`)
    }

    ws.onerror = () => {
      if (disposed) return
      setStatus('error')
      console.error('[WS] Connection error')
    }

    ws.onmessage = (ev) => {
      if (disposed) return
      try {
        const data = JSON.parse(ev.data) as WsMessage
        console.log(`[WS] ← ${data.type}`, data.payload)
        setLastMessage(data)
        if (listenersRef.current.size === 0) {
          pendingMessagesRef.current.push(data)
        } else {
          listenersRef.current.forEach((listener) => listener(data))
        }
      } catch {
        console.warn('[WS] Received non-JSON message:', ev.data)
      }
    }

    return () => {
      disposed = true
      ws.close(1000, 'Component unmounted')
      wsRef.current = null
    }
  }, [meetingCode, clientId, displayName])

  const sendMessage = useCallback((msg: WsMessage) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      const raw = JSON.stringify(msg)
      ws.send(raw)
      console.log(`[WS] → ${msg.type}`, msg.payload)
    } else {
      console.warn('[WS] sendMessage called but socket is not open:', ws?.readyState)
    }
  }, [])

  return { status, sendMessage, lastMessage, subscribeToMessages }
}
