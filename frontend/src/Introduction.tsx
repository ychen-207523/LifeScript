import type { World } from './api';
import { useI18n } from './i18n';

export default function Introduction({
  worlds,
  activeId,
  loading,
  error,
  onCreate,
  onRetry,
  onEnter,
}: {
  worlds: World[];
  activeId?: string;
  loading: boolean;
  error: string;
  onCreate: () => void;
  onRetry: () => void;
  onEnter: (id: string) => void;
}) {
  const { language, t } = useI18n();
  return (
    <main className="introduction">
      <section className="intro-hero" aria-labelledby="intro-title">
        <p className="eyebrow">{t('EVERY DAY, ANOTHER PAGE.')}</p>
        <h1 id="intro-title">
          {t('Your everyday life.')}
          <br />
          <em>{t('An extraordinary story.')}</em>
        </h1>
        <p className="intro-description">
          {t(
            'Welcome to Script, a place to imagine another world and give your everyday efforts a story of their own.',
          )}
        </p>
        <button className="intro-create" onClick={onCreate}>
          {t('Create your world')} <span aria-hidden="true">→</span>
        </button>
        <p className="intro-reassurance">
          {t('Start with an idea. The rest can unfold along the way.')}
        </p>
      </section>
      <ol className="intro-steps" aria-label={t('The idea behind Script')}>
        <li>
          <span aria-hidden="true">01</span>
          <h2>{t('Imagine your beginning')}</h2>
          <p>{t('Choose a setting, create your protagonist, and give them a wish to follow.')}</p>
        </li>
        <li>
          <span aria-hidden="true">02</span>
          <h2>{t('Grow through everyday life')}</h2>
          <p>{t('The vision: completed tasks and habits help your protagonist grow.')}</p>
        </li>
        <li>
          <span aria-hidden="true">03</span>
          <h2>{t('Let the journey remember')}</h2>
          <p>{t('Keep the people, places, and discoveries that make your world yours.')}</p>
        </li>
      </ol>
      <p className="intro-preview-note">
        {t(
          'In this preview, you can build your world and keep its records. Tasks, habits, and AI chapters are still to come.',
        )}
      </p>
      <section className="intro-library" aria-label={t('Saved worlds')}>
        {loading ? (
          <p role="status">{t('Opening your worlds…')}</p>
        ) : error ? (
          <div>
            <p role="alert">{t(error)}</p>
            <button className="text-button" onClick={onRetry}>
              {t('Try again')}
            </button>
          </div>
        ) : worlds.length > 0 ? (
          <details key={language}>
            <summary>{t('Already started a story? Open your saved worlds')}</summary>
            <ul>
              {worlds.map((world) => (
                <li key={world.id}>
                  <span>{world.name}</span>
                  <button
                    className="secondary"
                    onClick={() => onEnter(world.id)}
                    aria-label={t('Enter {name}', { name: world.name })}
                  >
                    {t(world.id === activeId ? 'Continue' : 'Enter world')}{' '}
                    <span aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <p>
            {t('Your first world begins with you. Nothing is created until you choose to save it.')}
          </p>
        )}
      </section>
    </main>
  );
}
