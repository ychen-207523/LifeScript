import { useState } from 'react';
import type { FormEvent } from 'react';
import EditorDialog from './EditorDialog';
import PictureInput from './PictureInput';
import { validImage, useImagePreview } from './cover';
import { builtinLabels, saveRow, uploadRowPortrait } from './knowledge-api';
import type { Cell, WorldRow, WorldTable } from './knowledge-api';
import { useI18n } from './i18n';

export default function RowEditor({
  worldId,
  table,
  row,
  places,
  characters,
  onSaved,
  onClose,
  onReload,
}: {
  worldId: string;
  table: WorldTable;
  row: WorldRow | null;
  places: WorldRow[];
  characters: WorldRow[];
  onSaved: () => void;
  onClose: () => void;
  onReload: () => void;
}) {
  const { t } = useI18n();
  const [id] = useState(() => row?.id ?? crypto.randomUUID());
  const [saved, setSaved] = useState(row);
  const [cells, setCells] = useState<Record<string, Cell>>(() => ({ ...row?.cells }));
  const [portrait, setPortrait] = useState<File | null>(null);
  const preview = useImagePreview(portrait);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  function change(column: string, value: Cell) {
    setCells((previous) => ({ ...previous, [column]: value }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      let result = await saveRow(worldId, table, id, cells, saved?.revision ?? 0);
      setSaved(result);
      if (portrait) {
        result = await uploadRowPortrait(worldId, result, portrait);
        setSaved(result);
      }
      onSaved();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'The request could not be completed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <EditorDialog title={t(row ? 'Edit record' : 'Add record')} busy={busy} onClose={onClose}>
      <form noValidate onSubmit={(event) => void submit(event)}>
        {error && (
          <div className="error-banner" role="alert">
            {t(error)}{' '}
            <button type="button" className="text-button" onClick={onReload}>
              {t('Reload')}
            </button>
            {saved && !row && (
              <p>{t('The record has been saved. You can retry the remaining changes.')}</p>
            )}
          </div>
        )}
        <fieldset disabled={busy}>
          {table.columns.map((column) => {
            const label = column.label || t(builtinLabels[column.id] ?? column.id);
            const disabled = Boolean(saved && column.locked);
            const value = cells[column.id];
            if (column.type === 'image')
              return (
                <fieldset key={column.id} disabled={column.locked} className="field">
                  <legend>{label}</legend>
                  {(preview || saved?.portraitUrl) && (
                    <img
                      className="record-portrait-preview"
                      src={preview ?? saved?.portraitUrl ?? ''}
                      alt={t('Portrait')}
                    />
                  )}
                  <PictureInput
                    id="record-portrait"
                    file={portrait}
                    onChoose={(file) => {
                      if (!file) return;
                      if (!validImage(file)) {
                        setError('Let’s try a PNG or JPEG image, 5 MB or smaller.');
                        return;
                      }
                      setPortrait(file);
                    }}
                  />
                </fieldset>
              );
            if (column.type === 'checkbox')
              return (
                <div className="field" key={column.id}>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={value === true}
                      disabled={disabled}
                      onChange={(event) => change(column.id, event.target.checked)}
                    />
                    {label}
                    {disabled && ` · ${t('Locked')}`}
                  </label>
                </div>
              );
            const inputProps = {
              id: `cell-${column.id}`,
              disabled,
              value: value == null ? '' : String(value),
              'aria-label': label,
            };
            return (
              <div className="field" key={column.id}>
                <label htmlFor={inputProps.id}>
                  {label}
                  {disabled && <span className="optional">{t('Locked')}</span>}
                </label>
                {column.type === 'text' ? (
                  column.id === 'name' ? (
                    <input
                      {...inputProps}
                      maxLength={6000}
                      onChange={(event) => change(column.id, event.target.value)}
                    />
                  ) : (
                    <textarea
                      {...inputProps}
                      maxLength={6000}
                      rows={2}
                      onChange={(event) => change(column.id, event.target.value)}
                    />
                  )
                ) : column.type === 'number' ? (
                  <input
                    {...inputProps}
                    type="number"
                    step="any"
                    onChange={(event) =>
                      change(
                        column.id,
                        event.target.value === '' ? null : Number(event.target.value),
                      )
                    }
                  />
                ) : (
                  <select
                    {...inputProps}
                    onChange={(event) => change(column.id, event.target.value)}
                  >
                    <option value="">{t('None')}</option>
                    {column.type === 'choice'
                      ? column.options.map((option) => (
                          <option key={option} value={option}>
                            {table.kind !== 'custom' && column.id === 'status' ? t(option) : option}
                          </option>
                        ))
                      : (column.type === 'place' ? places : characters).map((target) => (
                          <option key={target.id} value={target.id}>
                            {String(target.cells.name || target.id)}
                          </option>
                        ))}
                  </select>
                )}
              </div>
            );
          })}
          <div className="editor-actions">
            <button type="button" className="secondary" onClick={onClose}>
              {t('Cancel')}
            </button>
            <button type="submit">{t(busy ? 'Saving…' : 'Save record')}</button>
          </div>
        </fieldset>
      </form>
    </EditorDialog>
  );
}
