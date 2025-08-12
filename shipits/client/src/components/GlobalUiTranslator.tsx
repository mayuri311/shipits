import { useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { translationsApi } from '@/lib/api';

// Lightweight global UI translator: translates visible static text nodes in common UI containers.
// It avoids changing content within inputs, buttons with icons only, code/pre, or ARIA-labeled only elements.
export default function GlobalUiTranslator() {
  const { language } = useI18n();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      // Collect candidate text nodes
      const root = document.body;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const text = node.nodeValue || '';
          const trimmed = text.trim();
          if (!trimmed) return NodeFilter.FILTER_REJECT;
          // Skip script/style/code/pre and editors
          const tag = parent.tagName.toLowerCase();
          if (['script','style','code','pre','textarea'].includes(tag)) return NodeFilter.FILTER_REJECT;
          if (parent.getAttribute('contenteditable') === 'true') return NodeFilter.FILTER_REJECT;
          // Skip markdown render containers to avoid double work (they already translate via TranslatedMarkdown)
          if (parent.closest('.prose')) return NodeFilter.FILTER_REJECT;
          // Skip icons-only buttons/spans
          if (trimmed.length <= 1) return NodeFilter.FILTER_REJECT;
          // Only translate if parent has no data-no-ui-translate flag
          if (parent.closest('[data-no-ui-translate="true"]')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      } as any);

      const nodes: Text[] = [];
      let node: Node | null = walker.nextNode();
      while (node) {
        nodes.push(node as Text);
        node = walker.nextNode();
      }

      // Limit batch size for performance
      const max = 120;
      const sample = nodes.slice(0, max);
      if (sample.length === 0) return;

      try {
        const payload = sample.map(n => ({ text: (n.nodeValue || '').trim(), targetLanguage: language }));
        const resp = await translationsApi.translateBatch(payload);
        if (!resp.success || cancelled) return;
        resp.data.items.forEach((translated, idx) => {
          const original = sample[idx];
          if (!original || !translated) return;
          // Replace only if different
          if (translated && translated !== (original.nodeValue || '').trim()) {
            original.nodeValue = translated;
          }
        });
      } catch {
        // silently ignore
      }
    }
    run();
    // re-run on language change
    return () => { cancelled = true; };
  }, [language]);

  return null;
}

