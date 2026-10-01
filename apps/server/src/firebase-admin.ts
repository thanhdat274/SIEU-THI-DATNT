import './runtime-config';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { randomUUID } from 'node:crypto';
import { connectDatabase } from './database';

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

export async function verifyAccount(header?: string) {
  if (!header?.startsWith('Bearer ') || header.length > 16384) throw new Error('Unauthorized');
  const token = await firebaseAdminAuth().verifyIdToken(header.slice(7), true);
  return { uid: token.uid, name: token.name ?? null, email: token.email ?? null };
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
