import { useEffect, useState } from 'react';
import type { World } from './api';
import { builtinLabels, listRows, listTables } from './knowledge-api';
import type { Column, WorldRow, WorldTable } from './knowledge-api';
import { useI18n } from './i18n';
import TableEditor from './TableEditor';
import RowEditor from './RowEditor';

export default function WorldRecords({ world }: { world: World }) {
  const { t, language } = useI18n();
  const [tables, setTables] = useState<WorldTable[]>([]),
    [selected, setSelected] = useState('places');
  const [rows, setRows] = useState<WorldRow[]>([]),
    [places, setPlaces] = useState<WorldRow[]>([]),
    [characters, setCharacters] = useState<WorldRow[]>([]);
  const [loading, setLoading] = useState(true),
    [rowsLoading, setRowsLoading] = useState(true),
    [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [editor, setEditor] = useState<
    { kind: 'table'; table: WorldTable | null } | { kind: 'row'; row: WorldRow | null } | null
  >(null);
  const table = tables.find((value) => value.id === selected);
  const tableLabel = (value: WorldTable) =>
    value.name ||
    t(
      value.kind === 'places'
        ? 'Places'
        : value.kind === 'characters'
          ? 'Characters'
          : 'Custom table',
    );
  const columnLabel = (column: Column) => column.label || t(builtinLabels[column.id] ?? column.id);
  const message = (failure: unknown) =>
    failure instanceof Error
      ? failure.message
      : 'The request could not be completed. Please try again.';
  async function reload() {
    setError('');
    setLoading(true);
    try {
      const result = await listTables(world.id);
      setTables(result);
      setSelected((previous) =>
        result.some((value) => value.id === previous) ? previous : 'places',
      );
      setRefresh((previous) => previous + 1);
    } catch (failure) {
      setError(message(failure));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void reload();
  }, [world.id]);
  useEffect(() => {
    let current = true;
    setRows([]);
    setRowsLoading(true);
    if (!table)
      return () => {
        current = false;
      };
    Promise.all([
      listRows(world.id, table.id),
      listRows(world.id, 'places'),
      listRows(world.id, 'characters'),
    ])
      .then(([saved, p, c]) => {
        if (current) {
          setRows(saved);
          setPlaces(p);
          setCharacters(c);
        }
      })
      .catch((failure) => {
        if (current) setError(message(failure));
      })
      .finally(() => {
        if (current) setRowsLoading(false);
      });
    return () => {
      current = false;
    };
  }, [world.id, table?.id, table?.revision, refresh]);
  function changed() {
    setEditor(null);
    setError('');
    setRefresh((previous) => previous + 1);
  }
  function cell(column: Column, row: WorldRow) {
    const value = row.cells[column.id];
    if (column.type === 'image')
      return row.portraitUrl ? (
        <img className="table-portrait" src={row.portraitUrl} alt={t('Portrait')} />
      ) : (
        <span className="empty-cell">—</span>
      );
    if (value == null || value === '') return <span className="empty-cell">—</span>;
    if (column.type === 'checkbox') return t(value === true ? 'Yes' : 'No');
    if (column.type === 'number') return new Intl.NumberFormat(language).format(Number(value));
    if (column.type === 'place' || column.type === 'character')
      return String(
        (column.type === 'place' ? places : characters).find((target) => target.id === value)?.cells
          .name ?? t('Unavailable link'),
      );
    if (column.type === 'choice' && table?.kind !== 'custom' && column.id === 'status')
      return t(String(value));
    return String(value);
  }
  return (
    <section className="world-records">
      <div className="records-heading">
        <p className="design-description">
          {t(
            'Keep track of places and people as the journey reveals them. Add your own tables when you need more.',
          )}
        </p>
        <button
          className="secondary"
          disabled={loading || tables.length >= 30}
          onClick={() => setEditor({ kind: 'table', table: null })}
        >
          ＋ {t('New table')}
        </button>
      </div>
      {error && (
        <p className="error-banner" role="alert">
          {t(error)}{' '}
          <button className="text-button" onClick={() => void reload()}>
            {t('Reload')}
          </button>
        </p>
      )}
      {loading ? (
        <p role="status">{t('Loading records…')}</p>
      ) : (
        <div className="records-layout">
          <nav className="table-list" aria-label={t('World tables')}>
            {tables.map((value) => (
              <button
                key={value.id}
                aria-current={value.id === selected ? 'page' : undefined}
                onClick={() => {
                  setSelected(value.id);
                  setError('');
                }}
              >
                {tableLabel(value)}
              </button>
            ))}
          </nav>
          {table && (
            <div className="records-content">
              <div className="table-toolbar">
                <h2>{tableLabel(table)}</h2>
                <div>
                  <button
                    className="secondary"
                    disabled={rowsLoading || Boolean(error)}
                    onClick={() => setEditor({ kind: 'table', table })}
                  >
                    {t('Customize table')}
                  </button>
                  <button
                    disabled={rowsLoading || Boolean(error)}
                    onClick={() => setEditor({ kind: 'row', row: null })}
                  >
                    ＋ {t('Add record')}
                  </button>
                </div>
              </div>
              {rowsLoading ? (
                <p role="status">{t('Loading records…')}</p>
              ) : rows.length === 0 ? (
                <div className="empty-records">
                  <p>{t('No records yet. Add the first one whenever your story needs it.')}</p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="knowledge-table">
                    <caption className="sr-only">{tableLabel(table)}</caption>
                    <thead>
                      <tr>
                        {table.columns.map((column) => (
                          <th scope="col" key={column.id}>
                            {columnLabel(column)}
                            {column.locked && (
                              <span className="locked-marker" title={t('Locked')}>
                                {' '}
                                · {t('Locked')}
                              </span>
                            )}
                          </th>
                        ))}
                        <th scope="col">{t('Edit')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          {table.columns.map((column) => (
                            <td key={column.id}>{cell(column, row)}</td>
                          ))}
                          <td>
                            <button
                              className="text-button"
                              aria-label={t('Edit record {name}', {
                                name: String(row.cells.name ?? row.id),
                              })}
                              onClick={() => setEditor({ kind: 'row', row })}
                            >
                              {t('Edit')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="table-footnote">
                {t(
                  table.useInStory
                    ? 'Available to future story context.'
                    : 'Excluded from future story context.',
                )}
              </p>
            </div>
          )}
        </div>
      )}
      {editor?.kind === 'table' && (
        <TableEditor
          worldId={world.id}
          table={editor.table}
          rowCount={editor.table ? rows.length : 0}
          onClose={() => setEditor(null)}
          onSaved={(saved) => {
            setTables((previous) =>
              previous.some((value) => value.id === saved.id)
                ? previous.map((value) => (value.id === saved.id ? saved : value))
                : [...previous, saved],
            );
            setSelected(saved.id);
            changed();
          }}
        />
      )}
      {editor?.kind === 'row' && table && (
        <RowEditor
          worldId={world.id}
          table={table}
          row={editor.row}
          places={places}
          characters={characters}
          onSaved={changed}
          onClose={changed}
          onReload={() => {
            setEditor(null);
            void reload();
          }}
        />
      )}
    </section>
  );
}
