import React, { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';

export type ShortSourceType = 'project' | 'project_update' | 'comment' | 'user' | 'message' | 'event' | 'ui' | 'list';

export function TranslatedText({
  sourceType,
  sourceId,
  field,
  text,
  sourceLanguage,
  className = '',
  as: As = 'span',
}: {
  sourceType: ShortSourceType;
  sourceId: string;
  field: string;
  text: string;
  sourceLanguage?: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}) {
  const { language } = useI18n();
  const [translated, setTranslated] = useState<string | null>(null);
  const [provider, setProvider] = useState<'azure-openai' | 'community' | null>(null);
  const needsTranslation = useMemo(() => {
    const src = (sourceLanguage || 'en').slice(0, 2);
    return language && language !== (src as any);
  }, [language, sourceLanguage]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!needsTranslation) { setTranslated(null); setProvider(null); return; }
      try {
        const resp = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sourceType, sourceId, field, text, sourceLanguage, targetLanguage: language }),
        });
        const json = await resp.json();
        if (!resp.ok || !json.success) throw new Error(json.error || 'Failed');
        if (cancelled) return;
        setTranslated(json.data.translatedText);
        setProvider(json.data.provider);
      } catch {
        if (!cancelled) { setTranslated(null); setProvider(null); }
      }
    }
    run();
    return () => { cancelled = true; };
  }, [language, sourceId, field, text, needsTranslation]);

  const title = provider ? (provider === 'azure-openai' ? 'Translated by AI' : 'Community translation') : undefined;

  return React.createElement(As, { className, title, 'data-no-ui-translate': 'true' }, needsTranslation && translated ? translated : text);
}

export default TranslatedText;

