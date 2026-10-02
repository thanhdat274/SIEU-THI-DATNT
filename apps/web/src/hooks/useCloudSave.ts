/**
 * useCloudSave — tải/đẩy bản lưu cloud của tài khoản đang đăng nhập (tách khỏi hẻm online).
 * Không tự ghi đè: người chơi chọn tải hoặc đẩy; thiết bị khác đã ghi thì dừng ở 409 để hỏi lại.
 */
import { useCallback, useEffect, useState } from 'react';
import type { SaveGameData } from '@game/shared';
import { validateSaveGameData } from '@game/shared';
import { getCloudSave, isCloudConflict, putCloudSave, type CloudSaveSummary } from '../services/api';

export interface CloudSaveState {
  signedIn: boolean;
  busy: boolean;
  /** undefined = chưa kiểm tra; null = tài khoản chưa có bản cloud. */
  remote: CloudSaveSummary | null | undefined;
  message: string;
  failed: boolean;
  /** Lần đẩy vừa rồi bị 409: cho phép người chơi chọn ghi đè. */
  conflict: boolean;
}

export interface UseCloudSaveOptions {
  enabled: boolean;
  exportLocal: () => SaveGameData | undefined;
  /** Áp bản cloud vào máy (giữ bản cũ làm backup). */
  importSave: (save: SaveGameData) => Promise<boolean>;
}

const seenKey = (uid: string) => `cloud_save_seen_${uid}`;
const readSeen = (uid: string): string | null => { try { return localStorage.getItem(seenKey(uid)); } catch { return null; } };
const writeSeen = (uid: string, value: string) => { try { localStorage.setItem(seenKey(uid), value); } catch { /* chế độ riêng tư */ } };

const NEED_LOGIN = 'Hãy đăng nhập Google để dùng cloud.';

export function useCloudSave({ enabled, exportLocal, importSave }: UseCloudSaveOptions) {
  const [state, setState] = useState<CloudSaveState>({ signedIn: false, busy: false, remote: undefined, message: '', failed: false, conflict: false });
  const patch = useCallback((next: Partial<CloudSaveState>) => setState(prev => ({ ...prev, ...next })), []);

  const auth = useCallback(async () => {
    try {
      const { gameAuth } = await import('../services/firebase');
      const user = gameAuth().currentUser;
      return user ? { uid: user.uid, token: await user.getIdToken() } : null;
    } catch {
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    const session = await auth();
    if (!session) { patch({ signedIn: false, remote: undefined }); return; }
    patch({ signedIn: true, busy: true, message: '', failed: false, conflict: false });
    try {
      const { summary } = await getCloudSave(session.token);
      patch({ busy: false, remote: summary });
    } catch (err) {
      patch({ busy: false, failed: true, message: err instanceof Error ? err.message : 'Không kiểm tra được bản lưu cloud.' });
    }
  }, [auth, patch]);

  useEffect(() => { if (enabled) void refresh(); }, [enabled, refresh]);

  const upload = useCallback(async (overwrite = false): Promise<boolean> => {
    const save = exportLocal();
    if (!save) return false;
    const session = await auth();
    if (!session) { patch({ failed: true, message: NEED_LOGIN }); return false; }
    patch({ busy: true, failed: false, conflict: false, message: overwrite ? 'Đang ghi đè bản cloud...' : 'Đang đẩy lên cloud...' });
    try {
      // Ghi đè: lấy updatedAt mới nhất rồi ghi. Đẩy thường: dùng bản đã thấy lần trước (thiết bị khác ghi xen vào thì 409).
      const expected = overwrite ? (await getCloudSave(session.token)).summary?.updatedAt ?? null : readSeen(session.uid);
      const { summary } = await putCloudSave(session.token, save, expected);
      writeSeen(session.uid, summary.updatedAt);
      patch({ busy: false, remote: summary, message: overwrite ? 'Đã ghi đè bản cloud bằng bản trên máy.' : 'Đã đẩy tiến trình lên cloud.' });
      return true;
    } catch (err) {
      if (isCloudConflict(err)) {
        patch({ busy: false, failed: true, conflict: true, remote: err.body?.current ?? null, message: 'Cloud đã có bản lưu khác (thiết bị khác hoặc chưa tải về). Hãy tải bản cloud, hoặc ghi đè nếu chắc chắn bản trên máy là đúng.' });
      } else {
        patch({ busy: false, failed: true, message: err instanceof Error ? err.message : 'Không đẩy được lên cloud.' });
      }
      return false;
    }
  }, [auth, exportLocal, patch]);

  const download = useCallback(async (): Promise<boolean> => {
    const session = await auth();
    if (!session) { patch({ failed: true, message: NEED_LOGIN }); return false; }
    patch({ busy: true, failed: false, conflict: false, message: 'Đang tải bản cloud...' });
    try {
      const { save, summary } = await getCloudSave(session.token);
      const validation = validateSaveGameData(save);
      if (!save || !validation.valid || !validation.data) {
        patch({ busy: false, failed: true, remote: summary, message: save ? (validation.error ?? 'Bản cloud bị hỏng.') : 'Tài khoản chưa có bản lưu cloud.' });
        return false;
      }
      const ok = await importSave(structuredClone(validation.data));
      if (ok && summary) writeSeen(session.uid, summary.updatedAt);
      patch({ busy: false, failed: !ok, remote: summary, message: ok ? 'Đã tải bản cloud về máy. Bản cũ được giữ làm dự phòng.' : 'Chưa áp được bản cloud.' });
      return ok;
    } catch (err) {
      patch({ busy: false, failed: true, message: err instanceof Error ? err.message : 'Không tải được bản cloud.' });
      return false;
    }
  }, [auth, importSave, patch]);

  return { cloud: state, refreshCloud: refresh, uploadCloud: upload, downloadCloud: download };
}
