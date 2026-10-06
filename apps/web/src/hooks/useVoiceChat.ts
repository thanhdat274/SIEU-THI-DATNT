/**
 * useVoiceChat — voice P2P (WebRTC, chỉ audio) giữa hai thành viên cùng hẻm.
 * Server WebSocket chỉ chuyển tiếp offer/answer/candidate; âm thanh đi thẳng giữa hai trình duyệt.
 * Chỉ dùng STUN công cộng (đổi bằng VITE_ICE_SERVERS); chưa có TURN nên một số cặp sau NAT đối xứng sẽ không nối được.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createSpeakingDetector, describeMicError, isOfferer, parseIceServers, rmsLevel } from '../voice-utils';

export type VoiceStatus = 'waiting' | 'connecting' | 'connected' | 'failed';
type SignalKind = 'offer' | 'answer' | 'candidate';

export interface VoiceChatOptions {
  /** accountId của mình; null khi chưa online. */
  selfId: string | null;
  /** WebSocket của hẻm đang mở. */
  connected: boolean;
  sendSignal: (kind: SignalKind, payload: object) => boolean;
}

const CONNECT_TIMEOUT_MS = 15_000;
const METER_INTERVAL_MS = 100;

interface Meter { analyser: AnalyserNode; source: MediaStreamAudioSourceNode; buffer: Uint8Array<ArrayBuffer>; detect: ReturnType<typeof createSpeakingDetector> }

export function useVoiceChat({ selfId, connected, sendSignal }: VoiceChatOptions) {
  const [status, setStatus] = useState<VoiceStatus>('waiting');
  const [partnerPresent, setPartnerPresent] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);
  const [needsPlayGesture, setNeedsPlayGesture] = useState(false);

  const selfIdRef = useRef(selfId);
  const sendSignalRef = useRef(sendSignal);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const transceiverRef = useRef<RTCRtpTransceiver | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ICE quá lâu không tìm được đường nối (STUN-only thường gặp khi cả hai sau NAT đối xứng).
  const iceFailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iceFailTimerActiveRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const remoteMutedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const localMeterRef = useRef<Meter | null>(null);
  const remoteMeterRef = useRef<Meter | null>(null);
  const iceServersRef = useRef<RTCIceServer[] | null>(null);

  useEffect(() => { selfIdRef.current = selfId; }, [selfId]);
  useEffect(() => { sendSignalRef.current = sendSignal; }, [sendSignal]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioContextRef.current = new Ctor();
    }
    return audioContextRef.current;
  }, []);

  const makeMeter = useCallback((stream: MediaStream): Meter | null => {
    const context = getAudioContext();
    if (!context) return null;
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser); // không nối ra loa: tránh phát lại tiếng của chính mình
    return { analyser, source, buffer: new Uint8Array(new ArrayBuffer(analyser.fftSize)), detect: createSpeakingDetector() };
  }, [getAudioContext]);

  const dropMeter = (ref: { current: Meter | null }) => {
    const meter = ref.current;
    if (!meter) return;
    try { meter.source.disconnect(); meter.analyser.disconnect(); } catch { /* đã ngắt */ }
    ref.current = null;
  };

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (iceFailTimerRef.current) { clearTimeout(iceFailTimerRef.current); iceFailTimerRef.current = null; }
    iceFailTimerActiveRef.current = false;
  }, []);

  /** Báo lỗi kết nối voice rõ ràng hơn: lý do hay gặp nhất là cần TURN relay khi ICE không tìm được đường trực tiếp. */
  const failWithReason = useCallback(() => {
    if (!pcRef.current) return;
    clearTimer();
    const hasTurn = (iceServersRef.current ?? []).some(srv =>
      (typeof srv.urls === 'string' ? [srv.urls] : srv.urls ?? []).some(url => url.startsWith('turn:') || url.startsWith('turns:'))
    );
    if (!hasTurn) {
      setMicError('Không kết nối được voice: chưa cấu hình TURN relay nên không tìm được đường nối qua mạng/NAT. Cần bổ sung TURN server (xem docs/deploy.md).');
    } else {
      setMicError('Không kết nối được voice ngay cả khi đã có TURN. Bấm "Thử lại" hoặc kiểm tra mạng/HTTPS.');
    }
    setStatus('failed');
  }, [clearTimer]);

  /** Đóng kết nối tới người kia; giữ nguyên mic cục bộ để nối lại khi họ vào lại. */
  const closePeer = useCallback(() => {
    clearTimer();
    const pc = pcRef.current;
    pcRef.current = null;
    transceiverRef.current = null;
    pendingCandidatesRef.current = [];
    if (pc) {
      pc.onicecandidate = null; pc.ontrack = null; pc.onconnectionstatechange = null; pc.oniceconnectionstatechange = null;
      try { pc.close(); } catch { /* đã đóng */ }
    }
    if (audioRef.current) { audioRef.current.srcObject = null; }
    dropMeter(remoteMeterRef);
    setRemoteSpeaking(false);
    setNeedsPlayGesture(false);
  }, [clearTimer]);

  /** Dừng hẳn mic và giải phóng mọi thứ (socket đóng, rời hẻm, unmount). */
  const stopAll = useCallback(() => {
    closePeer();
    peerIdRef.current = null;
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    dropMeter(localMeterRef);
    if (audioContextRef.current) { void audioContextRef.current.close().catch(() => undefined); audioContextRef.current = null; }
    setPartnerPresent(false);
    setMicOn(false);
    setLocalSpeaking(false);
    setStatus('waiting');
  }, [closePeer]);

  const createPeer = useCallback((peerId: string): RTCPeerConnection => {
    closePeer();
    setMicError(null);
    if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
      setMicError('Trình duyệt/webview này không hỗ trợ WebRTC nên không nói chuyện được qua mic. Hãy mở trên trình duyệt hiện đại (Chrome/Firefox/Safari).');
      setStatus('failed');
      throw new Error('WebRTC không được hỗ trợ');
    }
    iceServersRef.current ??= parseIceServers(import.meta.env.VITE_ICE_SERVERS as string | undefined);
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    pcRef.current = pc;
    peerIdRef.current = peerId;
    setStatus('connecting');
    // Transceiver sendrecv dựng sẵn: nghe được người kia dù mình chưa bật mic, bật mic sau chỉ cần replaceTrack (không đàm phán lại).
    const transceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
    transceiverRef.current = transceiver;
    const localTrack = localStreamRef.current?.getAudioTracks()[0];
    if (localTrack) void transceiver.sender.replaceTrack(localTrack);

    pc.onicecandidate = event => {
      if (event.candidate) sendSignalRef.current('candidate', event.candidate.toJSON());
    };
    pc.ontrack = event => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      const audio = audioRef.current ?? (audioRef.current = new Audio());
      audio.autoplay = true;
      audio.muted = remoteMutedRef.current;
      audio.srcObject = stream;
      audio.play().then(() => setNeedsPlayGesture(false)).catch(() => setNeedsPlayGesture(true));
      dropMeter(remoteMeterRef);
      remoteMeterRef.current = makeMeter(stream);
      void audioContextRef.current?.resume().catch(() => undefined);
    };
    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return;
      if (pc.connectionState === 'connected') { clearTimer(); setStatus('connected'); }
      else if (pc.connectionState === 'failed') { clearTimer(); failWithReason(); }
      else if (pc.connectionState === 'disconnected') setStatus('connecting');
    };
    // Một số trình duyệt báo ICE failed trong khi connectionState vẫn 'connecting' tới lúc timeout.
    // Bắt sớm để người chơi biết ngay và có lời khuyên về TURN.
    pc.oniceconnectionstatechange = () => {
      if (pcRef.current !== pc) return;
      const ice = pc.iceConnectionState;
      if (ice === 'connected' || ice === 'completed') { clearTimer(); setStatus('connected'); }
      else if (ice === 'failed') { clearTimer(); failWithReason(); }
    };
    timeoutRef.current = setTimeout(() => {
      if (pcRef.current === pc && pc.connectionState !== 'connected' && pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
        clearTimer();
        failWithReason();
      }
    }, CONNECT_TIMEOUT_MS);
    // ICE gathering nhanh chóng kết bằng 'failed' nhưng browser không bắn luôn; áp trần phụ.
    iceFailTimerRef.current = setTimeout(() => {
      if (pcRef.current !== pc) return;
      if (pc.connectionState !== 'connected' && (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected')) {
        failWithReason();
      }
    }, CONNECT_TIMEOUT_MS + 2000);
    iceFailTimerActiveRef.current = true;
    return pc;
  }, [closePeer, makeMeter, failWithReason, clearTimer]);

  const startOffer = useCallback(async (peerId: string) => {
    const pc = createPeer(peerId);
    try {
      const offer = await pc.createOffer();
      if (pcRef.current !== pc) return;
      await pc.setLocalDescription(offer);
      sendSignalRef.current('offer', { type: offer.type, sdp: offer.sdp });
    } catch (error) {
      console.warn('[voice] không tạo được offer:', error);
      if (pcRef.current === pc) setStatus('failed');
    }
  }, [createPeer]);

  const flushCandidates = async (pc: RTCPeerConnection) => {
    const pending = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of pending) {
      try { await pc.addIceCandidate(candidate); } catch { /* candidate cũ hoặc đã đóng */ }
    }
  };

  /** Người kia vào/ra hẻm. present=true lặp lại (cùng tài khoản đổi phiên) nghĩa là dựng lại kết nối. */
  const onPeer = useCallback((data: unknown) => {
    if (!data || typeof data !== 'object') return;
    const { accountId, present } = data as { accountId?: unknown; present?: unknown };
    const self = selfIdRef.current;
    if (typeof accountId !== 'string' || typeof present !== 'boolean' || !self || accountId === self) return;
    if (!present) {
      if (peerIdRef.current === accountId) { closePeer(); peerIdRef.current = null; }
      setPartnerPresent(false);
      setStatus('waiting');
      return;
    }
    setPartnerPresent(true);
    peerIdRef.current = accountId;
    closePeer();
    setStatus('connecting');
    if (isOfferer(self, accountId)) void startOffer(accountId);
  }, [closePeer, startOffer]);

  const onSignal = useCallback(async (data: unknown) => {
    if (!data || typeof data !== 'object') return;
    const { from, kind, payload } = data as { from?: unknown; kind?: unknown; payload?: unknown };
    const self = selfIdRef.current;
    if (typeof from !== 'string' || !self || from === self || !payload || typeof payload !== 'object') return;
    try {
      if (kind === 'offer') {
        // Offer mới luôn dựng lại kết nối (bên kia vừa vào lại hoặc bấm thử lại).
        setPartnerPresent(true);
        const pc = createPeer(from);
        await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
        await flushCandidates(pc);
        const answer = await pc.createAnswer();
        if (pcRef.current !== pc) return;
        await pc.setLocalDescription(answer);
        sendSignalRef.current('answer', { type: answer.type, sdp: answer.sdp });
      } else if (kind === 'answer') {
        const pc = pcRef.current;
        if (!pc || peerIdRef.current !== from || pc.signalingState !== 'have-local-offer') return;
        await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
        await flushCandidates(pc);
      } else if (kind === 'candidate') {
        const pc = pcRef.current;
        if (peerIdRef.current !== from) return;
        if (pc?.remoteDescription) await pc.addIceCandidate(payload as RTCIceCandidateInit);
        else pendingCandidatesRef.current.push(payload as RTCIceCandidateInit);
      }
    } catch (error) {
      console.warn('[voice] xử lý tín hiệu lỗi:', error);
      if (kind !== 'candidate') setStatus('failed');
    }
  }, [createPeer]);

  const toggleMic = useCallback(async () => {
    setMicError(null);
    const existing = localStreamRef.current?.getAudioTracks()[0];
    if (existing) {
      existing.enabled = !existing.enabled;
      setMicOn(existing.enabled);
      if (!existing.enabled) setLocalSpeaking(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) { setMicError(describeMicError(undefined, false)); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      localStreamRef.current = stream;
      const track = stream.getAudioTracks()[0];
      if (transceiverRef.current && track) await transceiverRef.current.sender.replaceTrack(track);
      dropMeter(localMeterRef);
      localMeterRef.current = makeMeter(stream);
      void audioContextRef.current?.resume().catch(() => undefined);
      setMicOn(true);
    } catch (error) {
      setMicError(describeMicError(error, true));
    }
  }, [makeMeter]);

  const toggleRemoteMute = useCallback(() => {
    remoteMutedRef.current = !remoteMutedRef.current;
    if (audioRef.current) audioRef.current.muted = remoteMutedRef.current;
    setRemoteMuted(remoteMutedRef.current);
  }, []);

  /** Thử lại thủ công: tự làm bên gọi (offer); bên kia dựng lại khi nhận offer mới. */
  const retry = useCallback(() => {
    const peerId = peerIdRef.current;
    if (peerId) void startOffer(peerId);
  }, [startOffer]);

  /** Trình duyệt chặn autoplay: bấm để nghe. */
  const resumePlayback = useCallback(() => {
    void audioContextRef.current?.resume().catch(() => undefined);
    audioRef.current?.play().then(() => setNeedsPlayGesture(false)).catch(() => setNeedsPlayGesture(true));
  }, []);

  // Socket đóng hoặc rời màn: dừng hẳn mic và đóng kết nối.
  useEffect(() => {
    if (!connected) stopAll();
  }, [connected, stopAll]);
  useEffect(() => stopAll, [stopAll]);

  // Chỉ báo đang nói: lấy mẫu âm lượng định kỳ khi có kết nối hoặc mic.
  useEffect(() => {
    if (!micOn && !partnerPresent) return;
    const timer = setInterval(() => {
      const now = performance.now();
      const read = (meter: Meter | null, enabled: boolean) => {
        if (!meter || !enabled) return false;
        meter.analyser.getByteTimeDomainData(meter.buffer);
        return meter.detect.update(rmsLevel(meter.buffer), now);
      };
      const micTrackOn = localStreamRef.current?.getAudioTracks()[0]?.enabled ?? false;
      setLocalSpeaking(read(localMeterRef.current, micTrackOn));
      setRemoteSpeaking(read(remoteMeterRef.current, true));
    }, METER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [micOn, partnerPresent]);

  // AudioContext có thể bị trình duyệt tạm dừng cho tới khi có thao tác người dùng.
  useEffect(() => {
    if (!partnerPresent && !micOn) return;
    const resume = () => { void audioContextRef.current?.resume().catch(() => undefined); };
    window.addEventListener('pointerdown', resume, { once: true });
    return () => window.removeEventListener('pointerdown', resume);
  }, [partnerPresent, micOn]);

  return {
    status, partnerPresent, micOn, micError, remoteMuted, localSpeaking, remoteSpeaking, needsPlayGesture,
    toggleMic, toggleRemoteMute, retry, resumePlayback, onSignal, onPeer,
  };
}
