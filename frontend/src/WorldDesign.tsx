import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { updateStorySetup } from './api';
import type { World } from './api';
import { useI18n } from './i18n';
import WorldRecords from './WorldRecords';

export default function WorldDesign({
  world,
  onUpdated,
  onBack,
  onReload,
}: {
  world: World;
  onUpdated: (world: World) => void;
  onBack: () => void;
  onReload: () => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<'opening' | 'records'>('opening');
  return (
    <main className="world-design">
      <div className="design-heading">
        <div>
          <button className="text-button" onClick={onBack}>
            ← {t('Back to world')}
          </button>
          <h1>{world.name}</h1>
        </div>
        <button className="secondary" onClick={onReload}>
          {t('Reload')}
        </button>
      </div>
      <nav className="design-tabs" aria-label={t('World design')}>
        <button
          aria-current={tab === 'opening' ? 'page' : undefined}
          onClick={() => setTab('opening')}
        >
          {t('Opening setup')}
        </button>
        <button
          aria-current={tab === 'records' ? 'page' : undefined}
          onClick={() => setTab('records')}
        >
          {t('World records')}
        </button>
      </nav>
      {tab === 'opening' ? (
        <OpeningSetup world={world} onUpdated={onUpdated} />
      ) : (
        <WorldRecords world={world} />
      )}
    </main>
  );
}

function OpeningSetup({ world, onUpdated }: { world: World; onUpdated: (world: World) => void }) {
  const { t } = useI18n();
  const initial = () => ({
    protagonistWish: world.protagonistWish ?? '',
    startingSituation: world.startingSituation ?? '',
    openingScene: world.openingScene ?? '',
  });
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setDraft(initial());
  }, [world.id, world.setupRevision]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      onUpdated(await updateStorySetup(world, draft));
      setNotice('Opening setup saved.');
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'The request could not be completed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="opening-layout">
      <form className="opening-editor" onSubmit={(event) => void submit(event)}>
        <p className="design-description">
          {t('Give the journey a direction. People and places can appear as you explore.')}
        </p>
        <fieldset disabled={busy}>
          {(
            [
              [
                'protagonistWish',
                'Protagonist’s wish',
                'What do they hope to find, achieve, or change?',
                2000,
              ],
              [
                'startingSituation',
                'Starting situation',
                'Where are they, and what is happening as the story begins?',
                5000,
              ],
              [
                'openingScene',
                'Opening scene / first message',
                'Write the first passage the reader will see. End with a reason to respond.',
                15000,
              ],
            ] as const
          ).map(([key, label, hint, max]) => (
            <div className="field" key={key}>
              <label htmlFor={key}>{t(label)}</label>
              <p className="field-hint" id={`${key}-hint`}>
                {t(hint)}
              </p>
              <textarea
                id={key}
                aria-describedby={`${key}-hint`}
                maxLength={max}
                rows={key === 'openingScene' ? 8 : 3}
                value={draft[key]}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, [key]: event.target.value }))
                }
              />
            </div>
          ))}
          <button type="submit">{t(busy ? 'Saving…' : 'Save opening setup')}</button>
        </fieldset>
        {notice && (
          <p className="editor-notice" role="status">
            {t(notice)}
          </p>
        )}
      </form>
      <section className="opening-preview" aria-label={t('Opening preview')}>
        <p className="eyebrow">{t('Opening preview')}</p>
        <h2>{world.name}</h2>
        <p className="user-copy">
          {draft.openingScene || t('Your first message will appear here.')}
        </p>
      </section>
    </div>
  );
}
