/**
 * useSaveMgmt — save / load / export / import / reset logic
 */
import { useRef, useCallback, useState } from 'react';
import type { SaveGameData } from '@game/shared';
import type { WorldDetail } from '../services/api';

export interface UseSaveMgmtOptions {
  simulationRef: React.RefObject<{ importSaveData: (data: SaveGameData) => void; exportSaveData: (id: string, rev: number) => SaveGameData } | null>;
  onlineWorldRef: React.RefObject<WorldDetail | null>;
  revisionRef: React.RefObject<number>;
  addToast: (msg: string, type?: 'info' | 'success' | 'warn') => void;
  syncFromSimulation?: (sim: any) => void;
}

export function useSaveMgmt({
  simulationRef,
  onlineWorldRef,
  revisionRef,
  addToast,
  syncFromSimulation,
}: UseSaveMgmtOptions) {
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  const handleSaveGame = useCallback(async (isManual: boolean = false) => {
    if (!simulationRef.current) return false;
    if (onlineWorldRef.current) {
      if (isManual) addToast('Tiệm online được lưu trên máy chủ.', 'info');
      return false;
    }
    let savedSuccessfully = false;
    saveQueueRef.current = saveQueueRef.current.catch(() => {}).then(async () => {
      try {
        if (!simulationRef.current) return;
        const { getActiveSlotId, persistSave } = await import('../db');
        const { buildSaveFile, saveFileName } = await import('../save-file');
        const exportData = simulationRef.current.exportSaveData(getActiveSlotId(), revisionRef.current);
        const saved = await persistSave(exportData);
        revisionRef.current = saved.revision;
        setLastSavedTime(saved.updatedAt);
        savedSuccessfully = true;
        if (isManual) addToast('Đã lưu tiến trình thành công vào máy!', 'success');
      } catch (err) {
        console.error('Save error:', err);
        addToast(err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu!', 'warn');
      }
    });
    await saveQueueRef.current;
    return savedSuccessfully;
  }, [simulationRef, onlineWorldRef, revisionRef, addToast]);

  const handleResetGame = useCallback(async () => {
    if (onlineWorldRef.current) {
      addToast('Không thể đặt lại save máy khi đang chơi trong hẻm online.', 'warn');
      return false;
    }
    try {
      await saveQueueRef.current;
      const { resetSaveToDefault } = await import('../db');
      const freshSave = await resetSaveToDefault();
      if (simulationRef.current) {
        simulationRef.current.importSaveData(freshSave);
        syncFromSimulation?.(simulationRef.current);
      }
      revisionRef.current = freshSave.revision;
      setLastSavedTime(freshSave.updatedAt);
      addToast('Đã khởi tạo lại tiệm mới thành công!', 'info');
      return true;
    } catch (err) {
      console.error('Reset error:', err);
      addToast('Không thể khởi tạo tiệm mới. Hãy thử lại.', 'warn');
      return false;
    }
  }, [simulationRef, onlineWorldRef, revisionRef, addToast, syncFromSimulation]);

  const handleExportSave = useCallback(async () => {
    if (onlineWorldRef.current) {
      addToast('Tiệm online nằm trên máy chủ, không xuất file được.', 'warn');
      return false;
    }
    if (!simulationRef.current) return false;
    try {
      await saveQueueRef.current;
      const { getActiveSlotId } = await import('../db');
      const { buildSaveFile, saveFileName } = await import('../save-file');
      const data = simulationRef.current.exportSaveData(getActiveSlotId(), revisionRef.current);
      const url = URL.createObjectURL(new Blob([buildSaveFile(data)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = saveFileName(data);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      addToast('Đã xuất bản lưu ra file.', 'success');
      return true;
    } catch (err) {
      console.error('Export error:', err);
      addToast('Không xuất được file. Hãy thử lại.', 'warn');
      return false;
    }
  }, [simulationRef, onlineWorldRef, revisionRef, addToast]);

  const handleImportSave = useCallback(async (save: SaveGameData) => {
    if (onlineWorldRef.current) {
      addToast('Không thể nhập save máy khi đang chơi trong hẻm online.', 'warn');
      return false;
    }
    try {
      await saveQueueRef.current;
      const { replaceSaveWithImported } = await import('../db');
      const stored = await replaceSaveWithImported(save);
      if (simulationRef.current) {
        simulationRef.current.importSaveData(stored);
        syncFromSimulation?.(simulationRef.current);
      }
      revisionRef.current = stored.revision;
      setLastSavedTime(stored.updatedAt);
      addToast('Đã nhập bản lưu. Bản cũ được giữ làm bản dự phòng.', 'success');
      return true;
    } catch (err) {
      console.error('Import error:', err);
      addToast(err instanceof Error ? err.message : 'Không nhập được bản lưu.', 'warn');
      return false;
    }
  }, [simulationRef, onlineWorldRef, revisionRef, addToast, syncFromSimulation]);

  const handleRestoreBackup = useCallback(async () => {
    try {
      const { restoreFromBackup } = await import('../db');
      const restored = await restoreFromBackup().catch(() => undefined);
      if (restored) {
        window.location.reload();
      } else {
        addToast('Không tìm thấy bản sao lưu hợp lệ!', 'warn');
      }
    } catch {
      addToast('Không tìm thấy bản sao lưu hợp lệ!', 'warn');
    }
  }, [addToast]);

  return {
    handleSaveGame,
    handleResetGame,
    handleExportSave,
    handleImportSave,
    handleRestoreBackup,
    lastSavedTime,
  };
}
