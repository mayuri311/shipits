import React from 'react';
import { useI18n, SupportedLanguageCode } from '@/contexts/I18nContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LANG_OPTIONS: Array<{ code: SupportedLanguageCode; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'sv', label: 'Svenska' },
  { code: 'pl', label: 'Polski' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
  { code: 'he', label: 'עברית' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'th', label: 'ไทย' },
  { code: 'id', label: 'Bahasa Indonesia' },
];

export function LanguageSelector({ className = '' }: { className?: string }) {
  const { language, setLanguage, t } = useI18n();
  return (
    <div className={`pointer-events-auto ${className}`}>
      <Select value={language} onValueChange={(v) => setLanguage(v as SupportedLanguageCode)}>
        <SelectTrigger className="w-36 sm:w-[180px]">
          <SelectValue placeholder={t('language', 'Language')} />
        </SelectTrigger>
        <SelectContent className="z-[60]">
          {LANG_OPTIONS.map(opt => (
            <SelectItem key={opt.code} value={opt.code}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default LanguageSelector;

