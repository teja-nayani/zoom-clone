import { useCallback, useEffect, useRef, useState } from 'react'
import type { WsMessage, WsStatus } from './useWebSocket'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

interface PeerEntry {
  pc: RTCPeerConnection
  pendingCandidates: RTCIceCandidateInit[]
  hasRemoteDescription: boolean
}

interface PendingOffer {
  fromId: string
  sdp: RTCSessionDescriptionInit
}

export interface RemoteParticipant {
  clientId: string
  displayName: string
  stream: MediaStream
}

export interface UseWebRTCReturn {
  remoteParticipants: RemoteParticipant[]
  isRemovedFromMeeting: boolean
  replaceLocalVideoTrack: (newTrack: MediaStreamTrack | null) => Promise<void>
}

/**
 * Mesh WebRTC with a single offer direction per (re)join:
 *   • The NEW joiner always offers to everyone already in the room.
 *   • Existing participants only answer — never initiate on participant-joined.
 *
 * This avoids offer collisions that cause intermittent failures after refresh.
 */
export function useWebRTC(
  myClientId: string,
  localStream: MediaStream | null,
  wsStatus: WsStatus,
  sendMessage: (msg: WsMessage) => void,
  subscribeToMessages: (listener: (msg: WsMessage) => void) => () => void,
): UseWebRTCReturn {
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([])
  const [isRemovedFromMeeting, setIsRemovedFromMeeting] = useState(false)

  const pcsRef = useRef<Map<string, PeerEntry>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const sendMessageRef = useRef(sendMessage)
  const displayNamesRef = useRef<Map<string, string>>(new Map())
  /** Peers the joiner must offer to once media is ready. */
  const pendingJoinOffersRef = useRef<Map<string, string>>(new Map())
  /** Offers received before media was ready — answered once stream exists. */
  const pendingAnswersRef = useRef<PendingOffer[]>([])
  /** ICE candidates that arrived before the peer connection existed. */
  const earlyCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const closePCRef = useRef<(id: string) => void>(() => {})

  useEffect(() => { localStreamRef.current = localStream }, [localStream])
  useEffect(() => { sendMessageRef.current = sendMessage }, [sendMessage])

  useEffect(() => {
    return () => {
      pcsRef.current.forEach((entry) => {
        entry.pc.ontrack = null
        entry.pc.onicecandidate = null
        entry.pc.onconnectionstatechange = null
        entry.pc.close()
      })
      pcsRef.current.clear()
    }
  }, [])

  const closePeerConnection = useCallback((clientId: string) => {
    const entry = pcsRef.current.get(clientId)
    if (entry) {
      entry.pc.ontrack = null
      entry.pc.onicecandidate = null
      entry.pc.onconnectionstatechange = null
      entry.pc.close()
      pcsRef.current.delete(clientId)
    }
    setRemoteParticipants((prev) => prev.filter((p) => p.clientId !== clientId))
    displayNamesRef.current.delete(clientId)
    pendingJoinOffersRef.current.delete(clientId)
    earlyCandidatesRef.current.delete(clientId)
  }, [])

  useEffect(() => { closePCRef.current = closePeerConnection }, [closePeerConnection])

  const createPeerConnection = useCallback((remoteClientId: string): RTCPeerConnection => {
    const stale = pcsRef.current.get(remoteClientId)
    if (stale) {
      stale.pc.close()
      pcsRef.current.delete(remoteClientId)
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcsRef.current.set(remoteClientId, { pc, pendingCandidates: [], hasRemoteDescription: false })

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!)
    })

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return
      sendMessageRef.current({
        type: 'ice-candidate',
        payload: { target: remoteClientId, candidate: candidate.toJSON() },
      })
    }

    pc.ontrack = ({ streams }) => {
      const remoteStream = streams[0]
      if (!remoteStream) return
      const displayName = displayNamesRef.current.get(remoteClientId) ?? 'Participant'
      setRemoteParticipants((prev) => [
        ...prev.filter((p) => p.clientId !== remoteClientId),
        { clientId: remoteClientId, displayName, stream: remoteStream },
      ])
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        closePCRef.current(remoteClientId)
      }
    }

    return pc
  }, [])

  async function drainPendingCandidates(entry: PeerEntry): Promise<void> {
    entry.hasRemoteDescription = true
    const queued = entry.pendingCandidates.splice(0)
    for (const init of queued) {
      await entry.pc
        .addIceCandidate(new RTCIceCandidate(init))
        .catch((e) => console.warn('[WebRTC] addIceCandidate (drained) failed:', e))
    }
  }

  function drainEarlyCandidates(remoteClientId: string, entry: PeerEntry): void {
    const early = earlyCandidatesRef.current.get(remoteClientId) ?? []
    earlyCandidatesRef.current.delete(remoteClientId)
    early.forEach((init) => {
      if (entry.hasRemoteDescription) {
        entry.pc.addIceCandidate(new RTCIceCandidate(init))
          .catch((e) => console.warn('[WebRTC] addIceCandidate (early) failed:', e))
      } else {
        entry.pendingCandidates.push(init)
      }
    })
  }

  const sendOfferTo = useCallback((targetId: string, pc: RTCPeerConnection) => {
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        if (!pc.localDescription) return
        sendMessageRef.current({
          type: 'offer',
          payload: { target: targetId, sdp: pc.localDescription.toJSON() },
        })
      })
      .catch((err) => console.error(`[WebRTC] createOffer → ${targetId} failed:`, err))
  }, [])

  /** Joiner role: always create the offer to an existing room member. */
  const offerToExistingPeer = useCallback((remoteClientId: string, displayName: string) => {
    if (remoteClientId === myClientId) return
    if (pcsRef.current.has(remoteClientId)) return

    displayNamesRef.current.set(remoteClientId, displayName)

    if (!localStreamRef.current) {
      pendingJoinOffersRef.current.set(remoteClientId, displayName)
      return
    }

    const pc = createPeerConnection(remoteClientId)
    drainEarlyCandidates(remoteClientId, pcsRef.current.get(remoteClientId)!)
    sendOfferTo(remoteClientId, pc)
  }, [myClientId, createPeerConnection, sendOfferTo])

  const handleIncomingOffer = useCallback((fromId: string, sdp: RTCSessionDescriptionInit) => {
    if (!localStreamRef.current) {
      pendingAnswersRef.current.push({ fromId, sdp })
      return
    }

    if (pcsRef.current.has(fromId)) {
      closePCRef.current(fromId)
    }

    const pc = createPeerConnection(fromId)
    const entry = pcsRef.current.get(fromId)!
    drainEarlyCandidates(fromId, entry)

    pc.setRemoteDescription(new RTCSessionDescription(sdp))
      .then(async () => {
        const current = pcsRef.current.get(fromId)
        if (current) await drainPendingCandidates(current)
        return pc.createAnswer()
      })
      .then((answer) => pc.setLocalDescription(answer))
      .then(() => {
        if (!pc.localDescription) return
        sendMessageRef.current({
          type: 'answer',
          payload: { target: fromId, sdp: pc.localDescription.toJSON() },
        })
      })
      .catch((err) => console.error('[WebRTC] handle offer failed:', err))
  }, [createPeerConnection])

  const flushPendingJoinOffers = useCallback(() => {
    pendingJoinOffersRef.current.forEach((displayName, remoteClientId) => {
      if (pcsRef.current.has(remoteClientId)) return
      displayNamesRef.current.set(remoteClientId, displayName)
      const pc = createPeerConnection(remoteClientId)
      drainEarlyCandidates(remoteClientId, pcsRef.current.get(remoteClientId)!)
      sendOfferTo(remoteClientId, pc)
    })
    pendingJoinOffersRef.current.clear()
  }, [createPeerConnection, sendOfferTo])

  const flushPendingAnswers = useCallback(() => {
    const queued = pendingAnswersRef.current.splice(0)
    queued.forEach(({ fromId, sdp }) => handleIncomingOffer(fromId, sdp))
  }, [handleIncomingOffer])

  // When media becomes ready, attach tracks and flush deferred signaling.
  useEffect(() => {
    if (!localStream) return

    pcsRef.current.forEach((entry, remoteClientId) => {
      const pc = entry.pc
      let addedTrack = false

      localStream.getTracks().forEach((track) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === track.kind)
        if (sender) {
          void sender.replaceTrack(track)
        } else {
          pc.addTrack(track, localStream)
          addedTrack = true
        }
      })

      if (addedTrack && pc.signalingState === 'stable') {
        sendOfferTo(remoteClientId, pc)
      }
    })

    flushPendingJoinOffers()
    flushPendingAnswers()
  }, [localStream, sendOfferTo, flushPendingJoinOffers, flushPendingAnswers])

  // Re-request room snapshot after connect + media, with retries for refresh races.
  useEffect(() => {
    if (wsStatus !== 'open' || !localStream) return

    const sendSync = () => sendMessageRef.current({ type: 'sync-room', payload: {} })
    sendSync()
    const retry1 = window.setTimeout(sendSync, 1500)
    const retry2 = window.setTimeout(sendSync, 4000)

    return () => {
      window.clearTimeout(retry1)
      window.clearTimeout(retry2)
    }
  }, [wsStatus, localStream])

  const handleSignalingMessage = useCallback((msg: WsMessage) => {
    const { type, payload } = msg

    switch (type) {
      case 'existing-participants': {
        const peers = payload.participants as Array<{
          client_id: string
          display_name: string
        }> | undefined
        peers?.forEach(({ client_id, display_name }) => {
          offerToExistingPeer(client_id, display_name)
        })
        break
      }

      case 'participant-joined': {
        const joinerId = payload.client_id as string
        const joinerName = (payload.display_name as string) ?? 'Participant'
        const roomList = payload.participants as
          | Array<{ client_id: string; display_name: string }>
          | undefined

        roomList?.forEach((p) => {
          if (p.client_id !== myClientId) {
            displayNamesRef.current.set(p.client_id, p.display_name)
          }
        })
        displayNamesRef.current.set(joinerId, joinerName)
        // Existing participants never offer — the joiner will offer us.
        break
      }

      case 'offer':
        handleIncomingOffer(payload.from as string, payload.sdp as RTCSessionDescriptionInit)
        break

      case 'answer': {
        const fromId = payload.from as string
        const sdp = payload.sdp as RTCSessionDescriptionInit
        const entry = pcsRef.current.get(fromId)
        if (!entry) return

        entry.pc
          .setRemoteDescription(new RTCSessionDescription(sdp))
          .then(() => drainPendingCandidates(entry))
          .catch((err) => console.error('[WebRTC] setRemoteDescription (answer) failed:', err))
        break
      }

      case 'ice-candidate': {
        const fromId = payload.from as string
        const candidateInit = payload.candidate as RTCIceCandidateInit
        const entry = pcsRef.current.get(fromId)

        if (!entry) {
          const queued = earlyCandidatesRef.current.get(fromId) ?? []
          queued.push(candidateInit)
          earlyCandidatesRef.current.set(fromId, queued)
          return
        }

        if (entry.hasRemoteDescription) {
          entry.pc
            .addIceCandidate(new RTCIceCandidate(candidateInit))
            .catch((e) => console.warn('[WebRTC] addIceCandidate failed:', e))
        } else {
          entry.pendingCandidates.push(candidateInit)
        }
        break
      }

      case 'participant-left': {
        const leftId = payload.client_id as string
        if (leftId !== myClientId) closePeerConnection(leftId)
        break
      }

      case 'removed-from-meeting':
        setIsRemovedFromMeeting(true)
        break

      case 'host-muted-you':
        localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = false })
        break

      default:
        break
    }
  }, [myClientId, offerToExistingPeer, handleIncomingOffer, closePeerConnection])

  useEffect(() => subscribeToMessages(handleSignalingMessage), [subscribeToMessages, handleSignalingMessage])

  const replaceLocalVideoTrack = useCallback(async (newTrack: MediaStreamTrack | null): Promise<void> => {
    if (!newTrack) return
    await Promise.all(
      [...pcsRef.current.values()].map((entry) => {
        const sender = entry.pc.getSenders().find((s) => s.track?.kind === 'video')
        return sender
          ? sender.replaceTrack(newTrack).catch((e) => console.warn('[WebRTC] replaceTrack failed:', e))
          : Promise.resolve()
      }),
    )
  }, [])

  return { remoteParticipants, isRemovedFromMeeting, replaceLocalVideoTrack }
}
