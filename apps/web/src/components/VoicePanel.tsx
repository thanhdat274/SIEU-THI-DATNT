import React from 'react';
import type { VoiceStatus } from '../hooks/useVoiceChat';

interface VoicePanelProps {
  status: VoiceStatus;
  partnerPresent: boolean;
  micOn: boolean;
  micError: string | null;
  remoteMuted: boolean;
  localSpeaking: boolean;
  remoteSpeaking: boolean;
  needsPlayGesture: boolean;
  onToggleMic: () => void;
  onToggleRemoteMute: () => void;
  onRetry: () => void;
  onResumePlayback: () => void;
}

const STATUS_TEXT: Record<VoiceStatus, string> = {
  waiting: 'Chờ người kia vào hẻm',
  connecting: 'Đang kết nối voice…',
  connected: 'Voice đã kết nối',
  failed: 'Voice chưa nối được',
};

/** Bảng điều khiển voice chat trong hẻm chung: bật/tắt mic, tắt tiếng người kia, chỉ báo đang nói, trạng thái kết nối. */
export const VoicePanel: React.FC<VoicePanelProps> = ({
  status, partnerPresent, micOn, micError, remoteMuted, localSpeaking, remoteSpeaking, needsPlayGesture,
  onToggleMic, onToggleRemoteMute, onRetry, onResumePlayback,
}) => (
  <div className="voice-panel" role="group" aria-label="Voice chat">
    <div className="voice-controls">
      <button
        type="button"
        className={`voice-btn${micOn ? ' is-on' : ''}${localSpeaking ? ' is-speaking' : ''}`}
        onClick={onToggleMic}
        aria-pressed={micOn}
        aria-label={micOn ? 'Tắt mic' : 'Bật mic'}
        title={micOn ? 'Tắt mic' : 'Bật mic'}
      >{micOn ? '🎤' : '🔇'}</button>
      <button
        type="button"
        className={`voice-btn${remoteSpeaking && !remoteMuted ? ' is-speaking' : ''}`}
        onClick={onToggleRemoteMute}
        disabled={!partnerPresent}
        aria-pressed={remoteMuted}
        aria-label={remoteMuted ? 'Bật tiếng người kia' : 'Tắt tiếng người kia'}
        title={remoteMuted ? 'Bật tiếng người kia' : 'Tắt tiếng người kia'}
      >{remoteMuted ? '🔈' : '🔊'}</button>
      <span className={`voice-status voice-status-${status}`} aria-live="polite" title={STATUS_TEXT[status]}>{STATUS_TEXT[status]}</span>
      {status === 'failed' && <button type="button" className="voice-link" onClick={onRetry}>Thử lại</button>}
      {needsPlayGesture && <button type="button" className="voice-link" onClick={onResumePlayback}>Bấm để nghe</button>}
    </div>
    {micError && <p className="voice-error" role="alert" title={micError}>{micError}</p>}
  </div>
);
