'use client';

import React, { useState } from "react";
import { SensorDataCard } from "@/components/demo-sensor-data";
import { DemoSensorCharts } from "@/components/demo-sensor-charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from '@/lib/i18n'; // Pastikan path sesuai proyek

import DemoAnalytics from "./demo-analytics";

export function DemoDashboard() {
  const { t } = useI18n();

  const [alerts] = useState([
    {
      id: 1,
      deviceNameKey: 'device.pond1',
      type: 'warning' as const,
      messageKey: 'dashboard.alert.tempOutOfBounds',
      params: { temp: 28.3, min: 25.0, max: 28.0 }
    },
    {
      id: 2,
      deviceNameKey: 'device.pond2',
      type: 'info' as const,
      messageKey: 'dashboard.alert.tempNormal',
      params: { temp: 27.9, min: 25.0, max: 28.0 }
    },
  ]);

  return (
    <section id="dashboard" className="py-20 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            {t('dashboard.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="overview">
              {t('dashboard.tab.overview')}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              {t('dashboard.tab.analytics')}
            </TabsTrigger>
            <TabsTrigger value="alerts">
              {t('dashboard.tab.alerts')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mt-6">
              <div className="mb-8">
                <SensorDataCard />
              </div>
              <DemoSensorCharts />
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <DemoAnalytics />
          </TabsContent>

          <TabsContent value="alerts">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mt-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">
                  {t('dashboard.alerts.title')}
                </h3>
              </div>

              <div className="space-y-4">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border flex items-start gap-3 ${alert.type === 'info'
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                      : alert.type === 'warning'
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                      }`}
                  >
                    <div
                      className={`mt-1 w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-white ${alert.type === 'info'
                        ? 'bg-blue-500'
                        : alert.type === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                        }`}
                    >
                      {!['info', 'warning'].includes(alert.type) ? '✓' : '!'}
                    </div>

                    <div>
                      <p className="font-semibold">
                        {t(alert.deviceNameKey)}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {t(alert.messageKey, '', alert.params)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Jika tidak ada alert */}
                {alerts.length === 0 && (
                  <div className="p-4 rounded-lg border border-gray-200 dark:border-slate-700 flex items-start gap-3 bg-green-50 dark:bg-green-900/20">
                    <div className="mt-1 w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-white bg-green-500">
                      ✓
                    </div>
                    <div>
                      <p className="font-semibold">
                        {t('dashboard.alert.allGood')}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t('dashboard.alert.justNow')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}