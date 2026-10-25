import { response } from './api';

export type ColumnType =
  'text' | 'number' | 'checkbox' | 'choice' | 'place' | 'character' | 'image';
export type Column = {
  id: string;
  label: string;
  type: ColumnType;
  options: string[];
  locked: boolean;
};
export type WorldTable = {
  id: string;
  worldId: string;
  kind: 'places' | 'characters' | 'custom';
  name: string;
  columns: Column[];
  useInStory: boolean;
  revision: number;
};
export type Cell = string | number | boolean | null;
export type WorldRow = {
  id: string;
  worldId: string;
  tableId: string;
  cells: Record<string, Cell>;
  portraitUrl: string | null;
  revision: number;
};
const base = (world: string) => `/api/v1/worlds/${world}/tables`;
const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
export const listTables = (world: string) => response<WorldTable[]>(fetch(base(world)));
export const listRows = (world: string, table: string) =>
  response<WorldRow[]>(fetch(`${base(world)}/${table}/rows`));
export function saveTable(
  world: string,
  table: WorldTable | null,
  values: { name: string; columns: Column[]; useInStory: boolean },
) {
  return response<WorldTable>(
    fetch(
      table ? `${base(world)}/${table.id}` : base(world),
      json(table ? 'PUT' : 'POST', { ...values, revision: table?.revision ?? 0 }),
    ),
  );
}
export const saveRow = (
  world: string,
  table: WorldTable,
  id: string,
  cells: Record<string, Cell>,
  revision: number,
) =>
  response<WorldRow>(
    fetch(
      `${base(world)}/${table.id}/rows/${id}`,
      json('PUT', { cells, revision, tableRevision: table.revision }),
    ),
  );
export function uploadRowPortrait(world: string, row: WorldRow, file: File) {
  const body = new FormData();
  body.append('portrait', file);
  body.append('revision', String(row.revision));
  return response<WorldRow>(
    fetch(`${base(world)}/characters/rows/${row.id}/portrait`, { method: 'PUT', body }),
  );
}
export const builtinLabels: Record<string, string> = {
  name: 'Name',
  description: 'Description',
  connectedPlace: 'Connected place',
  discoveredDetails: 'Discovered details',
  portrait: 'Portrait',
  appearance: 'Appearance',
  relationships: 'Relationships',
  currentLocation: 'Current location',
  status: 'Status',
  persistent: 'Keep this character',
  notes: 'Notes',
};
