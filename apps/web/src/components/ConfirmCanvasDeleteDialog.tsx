"use client";

import { useEffect, useRef, useState } from "react";

type ConfirmCanvasDeleteDialogProps = {
  title: string;
  scope: "account" | "device";
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmCanvasDeleteDialog({ title, scope, busy, error, onCancel, onConfirm }: ConfirmCanvasDeleteDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  const scopeLabel = scope === "account" ? "your account" : "this device";

  return (
    <div className="delete-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <section className="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
        <div className="delete-dialog-icon" aria-hidden="true">!</div>
        <button className="account-dialog-close" type="button" onClick={onCancel} aria-label="Close delete confirmation" disabled={busy}>×</button>
        <h2 id="delete-dialog-title">Delete “{title}” permanently?</h2>
        <p id="delete-dialog-description">This permanently deletes the saved canvas from {scopeLabel}. Archly does not keep a trash copy or provide a restore option. Separate copies on other devices and downloaded JSON backups are unaffected.</p>
        <label className="delete-confirm-label" htmlFor="delete-confirmation">Type <strong>DELETE</strong> to confirm</label>
        <input
          ref={inputRef}
          id="delete-confirmation"
          className="delete-confirm-input"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-label="Type DELETE to confirm permanent deletion"
          disabled={busy}
        />
        {error && <div className="account-dialog-error" role="alert">{error}</div>}
        <div className="delete-dialog-actions">
          <button type="button" className="delete-cancel-button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="delete-confirm-button" onClick={onConfirm} disabled={busy || confirmation !== "DELETE"}>
            {busy ? "Deleting…" : "Permanently delete"}
          </button>
        </div>
      </section>
    </div>
  );
}
