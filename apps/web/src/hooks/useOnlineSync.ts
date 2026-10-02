/**
 * useOnlineSync — online multiplayer sync (polling + WebSocket + commit)
 */
import { useRef, useCallback, useEffect, useState } from 'react';
import type { GameSimulation } from '@game/core';
import type { SaveGameData } from '@game/shared';
import type { WorldDetail } from '../services/api';
import { createWorldInvite, commitOnlineCommand, getOnlineWorld } from '../services/api';

export interface UseOnlineSyncOptions {
  onlineWorld: WorldDetail | null;
  onlineToken: string | null;
  simulationRef: React.RefObject<GameSimulation | null>;
  onlineWorldRef: React.RefObject<WorldDetail | null>;
  revisionRef: React.RefObject<number>;
  addToast: (msg: string, type?: 'info' | 'success' | 'warn') => void;
  importOnlineSave: (sim: GameSimulation, save: SaveGameData) => void;
  syncFromSimulation: (sim: GameSimulation) => void;
  setCurrentRevision: (rev: number) => void;
  setOnlineConnected: (connected: boolean) => void;
}

export function useOnlineSync({
  onlineWorld,
  onlineToken,
  simulationRef,
  onlineWorldRef,
  revisionRef,
  addToast,
  importOnlineSave,
  syncFromSimulation,
  setCurrentRevision,
  setOnlineConnected,
}: UseOnlineSyncOptions) {
  const onlineConnectedRef = useRef(true);
  const [onlineConnected, setOnlineConnectedReal] = useState(true);
  const consecutiveFailuresRef = useRef(0);

  // Sync setter (caller may use for UI)
  useEffect(() => { setOnlineConnectedReal(onlineConnected); }, [onlineConnected]);

  // After a rejected commit, adopt the server's current world
  const resyncOnlineWorldAfterReject = useCallback(async (fallback: WorldDetail) => {
    const sim = simulationRef.current;
    if (!sim) return;
    try {
      const { gameAuth } = await import('../services/firebase');
      const user = gameAuth().currentUser;
      if (!user) throw new Error('not signed in');
      const fresh = await getOnlineWorld(await user.getIdToken(), fallback.world.id);
      onlineWorldRef.current = fresh;
      revisionRef.current = fresh.world.revision;
      setCurrentRevision(fresh.world.revision);
      importOnlineSave(sim, fresh.businesses[0].save);
    } catch {
      importOnlineSave(sim, fallback.businesses[0].save);
    }
    syncFromSimulation(sim);
  }, [simulationRef, onlineWorldRef, revisionRef, setCurrentRevision, importOnlineSave, syncFromSimulation]);

  // Block mutations when not connected
  const blockOfflineOnlineMutation = useCallback(() => {
    if (!onlineWorldRef.current || onlineConnectedRef.current) return false;
    addToast('Mất kết nối hẻm chung. Thao tác đã bị chặn — đang chờ kết nối lại.', 'warn');
    return true;
  }, [onlineWorldRef, addToast]);

  // Helper to commit online business mutation or fallback to local
  const commitBusinessChange = useCallback(async (
    commandPayload: unknown,
    activityDesc: string,
    activityType: string
  ) => {
    const curWorld = onlineWorldRef.current;
    if (!curWorld || !simulationRef.current) return false;
    if (!onlineConnectedRef.current) {
      addToast('Mất kết nối hẻm chung. Thao tác không được lưu — đang chờ kết nối lại...', 'warn');
      return false;
    }
    try {
      const { gameAuth } = await import('../services/firebase');
      const user = gameAuth().currentUser;
      if (!user) throw new Error('Cần đăng nhập tài khoản.');
      const token = await user.getIdToken();

      const exportedSave = simulationRef.current.exportSaveData(
        curWorld.businesses[0].save.id,
        curWorld.world.revision + 1
      );
      const commandId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `cmd-${Date.now()}`;
      const res = await commitOnlineCommand(token, curWorld.world.id, {
        expectedRevision: curWorld.world.revision,
        receipt: {
          commandId,
          actorId: user.uid,
          status: 'accepted',
          revision: curWorld.world.revision + 1,
          payloadJson: JSON.stringify(commandPayload),
        },
        updatedBusiness: {
          ...curWorld.businesses[0],
          save: exportedSave,
        },
        activity: {
          actorId: user.uid,
          type: activityType,
          description: activityDesc,
        },
      });

      if (res.committed) {
        revisionRef.current = res.revision;
        setCurrentRevision(res.revision);
        const committedSave = res.updatedBusiness?.save
          ? res.updatedBusiness.save as SaveGameData
          : exportedSave;
        if (res.updatedBusiness?.save) {
          importOnlineSave(simulationRef.current, committedSave);
          syncFromSimulation(simulationRef.current);
        }
        const updatedWorld = {
          ...curWorld,
          world: { ...curWorld.world, revision: res.revision },
          businesses: [{ ...curWorld.businesses[0], ...(res.updatedBusiness ?? {}), save: committedSave }],
        };
        onlineWorldRef.current = updatedWorld;
        return true;
      } else {
        await resyncOnlineWorldAfterReject(curWorld);
        addToast('Máy chủ từ chối thay đổi. Đã khôi phục dữ liệu online gần nhất.', 'warn');
        return false;
      }
    } catch (err) {
      console.error('Online commit error:', err);
      await resyncOnlineWorldAfterReject(curWorld);
      addToast(err instanceof Error ? err.message : 'Không thể lưu lên hẻm chung.', 'warn');
      return false;
    }
  }, [simulationRef, onlineWorldRef, revisionRef, setCurrentRevision, importOnlineSave, syncFromSimulation, resyncOnlineWorldAfterReject, addToast]);

  // Generic mutation helper
  const persistSimulationMutation = useCallback(async <T extends { success: boolean; reason?: string }>(
    payload: unknown,
    description: string,
    activityType: string,
    mutate: (simulation: GameSimulation) => T,
  ): Promise<T | null> => {
    if (blockOfflineOnlineMutation()) return null;
    const simulation = simulationRef.current;
    if (!simulation) return null;
    const result = mutate(simulation);
    if (!result.success) return result;
    syncFromSimulation(simulation);
    if (onlineWorldRef.current) {
      const committed = await commitBusinessChange(payload, description, activityType);
      if (!committed) return { ...result, success: false, reason: 'Máy chủ chưa xác nhận thay đổi.' };
    } else {
      // Local save is caller's responsibility
    }
    return result;
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, syncFromSimulation, commitBusinessChange]);

  // Polling sync for online world
  const startOnlinePolling = useCallback(() => {
    let consecutiveFailures = 0;
    const interval = setInterval(async () => {
      const curWorld = onlineWorldRef.current;
      if (!curWorld) return;
      try {
        const { gameAuth } = await import('../services/firebase');
        const user = gameAuth().currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const updated = await getOnlineWorld(token, curWorld.world.id);
        onlineWorldRef.current = updated;
        if (!onlineConnectedRef.current) {
          onlineConnectedRef.current = true;
          setOnlineConnected(true);
        }
        consecutiveFailures = 0;
        if (simulationRef.current && updated.businesses[0]?.save) {
          const remoteRev = updated.world.revision;
          if (remoteRev > revisionRef.current) {
            revisionRef.current = remoteRev;
            setCurrentRevision(remoteRev);
            importOnlineSave(simulationRef.current, updated.businesses[0].save);
            syncFromSimulation(simulationRef.current);
          }
        }
      } catch (err) {
        consecutiveFailures++;
        console.debug('Online sync check failed:', err);
        if (consecutiveFailures >= 2 && onlineConnectedRef.current) {
          onlineConnectedRef.current = false;
          setOnlineConnected(false);
        }
      }
    }, 3000);
    return interval;
  }, [simulationRef, onlineWorldRef, revisionRef, setCurrentRevision, importOnlineSave, syncFromSimulation, addToast, setOnlineConnected]);

  // Generate invite code
  const handleOnlineInvite = useCallback(async () => {
    if (!onlineWorld) return;
    try {
      const { gameAuth } = await import('../services/firebase');
      const user = gameAuth().currentUser;
      if (!user) throw new Error('Cần đăng nhập.');
      const token = await user.getIdToken();
      const invite = await createWorldInvite(token, onlineWorld.world.id);
      navigator.clipboard?.writeText(invite.token);
      window.prompt('Mã mời tham gia hẻm (đã sao chép vào bộ nhớ tạm):', invite.token);
      addToast('Đã tạo mã mời tham gia hẻm thành công!', 'success');
    } catch (err) {
      console.error(err);
      addToast(err instanceof Error ? err.message : 'Không tạo được lời mời.', 'warn');
    }
  }, [onlineWorld, addToast]);

  return {
    onlineConnected,
    blockOfflineOnlineMutation,
    commitBusinessChange,
    persistSimulationMutation,
    startOnlinePolling,
    resyncOnlineWorldAfterReject,
    handleOnlineInvite,
  };
}
