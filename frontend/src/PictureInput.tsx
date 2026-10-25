import { useRef } from 'react';
import { useI18n } from './i18n';

export default function PictureInput({ id, file, onChoose }: { id: string; file: File | null; onChoose: (file: File | undefined) => void }) {
  const { language, t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  return <div className="picture-input">
    <input key={language} ref={input} id={id} hidden type="file" accept="image/png,image/jpeg" onChange={event => {
      const selected = event.target.files?.[0];
      event.target.value = '';
      onChoose(selected);
    }}/>
    <button type="button" className="secondary" onClick={() => input.current?.click()}>{t('Choose picture')}</button>
    {file && <span>{file.name}</span>}
  </div>;
}
