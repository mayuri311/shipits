import React, { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { translationsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type Props = {
  sourceType: 'project' | 'project_update' | 'comment' | 'user' | 'message' | 'event';
  sourceId: string;
  field: string; // e.g., 'description', 'content', 'bio'
  text: string;
  sourceLanguage?: string;
  className?: string;
};

export function TranslatedContent({ sourceType, sourceId, field, text, sourceLanguage, className = '' }: Props) {
  const { language, t } = useI18n();
  const [translated, setTranslated] = useState<string | null>(null);
  const [provider, setProvider] = useState<'azure-openai' | 'community' | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Community translations dialog state
  const [openImprove, setOpenImprove] = useState(false);
  const [proposal, setProposal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [community, setCommunity] = useState<Array<{ _id: string; translatedText: string; upvotes?: number; downvotes?: number }>>([]);
  const [listError, setListError] = useState<string | null>(null);

  const needsTranslation = useMemo(() => {
    const srcLang = (sourceLanguage || 'en').slice(0,2);
    return language && language !== (srcLang as any);
  }, [language, sourceLanguage]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!needsTranslation) { setTranslated(null); setProvider(null); return; }
      setLoading(true); setError(null);
      try {
        const resp = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            sourceType, sourceId, field, text,
            sourceLanguage: sourceLanguage,
            targetLanguage: language,
          }),
        });
        const json = await resp.json();
        if (!resp.ok || !json.success) throw new Error(json.error || 'Failed to translate');
        if (cancelled) return;
        setTranslated(json.data.translatedText);
        setProvider(json.data.provider);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to translate');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [language, sourceId, field, text, needsTranslation]);

  const indicator = provider ? (
    <span className="ml-2 text-xs text-gray-500">
      {provider === 'azure-openai' ? t('translatedByAI', 'Translated by AI') : t('communityTranslations', 'Community translations')}
    </span>
  ) : null;

  if (!needsTranslation) {
    return <MarkdownRenderer content={text} className={className} />;
  }
  if (loading) {
    return <div className={`text-sm text-gray-500 ${className}`}>…</div>;
  }
  if (error || !translated) {
    return <MarkdownRenderer content={text} className={className} />;
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="text-xs text-gray-500 flex-1">{indicator}</div>
        {isAuthenticated && (
          <Button variant="outline" size="sm" className="h-7 px-2" onClick={async () => {
            setOpenImprove(true);
            setListLoading(true);
            setListError(null);
            try {
              const res = await translationsApi.listTranslations({ sourceType, sourceId, field, targetLanguage: language });
              if ((res as any).success) setCommunity(res.data.translations || []);
            } catch (e: any) {
              setListError(e?.message || 'Failed to load');
            } finally {
              setListLoading(false);
            }
          }}>
            {t('improveTranslation', 'Improve translation')}
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowOriginal(s => !s)}>
          {showOriginal ? t('viewTranslation', 'View translation') : t('viewOriginal', 'View original')}
        </Button>
      </div>
      {showOriginal ? (
        <MarkdownRenderer content={text} />
      ) : (
        <MarkdownRenderer content={translated} />
      )}

      <Dialog open={openImprove} onOpenChange={setOpenImprove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('improveTranslation', 'Improve translation')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              placeholder={t('improveTranslation', 'Improve translation')}
              rows={6}
            />
            <div>
              <div className="text-sm font-medium mb-1">{t('communityTranslations', 'Community translations')}</div>
              {listLoading ? (
                <div className="text-xs text-gray-500">Loading…</div>
              ) : listError ? (
                <div className="text-xs text-red-600">{listError}</div>
              ) : community.length === 0 ? (
                <div className="text-xs text-gray-500">No submissions yet.</div>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {community.map(item => (
                    <li key={item._id} className="border rounded p-2">
                      <div className="text-xs text-gray-600 mb-1">{(item.upvotes || 0) - (item.downvotes || 0)} votes</div>
                      <MarkdownRenderer content={item.translatedText} />
                      <div className="flex gap-2 mt-2">
                        <Button variant="ghost" size="sm" onClick={async () => {
                          try { await translationsApi.vote(item._id, 'up');
                            setCommunity(prev => prev.map(x => x._id === item._id ? { ...x, upvotes: (x.upvotes||0)+1 } : x));
                          } catch {}
                        }}>▲</Button>
                        <Button variant="ghost" size="sm" onClick={async () => {
                          try { await translationsApi.vote(item._id, 'down');
                            setCommunity(prev => prev.map(x => x._id === item._id ? { ...x, downvotes: (x.downvotes||0)+1 } : x));
                          } catch {}
                        }}>▼</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenImprove(false)}>{t('cancel', 'Cancel')}</Button>
            <Button disabled={!proposal.trim() || submitting} onClick={async () => {
              setSubmitting(true);
              try {
                const res = await translationsApi.submitCommunityTranslation({ sourceType, sourceId, field, targetLanguage: language, translatedText: proposal.trim() });
                if ((res as any).success) {
                  setProposal('');
                  // refresh list
                  try { const list = await translationsApi.listTranslations({ sourceType, sourceId, field, targetLanguage: language });
                    if ((list as any).success) setCommunity(list.data.translations || []);
                  } catch {}
                }
              } catch {}
              setSubmitting(false);
            }}>{t('submit', 'Submit')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TranslatedContent;

