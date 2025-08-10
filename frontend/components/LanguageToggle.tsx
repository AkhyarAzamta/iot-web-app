// components/language-toggle.tsx
'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';

const FlagEn: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 60 60"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    preserveAspectRatio="xMidYMid slice"
  >
    <rect width="60" height="60" fill="#012169" />
    <rect width="60" height="20" y="20" fill="#fff" />
    <rect width="20" height="60" x="20" fill="#fff" />
    <rect width="60" height="12" y="24" fill="#C8102E" />
    <rect width="12" height="60" x="24" fill="#C8102E" />
  </svg>
);

const FlagId: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 60 60"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    preserveAspectRatio="xMidYMid slice"
  >
    <rect width="60" height="30" y="0" fill="#E60026" />
    <rect width="60" height="30" y="30" fill="#fff" />
  </svg>
);

const LanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { lang, setLang, t } = useI18n();

  const toggle = () => setLang(lang === 'en' ? 'id' : 'en');

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  const titleEn = t('lang.switchToEnglish', 'Switch to English');
  const titleId = t('lang.switchToIndonesian', 'Switch to Indonesian');

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="sr-only">{t('lang.label', 'Language')}</span>
      <button
        type="button"
        role="switch"
        aria-checked={lang === 'id'}
        aria-label={lang === 'en' ? titleId : titleEn}
        title={lang === 'en' ? titleId : titleEn}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className="relative w-16 h-9 rounded-full p-1 bg-white/90 dark:bg-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <div className="absolute top-1 w-7 h-7 pointer-events-none">EN</div>
        <div className="absolute right-1 top-1 w-7 h-7 pointer-events-none">ID</div>

        <div
          className={`absolute top-1 left-1 w-7 h-7 rounded-full shadow-md transform transition-transform duration-200 flex items-center justify-center overflow-hidden ${
            lang === 'id' ? 'translate-x-8' : 'translate-x-0'
          }`}
        >
          {/* Flag bulat penuh */}
          <div className="w-full h-full rounded-full overflow-hidden">
            {lang === 'en' ? <FlagEn className="w-full h-full" /> : <FlagId className="w-full h-full" />}
          </div>
        </div>
      </button>
    </div>
  );
};

export default LanguageToggle;
