import { useState, useEffect } from 'react';
import { useI18n } from './i18n';

// Replace frontend/public/images/default-cover.png to change the app-wide fallback.
export const DEFAULT_COVER_URL = '/images/default-cover.png';

export default function WorldIllustration({ src }: { src?: string | null }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <img
    className="landscape"
    src={!src || failed ? DEFAULT_COVER_URL : src}
    onError={() => setFailed(true)}
    alt={t(src && !failed ? 'Your world cover' : 'Cover illustration')}
    width={1122}
    height={1402}
  />;
}
