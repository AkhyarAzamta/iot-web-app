import React from 'react';
import { useI18n } from '@/lib/i18n'; // Sesuaikan path sesuai struktur proyek
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  const { t } = useI18n();
  
  return (
    <footer className="bg-slate-800 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-6">
              <Link href="/#home">
                  <Image src={`/logo.png`} alt="Logo" width={150} height={150} />
                </Link>
            </div>
            <p className="text-slate-300 mb-4">
              {t('footer.tagline')}
            </p>
            <div className="flex space-x-4">
              {/* Social icons tetap sama */}
            </div>
          </div>
          
          <div>
            <h3 className="lg:text-lg font-semibold mb-4">
              {t('footer.products')}
            </h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-slate-300 hover:text-white">{t('footer.monitoring')}</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white">{t('footer.dashboard')}</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white">{t('footer.pricing')}</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white">{t('footer.demo')}</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="lg:text-lg font-semibold mb-4">
              {t('footer.resources')}
            </h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-slate-300 hover:text-white">{t('footer.blog')}</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white">{t('footer.docs')}</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white">{t('footer.guide')}</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white">{t('footer.support')}</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="lg:text-lg font-semibold mb-4">
              {t('footer.company')}
            </h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-slate-300 hover:text-white">{t('footer.about')}</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white">{t('footer.careers')}</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white">{t('footer.contact')}</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white">{t('footer.partners')}</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-700 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-slate-400 text-sm">
            {t('footer.copyright')}
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-slate-400 hover:text-white text-sm">
              {t('footer.privacy')}
            </a>
            <a href="#" className="text-slate-400 hover:text-white text-sm">
              {t('footer.terms')}
            </a>
            <a href="#" className="text-slate-400 hover:text-white text-sm">
              {t('footer.cookie')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}