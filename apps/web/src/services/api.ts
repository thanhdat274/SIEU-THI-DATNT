import type { GameWorld, BusinessState } from '@game/shared';
import { MULTIPLAYER_PROTOCOL_VERSION } from '@game/shared';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

export interface WorldSummary {
  id: string;
  name: string;
  role: 'owner' | 'member';
  revision: number;
}

export interface WorldDetail {
  world: GameWorld;
  businesses: BusinessState[];
}

export async function fetchWithAuth(path: string, idToken: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Lỗi máy chủ (${res.status})`);
  }
  return res.json();
}

export async function listUserWorlds(idToken: string): Promise<WorldSummary[]> {
  return fetchWithAuth('/api/v1/worlds', idToken);
}

export async function createOnlineWorld(idToken: string, name: string): Promise<WorldDetail> {
  return fetchWithAuth('/api/v1/worlds', idToken, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function joinOnlineWorld(idToken: string, token: string): Promise<WorldDetail> {
  return fetchWithAuth('/api/v1/worlds/join', idToken, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function getOnlineWorld(idToken: string, worldId: string): Promise<WorldDetail> {
  return fetchWithAuth(`/api/v1/worlds/${worldId}`, idToken);
}

export async function createWorldInvite(idToken: string, worldId: string): Promise<{ inviteId: string; token: string; expiresAt: string }> {
  return fetchWithAuth(`/api/v1/worlds/${worldId}/invites`, idToken, {
    method: 'POST',
  });
}

export async function revokeWorldInvite(idToken: string, worldId: string, inviteId: string): Promise<{ revoked: boolean }> {
  return fetchWithAuth(`/api/v1/worlds/${worldId}/invites/${inviteId}`, idToken, {
    method: 'DELETE',
  });
}

export async function kickWorldMember(idToken: string, worldId: string, memberId: string): Promise<{ removed: boolean }> {
  return fetchWithAuth(`/api/v1/worlds/${worldId}/members/${memberId}`, idToken, {
    method: 'DELETE',
  });
}

export async function leaveOnlineWorld(idToken: string, worldId: string): Promise<{ left: boolean }> {
  return fetchWithAuth(`/api/v1/worlds/${worldId}/membership`, idToken, {
    method: 'DELETE',
  });
}

export async function resetOnlineWorld(idToken: string, worldId: string): Promise<{ reset: boolean; revision: number }> {
  return fetchWithAuth(`/api/v1/worlds/${worldId}/reset`, idToken, {
    method: 'POST',
    body: JSON.stringify({ confirmation: worldId }),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- command payloads and receipts are command-specific JSON
export async function commitOnlineCommand(idToken: string, worldId: string, payload: any): Promise<{ committed: boolean; revision: number; receipt: any; updatedBusiness?: any }> {
  return fetchWithAuth(`/api/v1/worlds/${worldId}/commands`, idToken, {
    method: 'POST',
    body: JSON.stringify({ ...payload, protocolVersion: MULTIPLAYER_PROTOCOL_VERSION }),
  });
}

export interface ActivitiesResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- activity rows are shaped by the server
  activities: any[];
  totalCount: number;
  hasMore: boolean;
}

export async function listOnlineActivities(
  idToken: string,
  worldId: string,
  options?: { lastSeenRevision?: number; limit?: number }
): Promise<ActivitiesResponse> {
  const query = new URLSearchParams();
  if (typeof options?.lastSeenRevision === 'number') query.set('lastSeenRevision', String(options.lastSeenRevision));
  if (typeof options?.limit === 'number') query.set('limit', String(options.limit));
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchWithAuth(`/api/v1/worlds/${worldId}/activities${queryString}`, idToken);
}

/** Call once when entering an online world to record lastSeenRevision for absence activity tracking */
export async function touchWorldSession(idToken: string, worldId: string): Promise<{ revision: number }> {
  return fetchWithAuth(`/api/v1/worlds/${worldId}/session`, idToken, { method: 'POST', body: '{}' });
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  totalRevenue: number;
  day: number;
  level: number;
  members: number;
  mine: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  myRank: number | null;
}

export async function getLeaderboard(idToken: string): Promise<LeaderboardResponse> {
  return fetchWithAuth('/api/v1/leaderboard', idToken);
}
