import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type SupportedLanguageCode =
  | 'en' | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'nl' | 'sv' | 'pl' | 'ru'
  | 'ar' | 'he' | 'tr' | 'hi' | 'bn' | 'zh' | 'ja' | 'ko' | 'vi' | 'th' | 'id';

const RTL_LANGS: SupportedLanguageCode[] = ['ar', 'he'];

type I18nContextValue = {
  language: SupportedLanguageCode;
  setLanguage: (lang: SupportedLanguageCode) => void;
  isRtl: boolean;
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'shipits.language';

const UI_DICTIONARY: Record<SupportedLanguageCode, Record<string, string>> = {
  en: {
    language: 'Language',
    translatedByAI: 'Translated by AI',
    viewOriginal: 'View original',
    viewTranslation: 'View translation',
    improveTranslation: 'Improve translation',
    submit: 'Submit',
    cancel: 'Cancel',
    communityTranslations: 'Community translations',
  },
  es: {
    language: 'Idioma',
    translatedByAI: 'Traducido por IA',
    viewOriginal: 'Ver original',
    viewTranslation: 'Ver traducción',
    improveTranslation: 'Mejorar traducción',
    submit: 'Enviar',
    cancel: 'Cancelar',
    communityTranslations: 'Traducciones de la comunidad',
  },
  fr: {
    language: 'Langue',
    translatedByAI: 'Traduit par IA',
    viewOriginal: 'Voir original',
    viewTranslation: 'Voir la traduction',
    improveTranslation: 'Améliorer la traduction',
    submit: 'Envoyer',
    cancel: 'Annuler',
    communityTranslations: 'Traductions de la communauté',
  },
  de: { language: 'Sprache', translatedByAI: 'Übersetzt von KI', viewOriginal: 'Original anzeigen', viewTranslation: 'Übersetzung anzeigen', improveTranslation: 'Übersetzung verbessern', submit: 'Senden', cancel: 'Abbrechen', communityTranslations: 'Community-Übersetzungen' },
  pt: { language: 'Idioma', translatedByAI: 'Traduzido por IA', viewOriginal: 'Ver original', viewTranslation: 'Ver tradução', improveTranslation: 'Melhorar tradução', submit: 'Enviar', cancel: 'Cancelar', communityTranslations: 'Traduções da comunidade' },
  it: { language: 'Lingua', translatedByAI: 'Tradotto con IA', viewOriginal: 'Vedi originale', viewTranslation: 'Vedi traduzione', improveTranslation: 'Migliora traduzione', submit: 'Invia', cancel: 'Annulla', communityTranslations: 'Traduzioni della comunità' },
  nl: { language: 'Taal', translatedByAI: 'Vertaald door AI', viewOriginal: 'Origineel bekijken', viewTranslation: 'Vertaling bekijken', improveTranslation: 'Vertaling verbeteren', submit: 'Verzenden', cancel: 'Annuleren', communityTranslations: 'Communityvertalingen' },
  sv: { language: 'Språk', translatedByAI: 'Översatt av AI', viewOriginal: 'Visa original', viewTranslation: 'Visa översättning', improveTranslation: 'Förbättra översättning', submit: 'Skicka', cancel: 'Avbryt', communityTranslations: 'Communityöversättningar' },
  pl: { language: 'Język', translatedByAI: 'Przetłumaczone przez AI', viewOriginal: 'Zobacz oryginał', viewTranslation: 'Zobacz tłumaczenie', improveTranslation: 'Ulepsz tłumaczenie', submit: 'Wyślij', cancel: 'Anuluj', communityTranslations: 'Tłumaczenia społeczności' },
  ru: { language: 'Язык', translatedByAI: 'Переведено ИИ', viewOriginal: 'Показать оригинал', viewTranslation: 'Показать перевод', improveTranslation: 'Улучшить перевод', submit: 'Отправить', cancel: 'Отмена', communityTranslations: 'Переводы сообщества' },
  ar: { language: 'اللغة', translatedByAI: 'مترجم بواسطة الذكاء الاصطناعي', viewOriginal: 'عرض الأصل', viewTranslation: 'عرض الترجمة', improveTranslation: 'تحسين الترجمة', submit: 'إرسال', cancel: 'إلغاء', communityTranslations: 'ترجمات المجتمع' },
  he: { language: 'שפה', translatedByAI: 'תורגם ע״י בינה מלאכותית', viewOriginal: 'צפה במקור', viewTranslation: 'צפה בתרגום', improveTranslation: 'שפר תרגום', submit: 'שלח', cancel: 'ביטול', communityTranslations: 'תרגומי קהילה' },
  tr: { language: 'Dil', translatedByAI: 'Yapay zeka tarafından çevrildi', viewOriginal: 'Orijinali gör', viewTranslation: 'Çeviriyi gör', improveTranslation: 'Çeviriyi geliştir', submit: 'Gönder', cancel: 'İptal', communityTranslations: 'Topluluk çevirileri' },
  hi: { language: 'भाषा', translatedByAI: 'एआई द्वारा अनुवादित', viewOriginal: 'मूल देखें', viewTranslation: 'अनुवाद देखें', improveTranslation: 'अनुवाद सुधारें', submit: 'जमा करें', cancel: 'रद्द करें', communityTranslations: 'समुदाय अनुवाद' },
  bn: { language: 'ভাষা', translatedByAI: 'এআই দ্বারা অনূদিত', viewOriginal: 'মূল দেখুন', viewTranslation: 'অনুবাদ দেখুন', improveTranslation: 'অনুবাদ উন্নত করুন', submit: 'জমা দিন', cancel: 'বাতিল', communityTranslations: 'কমিউনিটি অনুবাদ' },
  zh: { language: '语言', translatedByAI: '由AI翻译', viewOriginal: '查看原文', viewTranslation: '查看译文', improveTranslation: '改进翻译', submit: '提交', cancel: '取消', communityTranslations: '社区翻译' },
  ja: { language: '言語', translatedByAI: 'AIによる翻訳', viewOriginal: '原文を見る', viewTranslation: '翻訳を見る', improveTranslation: '翻訳を改善', submit: '送信', cancel: 'キャンセル', communityTranslations: 'コミュニティ翻訳' },
  ko: { language: '언어', translatedByAI: 'AI 번역', viewOriginal: '원문 보기', viewTranslation: '번역 보기', improveTranslation: '번역 개선', submit: '제출', cancel: '취소', communityTranslations: '커뮤니티 번역' },
  vi: { language: 'Ngôn ngữ', translatedByAI: 'Dịch bởi AI', viewOriginal: 'Xem bản gốc', viewTranslation: 'Xem bản dịch', improveTranslation: 'Cải thiện bản dịch', submit: 'Gửi', cancel: 'Hủy', communityTranslations: 'Bản dịch cộng đồng' },
  th: { language: 'ภาษา', translatedByAI: 'แปลโดย AI', viewOriginal: 'ดูต้นฉบับ', viewTranslation: 'ดูคำแปล', improveTranslation: 'ปรับปรุงคำแปล', submit: 'ส่ง', cancel: 'ยกเลิก', communityTranslations: 'คำแปลจากชุมชน' },
  id: { language: 'Bahasa', translatedByAI: 'Diterjemahkan oleh AI', viewOriginal: 'Lihat asli', viewTranslation: 'Lihat terjemahan', improveTranslation: 'Perbaiki terjemahan', submit: 'Kirim', cancel: 'Batal', communityTranslations: 'Terjemahan komunitas' },
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguageCode>('en');

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY) as SupportedLanguageCode | null;
    if (saved) setLanguageState(saved);
    else {
      // try browser language
      const nav = navigator.language?.slice(0, 2) as SupportedLanguageCode | undefined;
      if (nav && (Object.keys(UI_DICTIONARY) as SupportedLanguageCode[]).includes(nav)) {
        setLanguageState(nav);
      }
    }
  }, []);

  const setLanguage = (lang: SupportedLanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem(LOCAL_STORAGE_KEY, lang);
  };

  const isRtl = RTL_LANGS.includes(language);

  const t = useMemo(() => {
    const dict = UI_DICTIONARY[language] || UI_DICTIONARY.en;
    return (key: string, fallback?: string) => dict[key] || fallback || key;
  }, [language]);

  const value: I18nContextValue = { language, setLanguage, isRtl, t };

  return (
    <I18nContext.Provider value={value}>
      <div dir={isRtl ? 'rtl' : 'ltr'}>{children}</div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

