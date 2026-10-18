import type { DiagramDocument } from "@/lib/graph-schema";
import { listQueuedDiagramSync, removeQueuedDiagramSync, saveAccountDiagramCache } from "@/lib/local-db";

export type VersionedDiagram = { document: DiagramDocument; revision: number };

export class AccountDiagramError extends Error {
  constructor(message: string, readonly status: number, readonly current?: VersionedDiagram) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  } catch {
    throw new AccountDiagramError("You are offline. The canvas is saved on this device and will sync when you reconnect.", 0);
  }
  const body = await response.json().catch(() => ({})) as { error?: string; revision?: number; current?: VersionedDiagram; diagrams?: VersionedDiagram[]; alreadySaved?: boolean };
  if (!response.ok) throw new AccountDiagramError(body.error || "The account canvas request failed.", response.status, body.current);
  return body as T;
}

export async function listAccountDiagrams() {
  const result = await request<{ diagrams: VersionedDiagram[] }>("/api/diagrams", { method: "GET", cache: "no-store" });
  return result.diagrams;
}

export async function createAccountDiagram(document: DiagramDocument) {
  return request<{ revision: number; alreadySaved: boolean }>("/api/diagrams", { method: "POST", body: JSON.stringify(document) });
}

export async function updateAccountDiagram(document: DiagramDocument, expectedRevision: number) {
  return request<{ revision: number }>(`/api/diagrams/${encodeURIComponent(document.id)}`, {
    method: "PUT",
    body: JSON.stringify({ document, expectedRevision }),
  });
}

export async function flushQueuedAccountDiagrams(userId: string, skipDiagramId?: string) {
  const queued = await listQueuedDiagramSync(userId);
  const conflicts: VersionedDiagram[] = [];
  for (const item of queued) {
    if (item.diagramId === skipDiagramId) continue;
    try {
      let revision: number;
      try {
        revision = item.expectedRevision > 0
          ? (await updateAccountDiagram(item.document, item.expectedRevision)).revision
          : (await createAccountDiagram(item.document)).revision;
      } catch (error) {
        if (error instanceof AccountDiagramError && error.status === 404) {
          revision = (await createAccountDiagram(item.document)).revision;
        } else if (error instanceof AccountDiagramError && error.status === 409) {
          const conflictDocument = { ...item.document, id: crypto.randomUUID(), title: `${item.document.title} (conflict copy)`, updatedAt: Date.now() };
          revision = (await createAccountDiagram(conflictDocument)).revision;
          conflicts.push({ document: conflictDocument, revision });
          await saveAccountDiagramCache({ userId, diagramId: conflictDocument.id, document: conflictDocument, revision, updatedAt: conflictDocument.updatedAt, dirty: false });
          if (error.current) await saveAccountDiagramCache({ userId, diagramId: item.diagramId, document: error.current.document, revision: error.current.revision, updatedAt: error.current.document.updatedAt, dirty: false });
          await removeQueuedDiagramSync(userId, item.diagramId);
          continue;
        } else {
          continue;
        }
      }
      await saveAccountDiagramCache({ userId, diagramId: item.diagramId, document: item.document, revision, updatedAt: item.document.updatedAt, dirty: false });
      await removeQueuedDiagramSync(userId, item.diagramId);
    } catch {
      // Keep the queue entry so a later online event can retry without data loss.
    }
  }
  return conflicts;
}
