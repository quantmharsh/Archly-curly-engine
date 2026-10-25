import Dexie, { type EntityTable } from "dexie";
import { diagramDocumentSchema, type DiagramDocument } from "@/lib/graph-schema";

class CanvasDatabase extends Dexie {
  diagrams!: EntityTable<DiagramDocument, "id">;
  accountDiagrams!: EntityTable<AccountDiagramCache, "key">;
  syncQueue!: EntityTable<PendingDiagramSync, "key">;
  guestTransfers!: EntityTable<GuestTransferReceipt, "key">;

  constructor() {
    super("archly-guest-canvas");
    this.version(1).stores({ diagrams: "id, title, updatedAt" });
    this.version(2).stores({
      diagrams: "id, title, updatedAt",
      accountDiagrams: "key, userId, diagramId, updatedAt",
      syncQueue: "key, userId, diagramId, updatedAt",
      guestTransfers: "key, userId, diagramId",
    });
  }
}

export type AccountDiagramCache = {
  key: string;
  userId: string;
  diagramId: string;
  document: DiagramDocument;
  revision: number;
  updatedAt: number;
  dirty: boolean;
};

export type PendingDiagramSync = {
  key: string;
  userId: string;
  diagramId: string;
  document: DiagramDocument;
  expectedRevision: number;
  updatedAt: number;
};

export type GuestTransferReceipt = {
  key: string;
  userId: string;
  diagramId: string;
  guestUpdatedAt: number;
  accountDiagramId: string;
};

export const localDb = new CanvasDatabase();

export async function saveLocalDiagram(document: DiagramDocument) {
  const validated = diagramDocumentSchema.parse(document);
  await localDb.diagrams.put(validated);
}

export async function deleteLocalDiagram(diagramId: string) {
  await localDb.transaction("rw", [localDb.diagrams, localDb.guestTransfers], async () => {
    await localDb.diagrams.delete(diagramId);
    await localDb.guestTransfers.where("diagramId").equals(diagramId).delete();
  });
}

export async function listLocalDiagrams() {
  return localDb.diagrams.orderBy("updatedAt").reverse().toArray();
}

export async function readLocalDiagram(id: string) {
  const stored = await localDb.diagrams.get(id);
  return stored ? diagramDocumentSchema.parse(stored) : undefined;
}

const accountDiagramKey = (userId: string, diagramId: string) => `${userId}:${diagramId}`;

export async function listAccountDiagramCache(userId: string) {
  return localDb.accountDiagrams.where("userId").equals(userId).sortBy("updatedAt");
}

export async function saveAccountDiagramCache(entry: Omit<AccountDiagramCache, "key">) {
  const validated = diagramDocumentSchema.parse(entry.document);
  await localDb.accountDiagrams.put({ ...entry, document: validated, key: accountDiagramKey(entry.userId, entry.diagramId) });
}

export async function getAccountDiagramCache(userId: string, diagramId: string) {
  return localDb.accountDiagrams.get(accountDiagramKey(userId, diagramId));
}

export async function deleteAccountDiagramCache(userId: string, diagramId: string) {
  const key = accountDiagramKey(userId, diagramId);
  await localDb.transaction("rw", [localDb.accountDiagrams, localDb.syncQueue], async () => {
    await localDb.accountDiagrams.delete(key);
    await localDb.syncQueue.delete(key);
  });
}

export async function queueDiagramSync(entry: Omit<PendingDiagramSync, "key">) {
  const validated = diagramDocumentSchema.parse(entry.document);
  await localDb.syncQueue.put({ ...entry, document: validated, key: accountDiagramKey(entry.userId, entry.diagramId) });
}

export async function listQueuedDiagramSync(userId: string) {
  return localDb.syncQueue.where("userId").equals(userId).sortBy("updatedAt");
}

export async function removeQueuedDiagramSync(userId: string, diagramId: string) {
  await localDb.syncQueue.delete(accountDiagramKey(userId, diagramId));
}

export async function getGuestTransferReceipt(userId: string, diagramId: string) {
  return localDb.guestTransfers.get(accountDiagramKey(userId, diagramId));
}

export async function saveGuestTransferReceipt(receipt: Omit<GuestTransferReceipt, "key">) {
  await localDb.guestTransfers.put({ ...receipt, key: accountDiagramKey(receipt.userId, receipt.diagramId) });
}

const guestTransferDismissalKey = (userId: string, diagramId: string) => `archly-guest-transfer-dismissed:${userId}:${diagramId}`;

export function getGuestTransferPromptDismissal(userId: string, diagramId: string) {
  try {
    const value = window.localStorage.getItem(guestTransferDismissalKey(userId, diagramId));
    return value === null ? undefined : Number(value);
  } catch {
    return undefined;
  }
}

export function saveGuestTransferPromptDismissal(userId: string, diagramId: string, guestUpdatedAt: number) {
  try {
    window.localStorage.setItem(guestTransferDismissalKey(userId, diagramId), String(guestUpdatedAt));
  } catch {
    // Showing the transfer prompt again is safer than losing an explicit dismissal.
  }
}

export function clearGuestTransferPromptDismissal(userId: string, diagramId: string) {
  try {
    window.localStorage.removeItem(guestTransferDismissalKey(userId, diagramId));
  } catch {
    // Dismissal cleanup is best-effort; the transfer receipt still records the copied version.
  }
}

// Which canvas was last open is a small UI pointer, not part of a diagram
// document, so it lives in localStorage next to the IndexedDB database rather
// than inside the versioned graph schema.
const LAST_OPEN_DIAGRAM_KEY = "archly-guest-canvas:last-open-diagram";

export function readLastOpenDiagramId() {
  try {
    return window.localStorage.getItem(LAST_OPEN_DIAGRAM_KEY) || undefined;
  } catch {
    return undefined;
  }
}

export function saveLastOpenDiagramId(id: string) {
  try {
    window.localStorage.setItem(LAST_OPEN_DIAGRAM_KEY, id);
  } catch {
    // Storage can be blocked or full; resuming the last canvas is best-effort.
  }
}

export function readLastOpenAccountDiagramId(userId: string) {
  try {
    return window.localStorage.getItem(`archly-account:last-open-diagram:${userId}`) || undefined;
  } catch {
    return undefined;
  }
}

export function saveLastOpenAccountDiagramId(userId: string, id: string) {
  try {
    window.localStorage.setItem(`archly-account:last-open-diagram:${userId}`, id);
  } catch {
    // The server preference remains authoritative when local storage is unavailable.
  }
}
