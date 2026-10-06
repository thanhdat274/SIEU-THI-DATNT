import './runtime-config.js';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { randomUUID } from 'node:crypto';
import { connectDatabase } from './database.js';

export function firebaseAdminAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is not configured');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const credential = clientEmail || privateKey
    ? (() => {
      if (!clientEmail || !privateKey) {
        throw new Error('FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must both be configured');
      }
      return cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') });
    })()
    : applicationDefault();
  const app = getApps().find(candidate => candidate.name === 'game-auth') ?? initializeApp({
    projectId, credential,
  }, 'game-auth');
  return getAuth(app);
}

type VerifiedAccount = { uid: string; name: string | null; email: string | null };
/** verifyIdToken(…, checkRevoked=true) gọi mạng sang Firebase mỗi request (~0.5–1s); nhớ kết quả ngắn hạn theo token để các request liên tiếp không trả phí đó. */
const VERIFIED_TOKEN_TTL_MS = 60_000;
const VERIFIED_TOKEN_MAX = 500;
const verifiedTokens = new Map<string, { account: VerifiedAccount; until: number }>();
const pendingVerifications = new Map<string, Promise<VerifiedAccount>>();

export async function verifyAccount(header?: string) {
  if (!header?.startsWith('Bearer ') || header.length > 16384) throw new Error('Unauthorized');
  const idToken = header.slice(7);
  const now = Date.now();
  const hit = verifiedTokens.get(idToken);
  if (hit && hit.until > now) return hit.account;
  if (hit) verifiedTokens.delete(idToken);
  let pending = pendingVerifications.get(idToken);
  if (!pending) {
    pending = firebaseAdminAuth().verifyIdToken(idToken, true).then(decoded => {
      const account = { uid: decoded.uid, name: decoded.name ?? null, email: decoded.email ?? null };
      if (verifiedTokens.size >= VERIFIED_TOKEN_MAX) verifiedTokens.delete(verifiedTokens.keys().next().value as string);
      verifiedTokens.set(idToken, { account, until: Math.min(Date.now() + VERIFIED_TOKEN_TTL_MS, decoded.exp * 1000) });
      return account;
    }).finally(() => pendingVerifications.delete(idToken));
    pendingVerifications.set(idToken, pending);
  }
  return pending;
}

interface WebSocketTicketDoc {
  _id: string;
  accountId: string;
  expiresAt: Date;
}

/** Exchanges a Firebase ID token for a short-lived, single-use WebSocket ticket. */
export async function createWebSocketTicket(accountId: string): Promise<string> {
  const ticket = randomUUID();
  await (await connectDatabase()).collection<WebSocketTicketDoc>('websocket_tickets').insertOne({ _id: ticket, accountId, expiresAt: new Date(Date.now() + 30_000) });
  return ticket;
}

export async function consumeWebSocketTicket(ticket: string) {
  const result = await (await connectDatabase()).collection<WebSocketTicketDoc>('websocket_tickets').findOneAndDelete({ _id: ticket, expiresAt: { $gt: new Date() } });
  const row = (result && 'value' in (result as object) ? (result as unknown as { value: unknown }).value : result) as WebSocketTicketDoc | null;
  return row && typeof row.accountId === 'string' ? { uid: row.accountId, name: null, email: null } : null;
}
