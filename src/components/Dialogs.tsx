import { X } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

export function Dialog({ dialogRef, initialFocus, title, compact, onClose, onRequestClose, children }: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  initialFocus: RefObject<HTMLElement | null>;
  title: string;
  compact?: boolean;
  onClose: () => void;
  onRequestClose?: () => boolean;
  children: ReactNode;
}) {
  const heading = useId();
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      initialFocus.current?.setAttribute('autofocus', '');
      dialog.showModal();
    }
  }, [dialogRef, initialFocus]);

  function requestClose() {
    if (onRequestClose?.() !== false) dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      className={compact ? 'dialog dialog--compact' : 'dialog'}
      aria-labelledby={heading}
      onClose={onClose}
      onCancel={(event) => {
        if (onRequestClose?.() === false) event.preventDefault();
      }}
    >
      <header className="dialog-header">
        <h2 id={heading}>{title}</h2>
        <button type="button" className="button button--icon" aria-label="Закрыть" onClick={requestClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      {children}
    </dialog>
  );
}

export function ConfirmDialog({ title, description, action, onConfirm, onClose }: {
  title: string;
  description: string;
  action: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  return (
    <Dialog dialogRef={dialog} initialFocus={cancelButton} title={title} compact onClose={onClose} onRequestClose={() => !isSaving}>
      <form method="dialog" className="dialog-body" onSubmit={async (event) => {
        event.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        setError('');
        try {
          await onConfirm();
          dialog.current?.close();
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : 'Повторите попытку.');
        } finally {
          setIsSaving(false);
        }
      }}>
        <p className="muted">{description}</p>
        {error ? <p className="message message--error" role="alert">{error}</p> : null}
        <div className="dialog-actions">
          <button type="button" className="button button--secondary" ref={cancelButton} disabled={isSaving} onClick={() => dialog.current?.close()}>Отмена</button>
          <button type="submit" className="button button--danger" disabled={isSaving}>{isSaving ? 'Сохраняем…' : action}</button>
        </div>
      </form>
    </Dialog>
  );
}
