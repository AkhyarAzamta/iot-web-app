// app/page.tsx
'use client';

import React, { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DemoSensorCharts } from '@/components/demo-sensor-charts';
import { DemoDashboard } from '@/components/demo-dashboard';
import Footer from '@/components/footer';
import NavHome from '@/components/nav-home';
import { LanguageProvider, useI18n } from '@/lib/i18n';
import { ChartLine, Cloud, FileChartLine, Lightbulb, MonitorCog, TriangleAlert } from 'lucide-react';

type Feature = {
  id: string;
  comingSoon?: boolean;
  img?: ReactElement; // optional for custom icons
};

const FEATURES: Feature[] = [
  { id: 'realtime', img: <ChartLine className="w-6 h-6" /> },
  { id: 'historical', img: <FileChartLine className="w-6 h-6" /> },
  { id: 'alerts', img: <TriangleAlert className="w-6 h-6" /> },
  { id: 'cloud', img: <Cloud className="w-6 h-6" /> },
  { id: 'maintenance', comingSoon: true, img: <MonitorCog className="w-6 h-6" /> },
  { id: 'predictive', comingSoon: true, img: <Lightbulb className="w-6 h-6" /> },
];

// --- data-driven (ganti bagian const ROADMAP, PRICING, COMPARISON_ROWS) ---

const ROADMAP = [
  // items are translation keys now
  { quarter: 'Q2 2025', items: ['feature.realtime.title', 'feature.historical.title', 'feature.alerts.title'], status: 'done' },
  { quarter: 'Q3 2025', items: ['roadmap.integration', 'feature.maintenance.title'], status: 'inprogress' },
  { quarter: 'Q4 2025', items: ['feature.predictive.title', 'roadmap.automatedReporting'], status: 'planned' },
];

const PRICING = [
  {
    id: 'firmware',
    titleKey: 'pricing.firmware.title',
    priceKey: 'pricing.firmware.price',
    subtitleKey: 'pricing.firmware.subtitle',
    highlightsKeys: ['pricing.highlight.firmwareFile', 'pricing.highlight.wiring', 'pricing.highlight.docs', 'pricing.highlight.emailSupport'],
    youProvideKeys: ['pricing.highlight.esp32', 'pricing.highlight.sensors', 'pricing.highlight.mounts'],
  },
  {
    id: 'components',
    titleKey: 'pricing.components.title',
    priceKey: 'pricing.components.price',
    subtitleKey: 'pricing.components.subtitle',
    badgeKey: 'pricing.components.badge',
    highlightsKeys: ['pricing.highlight.firmwareFile', 'pricing.highlight.esp32', 'pricing.highlight.sensors', 'pricing.highlight.solar', 'pricing.highlight.mounts'],
    // use translation keys for "what you do"
    youDoKeys: ['pricing.youDo.assemble', 'pricing.youDo.flash', 'pricing.youDo.configure'],
  },
  {
    id: 'ready',
    titleKey: 'pricing.ready.title',
    priceKey: 'pricing.ready.price',
    subtitleKey: 'pricing.ready.subtitle',
    badgeKey: 'pricing.ready.badge',
    premium: true,
    highlightsKeys: ['pricing.highlight.preassembled', 'pricing.highlight.preinstalled', 'pricing.highlight.videoAssist', 'pricing.highlight.warranty'],
    // translation keys for ready-in
    readyInKeys: ['pricing.readyIn.30min', 'pricing.readyIn.configure'],
  },
];

const COMPARISON_ROWS = [
  { featureKey: 'comparison.row.firmwareFile', values: ['comparison.yes', 'comparison.yes', 'comparison.preinstalled'] },
  { featureKey: 'comparison.row.esp32Board', values: ['comparison.no', 'comparison.yes', 'comparison.yes'] },
  { featureKey: 'comparison.row.sensors', values: ['comparison.no', 'comparison.yes', 'comparison.yes'] },
  { featureKey: 'comparison.row.solarPower', values: ['comparison.no', 'comparison.yes', 'comparison.yes'] },
  { featureKey: 'comparison.row.preassembled', values: ['comparison.no', 'comparison.no', 'comparison.yes'] },
  { featureKey: 'comparison.row.setupAssistance', values: ['comparison.emailOnly', 'comparison.emailDocs', 'comparison.oneOnOne'] },
  { featureKey: 'comparison.row.warranty', values: ['comparison.none', 'comparison.sixMonths', 'comparison.oneYear'] },
];

const Hero: React.FC = () => {
  const { t } = useI18n();

  return (
    <section id="home" className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-3">
        <div className="md:flex items-center">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">{t('hero.title')}</h1>
            <p className="text-xl mb-8 text-blue-100">{t('hero.subtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 transition duration-300">
                {t('hero.getStarted')}
              </Button>
              <Button size="lg" variant="outline" className="border-white text-black hover:bg-white hover:text-blue-600 transition duration-300">
                {t('hero.learnMore')}
              </Button>
            </div>
          </div>

          <div className="md:w-1/2">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
              <h3 className="font-bold text-lg mb-4 text-white">{t('hero.currentStatus')}</h3>
              <DemoSensorCharts />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const FeatureCard: React.FC<{ id: string; comingSoon?: boolean, img?: ReactElement }> = ({ id, comingSoon, img }) => {
  const { t } = useI18n();
  const title = t(`feature.${id}.title`);
  const desc = t(`feature.${id}.desc`);
  const note = t(`feature.${id}.note`, '');

  return (
    <Card className="hover:translate-y-[-5px] transition-all duration-300 relative overflow-hidden">
      {comingSoon && (
        <div className="absolute top-4 right-4">
          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-yellow-900 dark:text-yellow-300">{t('feature.badge')}</span>
        </div>
      )}

      <CardHeader>
        <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-2 lg:mb-6">{img}</div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>

      <CardContent>
        <p className="text-gray-600 dark:text-gray-300">{desc}</p>
        {note && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-md border border-dashed border-gray-300 dark:border-slate-600">
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">{note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const RoadmapPanel: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="mt-20 bg-blue-50 dark:bg-slate-800 rounded-xl p-8 border border-blue-200 dark:border-slate-700">
      <div className="max-w-3xl mx-auto text-center">
        <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-400 mb-4">{t('roadmap.title')}</h3>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{t('roadmap.subtitle')}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ROADMAP.map((r) => (
            <div key={r.quarter} className="bg-white dark:bg-slate-700 p-5 px-4 rounded-lg shadow-sm">
              <div className="text-blue-600 dark:text-blue-400 font-bold mb-2">{r.quarter}</div>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                {r.items.map((it) => (
                  <li key={it} className="flex items-start">
                    <span className={`${r.status === 'done' ? 'text-green-500' : r.status === 'inprogress' ? 'text-yellow-500' : 'text-gray-400'} mr-2`}>
                      {r.status === 'done' ? '✓' : '•'}
                    </span>
                    <span>{t(it)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Button variant="outline" className="mt-8 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">{t('roadmap.suggest')}</Button>
      </div>
    </div>
  );
};

const HowItWorks: React.FC = () => {
  const { t } = useI18n();

  const steps = [
    {
      num: 1,
      title: t('how.step1.title'),
      body: (
        <>
          <p className="text-gray-600 dark:text-gray-300 mb-3">{t('how.step1.body')}</p>
          <div className="bg-gray-100 dark:bg-slate-700 p-3 rounded-md text-sm font-mono mt-2">
            {t('how.step1.deviceIdLabel')}: <span className="text-blue-600">f1a2b3c4-d5e6</span>
          </div>
        </>
      ),
    },
    {
      num: 2,
      title: t('how.step2.title'),
      // use translation keys for each list item and map them
      body: (
        <ol className="list-decimal pl-5 space-y-2 text-gray-600 dark:text-gray-300">
          {['how.step2.li1', 'how.step2.li2', 'how.step2.li3', 'how.step2.li4', 'how.step2.li5'].map(k => (
            <li key={k}>{t(k)}</li>
          ))}
        </ol>
      ),
    },
    {
      num: 3,
      title: t('how.step3.title'),
      body: <p className="text-gray-600 dark:text-gray-300">{t('how.step3.body')}</p>,
    },
    {
      num: 4,
      title: t('how.step4.title'),
      body: <p className="text-gray-600 dark:text-gray-300">{t('how.step4.body')}</p>,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white dark:bg-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">{t('how.title')}</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">{t('how.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {steps.map((s) => (
            <Card key={s.num} className="transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">{s.num}</div>
                  <CardTitle className="text-lg">{s.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>{s.body}</CardContent>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/2 p-8">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{t('how.seamless.title')}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{t('how.seamless.desc')}</p>

              <ul className="space-y-3">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" ></svg>
                  <span className="text-gray-600 dark:text-gray-300">{t('how.seamless.bullet1')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2 mt:0.5 flex-shrink-0" ></svg>
                  <span className="text-gray-600 dark:text-gray-300">{t('how.seamless.bullet2')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2 mt:0.5 flex-shrink-0"></svg>
                  <span className="text-gray-600 dark:text-gray-300">{t('how.seamless.bullet3')}</span>
                </li>
              </ul>


              <div className="mt-8">
                <h4 className="font-semibold mb-2 text-gray-800 dark:text-white">{t('how.troubleshooting.title')}</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>{t('how.troubleshooting.tip1')}</li>
                  <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>{t('how.troubleshooting.tip2')}</li>
                  <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>{t('how.troubleshooting.tip3')}</li>
                </ul>
              </div>

              <div className="mt-8">
                <Button variant="secondary" className="mt-4">{t('how.watchVideo')}</Button>
              </div>
            </div>

            <div className="md:w-1/2 bg-gradient-to-br from-cyan-500 to-blue-500 min-h-[300px] flex items-center justify-center">
              <div className="text-white text-center p-8">
                <div className="bg-white/20 backdrop-blur-sm p-6 rounded-xl mb-6">
                  <h4 className="font-bold mb-3">{t('how.configPreview')}</h4>
                  <div className="space-y-3 text-left">
                    <div className="p-2 bg-white/10 rounded"><label className="text-xs block mb-1">{t('how.wifiSsid')}</label><div className="bg-white/20 h-6 rounded"></div></div>
                    <div className="p-2 bg-white/10 rounded"><label className="text-xs block mb-1">{t('how.wifiPassword')}</label><div className="bg-white/20 h-6 rounded"></div></div>
                    <div className="p-2 bg-white/10 rounded"><label className="text-xs block mb-1">{t('how.deviceId')}</label><div className="bg-white/20 h-6 rounded"></div></div>
                    <div className="bg-white text-center text-blue-900 font-medium py-2 rounded text-sm">{t('how.saveConfig')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

const PricingSection: React.FC = () => {
  const { t } = useI18n();

  return (
    <section id="pricing" className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-3 md:mb-4">{t('pricing.title')}</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-base md:text-lg">{t('pricing.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PRICING.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl overflow-hidden transition-all duration-300 ${p.premium
                ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg'
                : 'bg-white dark:bg-slate-800 shadow-md border border-blue-100 dark:border-slate-700'
                }`}
            >
              <div
                className={`${p.badgeKey
                  ? 'relative transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border-2 border-blue-500'
                  : ''
                  }`}
              >
                {p.badgeKey && (
                  <div className="absolute top-3 right-3">
                    <span
                      className={`${p.premium
                        ? 'bg-yellow-400 text-yellow-900 dark:bg-yellow-500 dark:text-yellow-900'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        } text-xs font-bold px-2 py-0 rounded-full`}
                    >
                      {t(p.badgeKey)}
                    </span>
                  </div>
                )}
                <div className={`p-6 flex flex-col justify-between h-full ${p.premium ? 'text-white' : ''}`}>
                  <div className="mb-5">
                    <h3 className={`text-xl md:text-2xl font-bold mb-2 ${p.premium ? '' : 'text-gray-800 dark:text-white'}`}>{t(p.titleKey)}</h3>
                    <p className={`text-sm md:text-base ${p.premium ? 'text-blue-100' : 'text-gray-600 dark:text-gray-300'}`}>{t(p.subtitleKey ?? p.titleKey)}</p>
                  </div>

                  <div className="mb-6">
                    <div className={`text-3xl md:text-4xl font-bold mb-1 ${p.premium ? '' : 'text-gray-800 dark:text-white'}`}>{t(p.priceKey)}</div>
                    <p className={`text-sm ${p.premium ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>{t(p.subtitleKey ?? '')}</p>
                  </div>

                  <div className="space-y-3 mb-6">
                    {(p.highlightsKeys || []).map((hk) => (
                      <div key={hk} className="flex items-start">
                        <svg className={`h-5 w-5 ${p.premium ? 'text-white' : 'text-blue-500'} mt-0.5 mr-3 flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className={`${p.premium ? 'text-blue-100' : 'text-gray-600 dark:text-gray-300'} text-sm`}>{t(hk)}</span>
                      </div>
                    ))}
                  </div>

                  {p.youProvideKeys && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-700 rounded-lg p-3 mb-5">
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 text-sm">{t('pricing.youProvide.title')}</h4>
                      <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                        {p.youProvideKeys.map((it) => (
                          <li key={it} className="flex items-start"><span className="mr-1">•</span><span>{t(it)}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {p.youDoKeys && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-5">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 text-sm">{t('pricing.whatYouDo.title')}</h4>
                      <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        {p.youDoKeys.map((it) => (<li key={it} className="flex items-start"><span className="mr-1">•</span><span>{t(it)}</span></li>))}
                      </ul>
                    </div>
                  )}

                  {p.readyInKeys && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-5">
                      <h4 className="font-semibold mb-2 text-sm">{t('pricing.readyIn.title')}</h4>
                      <ul className="text-xs space-y-1">
                        {p.readyInKeys.map((it) => (
                          <li key={it} className="flex items-center"><span className="mr-1">•</span><span>{t(it)}</span></li>
                        ))}

                      </ul>
                    </div>
                  )}

                  <Button className={`w-full ${p.premium ? 'bg-white text-blue-600 hover:bg-gray-100' : 'bg-blue-600 hover:bg-blue-700 text-sm md:text-base py-2'}`}>
                    {p.premium ? t('pricing.getReady') : p.id === 'components' ? t('pricing.getComponents') : t('pricing.getFirmware')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="mt-12 md:mt-16 bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-slate-700">
          <div className="p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white mb-4 md:mb-6 text-center">{t('comparison.feature')}</h3>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="py-2 md:py-3 px-2 text-left font-medium text-gray-800 dark:text-white text-sm">{t('comparison.feature')}</th>
                    <th className="py-2 md:py-3 px-2 text-center font-medium text-gray-800 dark:text-white text-sm">{t('comparison.firmwareOnly')}</th>
                    <th className="py-2 md:py-3 px-2 text-center font-medium text-gray-800 dark:text-white text-sm">{t('comparison.components')}</th>
                    <th className="py-2 md:py-3 px-2 text-center font-medium text-gray-800 dark:text-white text-sm">{t('comparison.ready')}</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-slate-700">
                      <td className="py-3 px-2 font-medium text-gray-800 dark:text-white text-sm">{t(r.featureKey)}</td>
                      {r.values.map((v, idx) => {
                        if (v === 'comparison.yes') {
                          return <td key={idx} className="py-3 px-2 text-center"><span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded dark:bg-green-900 dark:text-green-200">{t('comparison.yes')}</span></td>;
                        }
                        if (v === 'comparison.no') {
                          return <td key={idx} className="py-3 px-2 text-center"><span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded dark:bg-red-900 dark:text-red-200">{t('comparison.no')}</span></td>;
                        }
                        if (v === 'comparison.preinstalled') {
                          return <td key={idx} className="py-3 px-2 text-center"><span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded dark:bg-green-900 dark:text-green-200">{t('comparison.preinstalled')}</span></td>;
                        }
                        // if it's a comparison.* key -> translate and show as text (no badge)
                        if (typeof v === 'string' && v.startsWith('comparison.')) {
                          return <td key={idx} className="py-3 px-2 text-center"><span className="text-sm">{t(v)}</span></td>;
                        }
                        // fallback: raw value
                        return <td key={idx} className="py-3 px-2 text-center"><span className="text-sm">{v}</span></td>;
                      })}

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 md:mt-16 max-w-3xl mx-auto">
          <h3 className="text-xl md:text-2xl font-bold text-center text-gray-800 dark:text-white mb-6 md:mb-10">{t('faq.title')}</h3>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
              <h4 className="font-bold text-gray-800 dark:text-white mb-2 text-base md:text-lg">{t('faq.upgradeQ')}</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">{t('faq.upgradeA')}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
              <h4 className="font-bold text-gray-800 dark:text-white mb-2 text-base md:text-lg">{t('faq.solarQ')}</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">{t('faq.solarA')}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
              <h4 className="font-bold text-gray-800 dark:text-white mb-2 text-base md:text-lg">{t('faq.deliveryQ')}</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">{t('faq.deliveryA')}</p>
            </div>

            <div className="text-center mt-6">
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">{t('faq.viewAll')}</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- tambahkan di atas (bersama dengan imports) ---
const FeaturesSection: React.FC = () => {
  const { t } = useI18n();

  return (
    <section id="features" className="py-20 bg-white dark:bg-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">{t('features.title')}</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">{t('features.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-8">
          {FEATURES.map((f) => <FeatureCard key={f.id} id={f.id} comingSoon={f.comingSoon} img={f.img} />)}
        </div>

        <RoadmapPanel />
      </div>
    </section>
  );
};

export default function Home() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <NavHome />
        <Hero />
        <FeaturesSection />
        <DemoDashboard />
        <HowItWorks />
        <PricingSection />
        <Footer />
      </div>
    </LanguageProvider>
  );
}
