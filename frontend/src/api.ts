import type { Language } from './i18n';

export type WorldDraft = {
  name: string;
  setting: string;
  tone: string;
  rules: string;
  protagonistName: string;
  protagonistBackground: string;
  storyLanguage: Language;
  protagonistWish: string;
  startingSituation: string;
  openingScene: string;
};
export type World = {
  id: string;
  name: string;
  setting: string;
  tone: string;
  rules: string;
  createdAt: string;
  storyLanguage: Language;
  coverUrl: string | null;
  protagonistWish: string;
  startingSituation: string;
  openingScene: string;
  setupRevision: number;
  protagonist: {
    id: string;
    name: string;
    background: string;
    attributes: Record<string, number>;
    portraitUrl: string | null;
  };
};
export class ApiError extends Error {
  fields: Record<string, string>;
  constructor(message: string, fields: Record<string, string> = {}) {
    super(message);
    this.fields = fields;
  }
}
export async function response<T>(request: Promise<Response>): Promise<T> {
  let result: Response;
  try {
    result = await request;
  } catch {
    throw new ApiError(
      'Could not reach Script. Check that the backend is running, then try again.',
    );
  }
  if (!result.ok) {
    const problem = await result.json().catch(() => ({}));
    throw new ApiError(
      problem.detail ?? 'The request could not be completed. Please try again.',
      problem.fields,
    );
  }
  return result.json();
}
export function updateStorySetup(
  world: World,
  setup: Pick<World, 'protagonistWish' | 'startingSituation' | 'openingScene'>,
) {
  return response<World>(
    fetch(`/api/v1/worlds/${world.id}/setup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...setup, revision: world.setupRevision ?? 0 }),
    }),
  );
}
export const listWorlds = () => response<World[]>(fetch('/api/v1/worlds'));
export function createWorld(draft: WorldDraft, portrait: File | null, cover: File | null) {
  const body = new FormData();
  body.append('world', new Blob([JSON.stringify(draft)], { type: 'application/json' }));
  if (portrait) body.append('portrait', portrait);
  if (cover) body.append('cover', cover);
  return response<World>(fetch('/api/v1/worlds', { method: 'POST', body }));
}
export function updateWorldCover(worldId: string, cover: File) {
  const body = new FormData();
  body.append('cover', cover);
  return response<World>(fetch(`/api/v1/worlds/${worldId}/cover`, { method: 'PUT', body }));
}
