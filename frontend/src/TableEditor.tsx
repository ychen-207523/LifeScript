import { useState } from 'react';
import type { FormEvent } from 'react';
import EditorDialog from './EditorDialog';
import { builtinLabels, saveTable } from './knowledge-api';
import type { Column, ColumnType, WorldTable } from './knowledge-api';
import { useI18n } from './i18n';

const types: ColumnType[] = ['text', 'number', 'checkbox', 'choice', 'place', 'character'];
export default function TableEditor({
  worldId,
  table,
  rowCount,
  onSaved,
  onClose,
}: {
  worldId: string;
  table: WorldTable | null;
  rowCount: number;
  onSaved: (table: WorldTable) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const newColumn = (): Column => ({
    id: crypto.randomUUID(),
    label: t('Name'),
    type: 'text',
    options: [],
    locked: false,
  });
  const [name, setName] = useState(table?.name ?? '');
  const [columns, setColumns] = useState<Column[]>(() =>
    table ? table.columns.map((column) => ({ ...column })) : [newColumn()],
  );
  const [optionTexts, setOptionTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (table?.columns ?? []).map((column) => [column.id, column.options.join('\n')]),
    ),
  );
  const [useInStory, setUseInStory] = useState(table?.useInStory ?? true);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  function change(id: string, updates: Partial<Column>) {
    setColumns((previous) =>
      previous.map((column) => (column.id === id ? { ...column, ...updates } : column)),
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const normalized = columns.map((column) => ({
        ...column,
        options:
          column.type === 'choice'
            ? (optionTexts[column.id] ?? column.options.join('\n'))
                .split('\n')
                .map((value) => value.trim())
                .filter(Boolean)
            : [],
      }));
      onSaved(await saveTable(worldId, table, { name, columns: normalized, useInStory }));
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
    <EditorDialog title={t(table ? 'Customize table' : 'New table')} busy={busy} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)}>
        {error && (
          <p className="error-banner" role="alert">
            {t(error)}
          </p>
        )}
        <fieldset disabled={busy}>
          <div className="field">
            <label htmlFor="table-name">{t('Table name')}</label>
            <input
              id="table-name"
              value={name}
              maxLength={80}
              required={!table || table.kind === 'custom'}
              placeholder={
                table?.kind === 'places'
                  ? t('Places')
                  : table?.kind === 'characters'
                    ? t('Characters')
                    : t('Table name')
              }
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={useInStory}
              onChange={(event) => setUseInStory(event.target.checked)}
            />
            {t('Use in story context')}
          </label>
          <p className="field-hint">
            {t('Make these records available to the future storyteller.')}
          </p>
          <div className="columns-heading">
            <h3>{t('Columns')}</h3>
            <button
              type="button"
              className="secondary"
              disabled={columns.length >= 30}
              onClick={() => setColumns((previous) => [...previous, { ...newColumn(), label: '' }])}
            >
              ＋ {t('Add column')}
            </button>
          </div>
          <div className="column-definitions">
            {columns.map((column, index) => {
              const builtin = table?.kind !== 'custom' && Boolean(builtinLabels[column.id]);
              const existing = Boolean(table?.columns.some((saved) => saved.id === column.id));
              return (
                <div className="column-definition" key={column.id}>
                  <div className="column-fields">
                    <label>
                      {t('Column label')} {index + 1}
                      <input
                        value={column.label}
                        maxLength={80}
                        placeholder={builtin ? t(builtinLabels[column.id]) : t('Column label')}
                        required={!builtin}
                        onChange={(event) => change(column.id, { label: event.target.value })}
                      />
                    </label>
                    <label>
                      {t('Column type')} {index + 1}
                      <select
                        value={column.type}
                        disabled={builtin || (existing && rowCount > 0)}
                        onChange={(event) => {
                          const type = event.target.value as ColumnType;
                          change(column.id, { type });
                          if (type === 'choice' && !optionTexts[column.id])
                            setOptionTexts((previous) => ({
                              ...previous,
                              [column.id]: `${t('First choice')}\n${t('Second choice')}`,
                            }));
                        }}
                      >
                        {column.type === 'image' ? (
                          <option value="image">{t('Portrait')}</option>
                        ) : (
                          types.map((type) => (
                            <option key={type} value={type}>
                              {t(`type.${type}`)}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                  </div>
                  {column.type === 'choice' && (
                    <label>
                      {t('Choices (one per line)')}
                      <textarea
                        rows={3}
                        value={optionTexts[column.id] ?? column.options.join('\n')}
                        onChange={(event) =>
                          setOptionTexts((previous) => ({
                            ...previous,
                            [column.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                  )}
                  <div className="column-options">
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={column.locked}
                        onChange={(event) => change(column.id, { locked: event.target.checked })}
                      />
                      {t('Lock existing values')}
                    </label>
                    {!builtin && (
                      <button
                        type="button"
                        className="text-button"
                        disabled={columns.length === 1 || (existing && rowCount > 0)}
                        onClick={() =>
                          setColumns((previous) =>
                            previous.filter((value) => value.id !== column.id),
                          )
                        }
                      >
                        {t('Remove column')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="field-hint">
            {t(
              'Renaming keeps IDs and links intact. Existing columns keep their types once records are added.',
            )}
          </p>
          <div className="editor-actions">
            <button type="button" className="secondary" onClick={onClose}>
              {t('Cancel')}
            </button>
            <button type="submit">{t(busy ? 'Saving…' : 'Save table')}</button>
          </div>
        </fieldset>
      </form>
    </EditorDialog>
  );
}
