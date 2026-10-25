import { useEffect, useRef, useState } from 'react';
import { updateWorldCover } from './api';
import type { World } from './api';
import { useI18n } from './i18n';

export function useImagePreview(file: File | null) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return preview;
}

export function validImage(file: File) {
  return ['image/png', 'image/jpeg'].includes(file.type) && file.size > 0 && file.size <= 5 * 1024 * 1024;
}

export function CoverPicker({ world, onUpdated }: { world: World; onUpdated: (world: World) => void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  async function upload(file?: File) {
    if (!file || saving) return;
    if (!validImage(file)) { setNotice('Let’s try a PNG or JPEG image, 5 MB or smaller.'); return; }
    setSaving(true); setNotice('');
    try { onUpdated(await updateWorldCover(world.id, file)); setNotice('Cover saved.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'The request could not be completed. Please try again.'); }
    finally { setSaving(false); if (input.current) input.current.value = ''; }
  }
  return <div className="cover-picker">
    <input ref={input} hidden type="file" accept="image/png,image/jpeg" onChange={event => void upload(event.target.files?.[0])}/>
    <button className="secondary" disabled={saving} onClick={() => input.current?.click()}>{t(saving ? 'Saving cover…' : 'Change cover')}</button>
    {notice && <p role="status">{t(notice)}</p>}
  </div>;
}
