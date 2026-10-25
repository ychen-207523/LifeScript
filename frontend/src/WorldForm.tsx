import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ApiError, createWorld } from './api';
import type { World, WorldDraft } from './api';
import WorldIllustration from './WorldIllustration';
import PictureInput from './PictureInput';
import { useI18n } from './i18n';
import { useImagePreview, validImage } from './cover';

const tones = [
  'Wonder & discovery',
  'Cozy & hopeful',
  'Mystery & intrigue',
  'Epic & adventurous',
  'Bittersweet & reflective',
];
const seeds = [
  {
    title: 'A second chance at firsts',
    label: 'Academy days',
    symbol: '01',
    name: 'Asteria Academy',
    chineseName: '星原学园',
    tone: 'Wonder & discovery',
    setting:
      'An ordinary student finds themselves at an academy in another world. Between unfamiliar lessons, a shared dormitory, and new friendships, they begin to discover the life they want to build.',
    chineseSetting:
      '一名普通学生来到了异世界的学园。陌生的课程、热闹的宿舍、新结识的朋友，让主角渐渐发现，自己究竟想过怎样的人生。',
  },
  {
    title: 'A small quest. A bigger life.',
    label: 'Guild adventure',
    symbol: '02',
    name: 'The Faraway City',
    chineseName: '远方之城',
    tone: 'Epic & adventurous',
    setting:
      'You arrive in a lively city with a borrowed map and nowhere to stay. A tiny adventurers’ guild offers your first job, an unlikely group of companions, and a reason to call this unfamiliar place home.',
    chineseSetting:
      '你带着借来的地图，来到一座热闹却陌生的城市。一个不起眼的冒险者公会，给了你第一份委托、一群意想不到的同伴，以及把这里当成家的理由。',
  },
  {
    title: 'One ordinary day changes',
    label: 'Parallel lives',
    symbol: '03',
    name: 'Beyond Platform Seven',
    chineseName: '七号站台之外',
    tone: 'Mystery & intrigue',
    setting:
      'Taking the wrong train after an ordinary day brings you to a seaside town in another world. While finding your way home, you form unexpected friendships and discover that both lives have something to teach you.',
    chineseSetting:
      '平凡的一天结束后，你搭错了列车，来到另一个世界的海边小镇。在寻找归途的过程中，你遇见新的朋友，也发现两种人生，都藏着值得学习的事。',
  },
];

const blankDraft = (storyLanguage: 'en' | 'zh-CN'): WorldDraft => ({
  name: '',
  setting: '',
  tone: '',
  rules: '',
  protagonistName: '',
  protagonistBackground: '',
  storyLanguage,
  protagonistWish: '',
  startingSituation: '',
  openingScene: '',
});

export default function WorldForm({
  onCreated,
  onCancel,
}: {
  onCreated: (world: World) => void;
  onCancel?: () => void;
}) {
  const { language, t } = useI18n();
  // Keep separate in-memory drafts, including images, when switching collections.
  const [drafts, setDrafts] = useState(() => ({
    en: blankDraft('en'),
    'zh-CN': blankDraft('zh-CN'),
  }));
  const [steps, setSteps] = useState<{ en: 1 | 2; 'zh-CN': 1 | 2 }>({ en: 1, 'zh-CN': 1 });
  const [images, setImages] = useState<
    Record<'en' | 'zh-CN', { portrait: File | null; cover: File | null }>
  >({ en: { portrait: null, cover: null }, 'zh-CN': { portrait: null, cover: null } });
  const draft = drafts[language];
  const step = steps[language];
  const { portrait, cover } = images[language];
  const setDraft = (updateDraft: (previous: WorldDraft) => WorldDraft) =>
    setDrafts((previous) => ({ ...previous, [language]: updateDraft(previous[language]) }));
  const setStep = (value: 1 | 2) => setSteps((previous) => ({ ...previous, [language]: value }));
  const setPortrait = (file: File | null) =>
    setImages((previous) => ({
      ...previous,
      [language]: { ...previous[language], portrait: file },
    }));
  const setCover = (file: File | null) =>
    setImages((previous) => ({ ...previous, [language]: { ...previous[language], cover: file } }));
  const preview = useImagePreview(portrait);
  const coverPreview = useImagePreview(cover);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const errorBox = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (error) errorBox.current?.focus();
    else heading.current?.focus();
  }, [step, error]);
  useEffect(() => {
    setError('');
    setFieldErrors({});
  }, [language]);

  function update(field: keyof WorldDraft, value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: '' }));
  }
  function useSeed(seed: (typeof seeds)[number]) {
    setDraft((previous) => ({
      ...previous,
      name: previous.storyLanguage === 'zh-CN' ? seed.chineseName : seed.name,
      setting: previous.storyLanguage === 'zh-CN' ? seed.chineseSetting : seed.setting,
      tone: t(seed.tone),
    }));
    setFieldErrors({});
    setError('');
  }
  function selectImage(file: File | undefined, kind: 'portrait' | 'cover') {
    setError('');
    if (!file) return;
    if (!validImage(file)) {
      setError('Let’s try a PNG or JPEG image, 5 MB or smaller.');
      return;
    }
    if (kind === 'portrait') setPortrait(file);
    else setCover(file);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const errors: Record<string, string> = {};
    const fields: (keyof WorldDraft)[] =
      step === 1
        ? ['name', 'setting', 'tone', 'storyLanguage']
        : ['name', 'setting', 'tone', 'storyLanguage', 'protagonistName', 'protagonistBackground'];
    for (const field of fields)
      if (!draft[field].trim()) errors[field] = 'Add a little detail here to continue.';
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length) {
      setError('Just a little more to make this yours. Check the fields below.');
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
    setSaving(true);
    try {
      onCreated(await createWorld(draft, portrait, cover));
    } catch (failure) {
      if (failure instanceof ApiError) {
        setFieldErrors(
          Object.fromEntries(
            Object.keys(failure.fields).map((field) => [field, 'Please check this field.']),
          ),
        );
        if (
          ['name', 'setting', 'tone', 'rules', 'storyLanguage'].some(
            (field) => failure.fields[field],
          )
        )
          setStep(1);
      }
      setError(
        failure instanceof Error
          ? failure.message
          : 'Your beginning couldn’t be saved yet. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }
  function textField(
    field: keyof WorldDraft,
    label: string,
    placeholder: string,
    maxLength: number,
    multiline = false,
    optional = false,
    hint?: string,
  ) {
    const descriptionIds = [hint ? `${field}-hint` : '', fieldErrors[field] ? `${field}-error` : '']
      .filter(Boolean)
      .join(' ');
    const shared = {
      id: field,
      name: field,
      value: draft[field],
      placeholder: t(placeholder),
      maxLength,
      required: !optional,
      'aria-invalid': Boolean(fieldErrors[field]),
      'aria-describedby': descriptionIds || undefined,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        update(field, event.target.value),
    };
    return (
      <div className="field">
        <label htmlFor={field}>
          {t(label)}
          {optional && <span className="optional">{t('Optional')}</span>}
        </label>
        {hint && (
          <p className="field-hint" id={`${field}-hint`}>
            {t(hint)}
          </p>
        )}
        {multiline ? <textarea {...shared} rows={3} /> : <input {...shared} />}
        {fieldErrors[field] && (
          <span className="field-error" id={`${field}-error`}>
            {t(fieldErrors[field])}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <aside className="story-panel">
        <div className="story-art">
          <WorldIllustration src={coverPreview} />
          <span className="floating-note">
            <span aria-hidden="true">⟡</span> {t('Every new world starts with a first page.')}
          </span>
        </div>
        <div className="story-panel-copy">
          <p className="eyebrow">{t('VOLUME 01 / YOUR STORY BEGINS')}</p>
          <h2>
            {t('An ordinary day.')} <br />
            {t('An extraordinary beginning.')}
          </h2>
          <p>
            {t('You don’t need to know how it ends.')} <br />
            {t('Just where you’d like to begin.')}
          </p>
          <div className="preview-divider" />
          <p className="tiny-label">
            {t(draft.name ? 'THE SETTING OF YOUR STORY' : 'AN UNWRITTEN FIRST CHAPTER')}
          </p>
          <div className="live-world-name">
            {draft.name || t('What happens next is yours to discover.')}
          </div>
          {draft.protagonistName && (
            <p className="preview-character">
              {t('Protagonist · {name}', { name: draft.protagonistName })}
            </p>
          )}
        </div>
      </aside>
      <section className="setup-panel">
        <nav className="setup-steps" aria-label={t('Create your world')}>
          <ol>
            <li
              aria-current={step === 1 ? 'step' : undefined}
              className={step === 2 ? 'complete' : 'current'}
            >
              <span>{step === 2 ? '✓' : '1'}</span>
              {t('Your world')}
            </li>
            <li className="step-connector" aria-hidden="true" />
            <li
              aria-current={step === 2 ? 'step' : undefined}
              className={step === 2 ? 'current' : ''}
            >
              <span>2</span>
              {t('Your protagonist')}
            </li>
          </ol>
        </nav>
        <div className="setup-intro">
          <p className="eyebrow">
            {t(
              step === 1
                ? 'PROLOGUE / A DIFFERENT KIND OF EVERYDAY'
                : 'CHARACTER ORIGIN / A NEW BEGINNING',
            )}
          </p>
          <h1 ref={heading} tabIndex={-1}>
            {step === 1 ? (
              <>
                {t('A new world.')} <br />
                {t('A story that’s yours')}
                <span className="heading-dot">{language === 'zh-CN' ? '。' : '.'}</span>
              </>
            ) : (
              <>
                {t('Who will you')} <br />
                {t('become')}
                <span className="heading-dot">{language === 'zh-CN' ? '？' : '?'}</span>
              </>
            )}
          </h1>
          <p>
            {t(
              step === 1
                ? 'An unfamiliar town. An unexpected encounter. A life you never imagined. Let’s find the setting for your first chapter.'
                : 'Every story starts with someone. Give yours a name, a little history, and something they’re hoping to find.',
            )}
          </p>
        </div>
        <form onSubmit={(event) => void submit(event)} noValidate>
          {error && (
            <div className="error-banner" role="alert" ref={errorBox} tabIndex={-1}>
              {t(error)}
            </div>
          )}
          <fieldset disabled={saving}>
            <legend className="sr-only">
              {t(step === 1 ? 'Build your world' : 'Meet your protagonist')}
            </legend>
            {step === 1 ? (
              <>
                <div className="seed-heading">
                  <h2>{t('Find your story’s starting point')}</h2>
                  <span>{t('Or write your own below')}</span>
                </div>
                <div className="world-seeds">
                  {seeds.map((seed) => {
                    const selected =
                      (draft.name === seed.name && draft.setting === seed.setting) ||
                      (draft.name === seed.chineseName && draft.setting === seed.chineseSetting);
                    return (
                      <button
                        key={seed.symbol}
                        type="button"
                        className={`seed-card ${selected ? 'selected' : ''}`}
                        onClick={() => useSeed(seed)}
                        aria-pressed={selected}
                        aria-label={t('Try {label}: {title}', {
                          label: t(seed.label),
                          title: t(seed.title),
                        })}
                      >
                        <span className="seed-symbol" aria-hidden="true">
                          {seed.symbol}
                        </span>
                        <span>
                          <strong>{t(seed.label)}</strong>
                          <small>{t(seed.title)}</small>
                        </span>
                        <span className="seed-arrow" aria-hidden="true">
                          ↗
                        </span>
                      </button>
                    );
                  })}
                </div>
                {textField('name', 'World name', 'Where does your next chapter take place?', 100)}
                {textField(
                  'setting',
                  'A glimpse of this world',
                  'A bustling city, a sky full of unfamiliar stars, a letter that changes everything…',
                  5000,
                  true,
                  false,
                  'The places, people, or possibilities that make it feel alive.',
                )}
                {textField(
                  'tone',
                  'How would you like the story to feel?',
                  'Gentle adventure with a little mystery…',
                  100,
                  false,
                  false,
                  'Write your own atmosphere, or choose a suggestion and make it yours.',
                )}
                <div
                  className="tone-suggestions"
                  role="group"
                  aria-label={t('Atmosphere suggestions')}
                >
                  {tones.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      className="secondary"
                      aria-pressed={draft.tone === tone || draft.tone === t(tone)}
                      onClick={() => update('tone', t(tone))}
                    >
                      {t(tone)}
                    </button>
                  ))}
                </div>
                <div className="portrait-upload">
                  <div className="upload-preview">
                    {coverPreview ? (
                      <img src={coverPreview} alt={t('Selected world cover')} />
                    ) : (
                      <span aria-hidden="true">▤</span>
                    )}
                  </div>
                  <div>
                    <label htmlFor="cover">
                      {t('Use your own cover')} <span className="optional">{t('Optional')}</span>
                    </label>
                    <p>{t('PNG or JPEG, up to 5 MB. Leave empty to use the default cover.')}</p>
                    <PictureInput
                      id="cover"
                      file={cover}
                      onChoose={(file) => selectImage(file, 'cover')}
                    />
                    {cover && (
                      <button type="button" className="text-button" onClick={() => setCover(null)}>
                        {t('Remove picture')}
                      </button>
                    )}
                  </div>
                </div>
                <details>
                  <summary>
                    {t('Add world rules & boundaries')} <span>{t('Optional')}</span>
                  </summary>
                  {textField(
                    'rules',
                    'Anything this world should know?',
                    'Magic is rare. Keep things hopeful. No graphic violence.',
                    3000,
                    true,
                    true,
                  )}
                </details>
              </>
            ) : (
              <>
                <div className="world-recap">
                  <span aria-hidden="true">✧</span>
                  <div>
                    <span>{t('Your adventure awaits in')}</span>
                    <strong>{draft.name}</strong>
                  </div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setStep(1);
                      setError('');
                    }}
                  >
                    {t('Edit world')}
                  </button>
                </div>
                {textField(
                  'protagonistName',
                  'What should we call them?',
                  'Your protagonist’s name',
                  80,
                )}
                {textField(
                  'protagonistBackground',
                  'Their origin story',
                  'An ordinary student starting their first guild job, hoping to find a place to belong in an unfamiliar world…',
                  3000,
                  true,
                  false,
                  'Who were they before arriving? What are they hoping to become?',
                )}
                <details>
                  <summary>
                    {t('Give the story a direction')} <span>{t('Optional')}</span>
                  </summary>
                  {textField(
                    'protagonistWish',
                    'Protagonist’s wish',
                    'What do they hope to find, achieve, or change?',
                    2000,
                    true,
                    true,
                  )}
                  {textField(
                    'startingSituation',
                    'Starting situation',
                    'Where are they, and what is happening as the story begins?',
                    5000,
                    true,
                    true,
                  )}
                  {textField(
                    'openingScene',
                    'Opening scene / first message',
                    'Write the first passage the reader will see. End with a reason to respond.',
                    15000,
                    true,
                    true,
                  )}
                </details>
                <div className="portrait-upload">
                  <div className="upload-preview">
                    {preview ? (
                      <img src={preview} alt={t('Your selected character portrait')} />
                    ) : (
                      <span aria-hidden="true">✦</span>
                    )}
                  </div>
                  <div>
                    <label htmlFor="portrait">
                      {t('Put a face to the name')}{' '}
                      <span className="optional">{t('Optional')}</span>
                    </label>
                    <p>{t('A picture you love. PNG or JPEG, up to 5 MB.')}</p>
                    <PictureInput
                      id="portrait"
                      file={portrait}
                      onChoose={(file) => selectImage(file, 'portrait')}
                    />
                    {portrait && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setPortrait(null)}
                      >
                        {t('Remove picture')}
                      </button>
                    )}
                  </div>
                </div>
                <div className="gentle-note">
                  <span aria-hidden="true">⟡</span>
                  <p>
                    {t('No legendary hero required.')}
                    <br />
                    <strong>{t('An ordinary person can have an extraordinary story.')}</strong>
                  </p>
                </div>
              </>
            )}
          </fieldset>
          <div className="form-actions">
            {step === 2 ? (
              <button
                type="button"
                className="secondary"
                disabled={saving}
                onClick={() => {
                  setStep(1);
                  setError('');
                }}
              >
                ← {t('Back')}
              </button>
            ) : (
              onCancel && (
                <button type="button" className="secondary" disabled={saving} onClick={onCancel}>
                  {t('Cancel')}
                </button>
              )
            )}
            <button type="submit" disabled={saving}>
              {t(
                saving
                  ? 'Saving your first page…'
                  : step === 1
                    ? 'Meet my protagonist'
                    : 'Begin my story',
              )}
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <p className="form-note">
            {t(
              step === 1
                ? 'A first draft is enough. Let your imagination lead.'
                : 'Your world and character will be saved together.',
            )}
          </p>
        </form>
      </section>
    </>
  );
}
