import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from './i18n';

export default function EditorDialog({
  title,
  busy,
  onClose,
  children,
}: {
  title: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      className="record-dialog"
      ref={dialog}
      aria-labelledby="editor-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2 id="editor-title">{title}</h2>
        <button
          type="button"
          className="dialog-close"
          disabled={busy}
          aria-label={t('Close')}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
