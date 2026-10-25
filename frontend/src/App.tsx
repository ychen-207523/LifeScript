import { useEffect, useRef, useState } from 'react';
import { listWorlds } from './api';
import type { World } from './api';
import WorldForm from './WorldForm';
import WorldDesign from './WorldDesign';
import Introduction from './Introduction';
import WorldIllustration from './WorldIllustration';
import { CoverPicker } from './cover';
import { useI18n } from './i18n';
import type { Language } from './i18n';

const attributes = ['Knowledge', 'Vitality', 'Creativity', 'Connection', 'Discipline'];

function savedSelections(): Partial<Record<Language, string>> {
  try {
    const legacy = localStorage.getItem('script.activeWorld') ?? undefined;
    return {
      en: localStorage.getItem('script.activeWorld.en') ?? legacy,
      'zh-CN': localStorage.getItem('script.activeWorld.zh-CN') ?? legacy,
    };
  } catch {
    return {};
  }
}

export default function App() {
  const { language, setLanguage, t } = useI18n();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [selected, setSelected] = useState(savedSelections);
  const [creating, setCreating] = useState(false);
  const [home, setHome] = useState(true);
  const [designOpen, setDesignOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);

  // Older records without a language belong to the English collection.
  const languageWorlds = worlds.filter((world) => (world.storyLanguage ?? 'en') === language);
  const active =
    languageWorlds.find((world) => world.id === selected[language]) ?? languageWorlds[0] ?? null;

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      setWorlds(await listWorlds());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load your worlds.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [home, creating, designOpen]);
  useEffect(() => {
    if (active)
      try {
        localStorage.setItem(`script.activeWorld.${language}`, active.id);
      } catch {
        /* Selection remains usable in this session. */
      }
  }, [active?.id, language]);

  function created(world: World) {
    setWorlds((previous) => [world, ...previous]);
    setSelected((previous) => ({ ...previous, [world.storyLanguage]: world.id }));
    setCreating(false);
    setHome(false);
    requestAnimationFrame(() => heading.current?.focus());
  }
  function updated(world: World) {
    setWorlds((previous) => previous.map((saved) => (saved.id === world.id ? world : saved)));
  }

  return (
    <div className="app-shell">
      <header className="topbar simple-topbar">
        <a
          className="brand"
          href="/"
          aria-label={t('Script home')}
          onClick={(event) => {
            event.preventDefault();
            setCreating(false);
            setDesignOpen(false);
            setHome(true);
          }}
        >
          <span className="brand-mark">s</span>script<span className="brand-dot">✦</span>
        </a>
        <select
          className="language-switch"
          aria-label={t('Interface language')}
          value={language}
          onChange={(event) => setLanguage(event.target.value as Language)}
        >
          <option value="en">English</option>
          <option value="zh-CN">中文</option>
        </select>
      </header>
      {home && !creating ? (
        <Introduction
          worlds={languageWorlds}
          activeId={active?.id}
          loading={loading}
          error={loadError}
          onCreate={() => setCreating(true)}
          onRetry={() => void load()}
          onEnter={(id) => {
            setSelected((previous) => ({ ...previous, [language]: id }));
            setDesignOpen(false);
            setHome(false);
          }}
        />
      ) : loading ? (
        <main className="state-message" role="status">
          <p>{t('Opening your worlds…')}</p>
        </main>
      ) : loadError ? (
        <main className="state-message">
          <h1>{t('Let’s find our way back.')}</h1>
          <p role="alert">{t(loadError)}</p>
          <button onClick={() => void load()}>{t('Try again')}</button>
        </main>
      ) : creating ? (
        <main className="setup-layout">
          <WorldForm onCreated={created} onCancel={() => setCreating(false)} />
        </main>
      ) : active && designOpen ? (
        <WorldDesign
          key={active.id}
          world={active}
          onUpdated={updated}
          onBack={() => setDesignOpen(false)}
          onReload={() => void load()}
        />
      ) : active ? (
        <main className="dashboard simple-dashboard">
          <button className="text-button home-back" onClick={() => setHome(true)}>
            ← {t('Back to introduction')}
          </button>
          <div className="home-toolbar">
            <h1 ref={heading} tabIndex={-1}>
              {active.name}
            </h1>
            <div className="home-actions">
              {languageWorlds.length > 1 && (
                <select
                  aria-label={t('Your worlds')}
                  value={active.id}
                  onChange={(event) =>
                    setSelected((previous) => ({ ...previous, [language]: event.target.value }))
                  }
                >
                  {languageWorlds.map((world) => (
                    <option key={world.id} value={world.id}>
                      {world.name}
                    </option>
                  ))}
                </select>
              )}
              <button className="secondary" onClick={() => setCreating(true)}>
                ＋ {t('New world')}
              </button>
            </div>
          </div>
          <section className="story-home" aria-label={t('Your world')}>
            <div className="story-home-cover">
              <WorldIllustration src={active.coverUrl} />
            </div>
            <div className="story-home-content">
              <p className="world-introduction user-copy">{active.setting}</p>
              <div className="character-summary">
                <Portrait url={active.protagonist.portraitUrl} name={active.protagonist.name} />
                <div>
                  <span className="summary-label">{t('Protagonist')}</span>
                  <h2>{active.protagonist.name}</h2>
                </div>
              </div>
              <details className="home-details" key={`character-${active.id}`}>
                <summary>{t('Character details')}</summary>
                <p className="user-copy">{active.protagonist.background}</p>
                {active.protagonistWish && (
                  <p className="user-copy">
                    <strong>{t('Protagonist’s wish')}: </strong>
                    {active.protagonistWish}
                  </p>
                )}
                <dl className="compact-attributes">
                  {attributes.map((attribute) => (
                    <div key={attribute}>
                      <dt>{t(attribute)}</dt>
                      <dd>
                        {active.protagonist.attributes[attribute]} <small>{t('XP')}</small>
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
              <button className="secondary world-design-link" onClick={() => setDesignOpen(true)}>
                {t('Develop this world')} →
              </button>
              <details className="home-details" key={`world-${active.id}`}>
                <summary>{t('World settings')}</summary>
                <dl className="world-settings">
                  <div>
                    <dt>{t('How would you like the story to feel?')}</dt>
                    <dd>{t(active.tone)}</dd>
                  </div>
                  {active.rules && (
                    <div>
                      <dt>{t('The rules of your world')}</dt>
                      <dd className="user-copy">{active.rules}</dd>
                    </div>
                  )}
                </dl>
                <CoverPicker key={active.id} world={active} onUpdated={updated} />
              </details>
            </div>
          </section>
        </main>
      ) : (
        <main className="state-message empty-library">
          <h1>{t(language === 'zh-CN' ? 'Your Chinese worlds' : 'Your English worlds')}</h1>
          <p>{t('Start a new story in this language. Your other worlds are kept separately.')}</p>
          <button onClick={() => setCreating(true)}>{t('Create a world')}</button>
        </main>
      )}
    </div>
  );
}

function Portrait({ url, name }: { url: string | null; name: string }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return url && !failed ? (
    <img
      className="character-portrait"
      src={url}
      alt={t('Portrait of {name}', { name })}
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="character-placeholder" aria-label={t('Character portrait placeholder')}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="43" r="20" />
        <path d="M22 112V95a38 38 0 0 1 76 0v17Z" />
      </svg>
    </div>
  );
}
