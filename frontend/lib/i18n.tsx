// src/lib/i18n.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'en' | 'id';

type I18nContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, fallback?: string, params?: Record<string, any>) => string;
};

const STORAGE_KEY = 'sf_lang_pref';

/**
 * TRANSLATIONS: lengkap untuk semua teks yang ada di halaman.
 * Tambah / ubah sesuai kebutuhan; gunakan dot-notation keys.
 */
const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  en: {
    // Hero
    'hero.title': 'Smart Water Quality Monitoring for Your Pond',
    'hero.subtitle': 'Real-time monitoring of pH, temperature, turbidity and TDS levels using IoT technology.',
    'hero.getStarted': 'Get Started',
    'hero.learnMore': 'Learn More',
    'hero.currentStatus': 'Current Water Status',

    // Features section
    'features.title': 'Advanced Monitoring Features',
    'features.subtitle': 'Comprehensive tools to keep your aquatic environment healthy and thriving',
    'feature.badge': 'Coming Soon',
    // Feature cards (by id)
    'feature.realtime.title': 'Real-Time Analytics',
    'feature.realtime.desc': 'Continuous monitoring of water parameters with instant notifications for any critical changes.',
    'feature.historical.title': 'Historical Data',
    'feature.historical.desc': 'Track changes over time with detailed historical charts and customizable reporting.',
    'feature.alerts.title': 'Mobile Alerts',
    'feature.alerts.desc': 'Get push notifications on your phone when water parameters go beyond safe thresholds.',
    'feature.cloud.title': 'Secure Cloud Storage',
    'feature.cloud.desc': 'All your data is securely stored in the cloud with end-to-end encryption.',
    'feature.maintenance.title': 'Maintenance Scheduling',
    'feature.maintenance.desc': 'Automated reminders for sensor calibration, water testing, and system maintenance.',
    'feature.maintenance.note': 'Our smart scheduling system is in development and will launch in Q3 2025.',
    'feature.predictive.title': 'Predictive Analytics',
    'feature.predictive.desc': "AI-powered predictions to anticipate water quality issues before they occur.",
    'feature.predictive.note': "We're developing advanced AI models to predict water quality trends. This feature will be available in Q4 2025.",

    // Roadmap
    'roadmap.title': 'Our Development Roadmap',
    'roadmap.subtitle': "We're continuously working to bring you more powerful features. Here's what we're building next:",
    'roadmap.suggest': 'Suggest a Feature',

    // How It Works
    'how.title': 'How Smart FishFarm Works',
    'how.subtitle': 'Simple setup for advanced water quality monitoring',
    'how.step1.title': 'Register Device',
    'how.step1.body': 'After purchasing, register your device in the app. Create a new device name (e.g. "Kolam 1") and copy the generated Device ID.',
    'how.step1.deviceIdLabel': 'Device ID',
    'how.step2.title': 'Configure Device',
    'how.step2.body': 'Power on device while pressing config button; connect to ESP32_Config WiFi; enter your WiFi credentials; paste the Device ID; save configuration.',
    'how.step3.title': 'Install Sensors',
    'how.step3.body': "Place waterproof sensors in your pond. All sensors communicate wirelessly with the main device. Ensure they're fully submerged but not touching the bottom.",
    'how.step4.title': 'Monitor Data',
    'how.step4.body': 'View real-time data and receive alerts through our web dashboard or mobile app. Sensor settings will automatically appear after configuration.',
    'how.configPreview': 'Configuration Interface Preview',
    'how.wifiSsid': 'WiFi SSID',
    'how.wifiPassword': 'WiFi Password',
    'how.deviceId': 'Device ID',
    'how.saveConfig': 'Save Configuration',
    'how.seamless.title': 'Seamless Setup Process',
    'how.seamless.desc': 'Our system is designed for hassle-free installation. Typically you can have everything running in under 15 minutes, with data flowing to your dashboard immediately after configuration.',
    'how.troubleshooting.title': 'Troubleshooting Tips:',
    'how.troubleshooting.tip1': 'Ensure device is in configuration mode (blue LED blinking)',
    'how.troubleshooting.tip2': 'Device ID is case-sensitive - copy exactly as shown',
    'how.troubleshooting.tip3': 'Keep device within 10m of your WiFi router during setup',
    'how.watchVideo': 'Watch Setup Video',

    // Pricing
    'pricing.title': 'Choose Your Setup Option',
    'pricing.subtitle': 'Select the solution that matches your technical skills and requirements',
    'pricing.firmware.title': 'Firmware Only',
    'pricing.firmware.price': 'Rp 300.000',
    'pricing.firmware.subtitle': 'One-time payment',
    'pricing.components.title': 'Firmware + Components Kit',
    'pricing.components.price': 'Rp 750.000',
    'pricing.components.badge': 'PRO',
    'pricing.ready.title': 'Ready-to-Use Kit',
    'pricing.ready.price': 'Rp 1.250.000',
    'pricing.ready.subtitle': 'One-time payment with 1 year warranty',
    'pricing.ready.badge': 'ENTERPRISE',
    'pricing.youDo.title': 'You Do:',
    'pricing.youProvide.title': 'You Provide:',
    'pricing.whatYouDo.title': 'What You Do:',
    'pricing.readyIn.title': 'Ready to Use In:',
    'pricing.getFirmware': 'Get Firmware Only',
    'pricing.getComponents': 'Get Components Kit',
    'pricing.getReady': 'Get Ready-to-Use Kit',

    // Pricing highlights (generic)
    'pricing.highlight.firmwareFile': 'Firmware file for ESP32',
    'pricing.highlight.wiring': 'Detailed wiring diagrams',
    'pricing.highlight.docs': 'Comprehensive documentation',
    'pricing.highlight.emailSupport': 'Email support for firmware issues',
    'pricing.highlight.esp32': 'ESP32 development board',
    'pricing.highlight.sensors': 'Waterproof sensors: pH, Temperature, Turbidity, TDS',
    'pricing.highlight.solar': 'Solar panel power system',
    'pricing.highlight.mounts': 'Mounting accessories and cables',
    'pricing.highlight.preassembled': 'Pre-assembled and tested device',
    'pricing.highlight.preinstalled': 'Pre-installed firmware',
    'pricing.highlight.videoAssist': '1-on-1 setup assistance via video call',
    'pricing.highlight.warranty': '1 year warranty on all components',

    // Comparison table headers (left column constant)
    'comparison.feature': 'Feature',
    'comparison.firmwareOnly': 'Firmware Only',
    'comparison.components': 'Firmware + Components',
    'comparison.ready': 'Ready-to-Use Kit',
    'comparison.yes': 'Yes',
    'comparison.no': 'No',
    'comparison.preinstalled': 'Pre-installed',

    // FAQ
    'faq.title': 'Frequently Asked Questions',
    'faq.upgradeQ': 'Can I upgrade from one package to another?',
    'faq.upgradeA': 'Yes, you can upgrade at any time. We offer credit for previous purchases when upgrading to a higher package.',
    'faq.solarQ': 'How long does the solar panel last?',
    'faq.solarA': 'Our solar panels are rated for 5+ years of continuous use. They can provide power for 7 days without direct sunlight.',
    'faq.deliveryQ': "What's the delivery time for the Ready-to-Use Kit?",
    'faq.deliveryA': 'We ship within 1-2 business days. Delivery in Indonesia takes 2-4 business days, international shipping 7-14 days.',
    'faq.viewAll': 'View All FAQs',

    // Buttons
    'btn.viewAllFaqs': 'View All FAQs',

    // EN additions
    'roadmap.integration': 'Integration with Smart Feeders',
    'roadmap.automatedReporting': 'Automated Reporting',

    'pricing.youDo.assemble': 'Assemble components using wiring diagram',
    'pricing.youDo.flash': 'Flash firmware to ESP32',
    'pricing.youDo.configure': 'Configure the device',

    'pricing.readyIn.30min': '30 minutes after unboxing',
    'pricing.readyIn.configure': 'Just configure and deploy',

    // comparison rows (EN)
    'comparison.row.firmwareFile': 'Firmware File',
    'comparison.row.esp32Board': 'ESP32 Board',
    'comparison.row.sensors': 'Sensors',
    'comparison.row.solarPower': 'Solar Power',
    'comparison.row.preassembled': 'Pre-assembled',
    'comparison.row.setupAssistance': 'Setup Assistance',
    'comparison.row.warranty': 'Warranty',

    'comparison.emailOnly': 'Email Only',
    'comparison.emailDocs': 'Email + Docs',
    'comparison.oneOnOne': '1-on-1 Call',

    'comparison.none': 'None',
    'comparison.sixMonths': '6 months',
    'comparison.oneYear': '1 Year',


    // how.step2 list items
    'how.step2.li1': 'Power on device while pressing config button',
    'how.step2.li2': 'Connect to ESP32_Config WiFi',
    'how.step2.li3': 'Enter your WiFi credentials',
    'how.step2.li4': 'Paste the Device ID',
    'how.step2.li5': 'Save configuration',

    // how.seamless bullets
    'how.seamless.bullet1': 'No technical expertise required - Simple guided process',
    'how.seamless.bullet2': 'Secure connection - End-to-end encrypted data transmission',
    'how.seamless.bullet3': 'Low power consumption - Solar-powered option available',

    'footer.companyName': 'Smart FishFarm',
    'footer.tagline': 'IoT solution for modern and sustainable aquaculture.',
    'footer.products': 'Products',
    'footer.resources': 'Resources',
    'footer.company': 'Company',
    'footer.monitoring': 'Monitoring Device',
    'footer.dashboard': 'Dashboard',
    'footer.pricing': 'Pricing Packages',
    'footer.demo': 'Demo',
    'footer.blog': 'Blog',
    'footer.docs': 'Documentation',
    'footer.guide': 'User Guide',
    'footer.support': 'Customer Service',
    'footer.about': 'About Us',
    'footer.careers': 'Careers',
    'footer.contact': 'Contact',
    'footer.partners': 'Partners',
    'footer.copyright': '© 2025 Smart FishFarm. All rights reserved.',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
    'footer.cookie': 'Cookie Policy',

    'dashboard.title': 'Interactive Dashboard',
    'dashboard.subtitle': 'Monitor and analyze your water quality from anywhere',
    'dashboard.tab.overview': 'Overview',
    'dashboard.tab.analytics': 'Analytics',
    'dashboard.tab.alerts': 'Alerts',
    'dashboard.alerts.title': 'Active Alerts',
    'dashboard.alert.tempOutOfBounds': 'Temperature `{temp}` is outside the range [`{min}`–`{max}`]',
    'dashboard.alert.tempNormal': 'Temperature `{temp}` has returned to normal [`{min}`–`{max}`]',
    'device.pond1': 'Pond 1',
    'device.pond2': 'Pond 2',
    'dashboard.alert.allGood': 'All systems operating normally',
    'dashboard.alert.justNow': 'Just now',

     // DemoAnalytics
  'analytics.title': 'Analytics',
  'analytics.tab.data': 'Data',
  'analytics.tab.chart': 'Chart',
  'analytics.deviceInfo': 'Showing demo data for: {deviceName} ({deviceId})',
  'analytics.noDevice': 'Please select a device to view data (demo still works).',
  'analytics.filter': 'Filter:',
  'analytics.filter.period': 'Select period',
  'analytics.filter.today': 'Today',
  'analytics.filter.last7': 'Last 7 days',
  'analytics.filter.last30': 'Last 30 days',
  'analytics.filter.or': 'or',
  'analytics.filter.from': 'From date',
  'analytics.filter.to': 'To date',
  'analytics.filter.clear': 'Clear Filter',
  'analytics.columns': 'Columns',
  'analytics.refresh': 'Refresh',
  'analytics.deleteSelected': 'Delete Selected',
  'analytics.noData': 'No demo sensor data.',
  'analytics.rowsPerPage': 'Rows per page',
  'analytics.pageInfo': 'Page {page} of {totalPages}',
  'analytics.deleteConfirm.title': 'Delete Confirmation',
  'analytics.deleteConfirm.message': 'Are you sure you want to delete {count} selected data?',
  'analytics.deleteConfirm.cancel': 'Cancel',
  'analytics.deleteConfirm.confirm': 'Yes, Delete',
  
  // Table headers
  'table.header.selectAll': 'Select all',
  'table.header.timestamp': 'Timestamp',
  'table.header.temperature': 'Temperature (°C)',
  'table.header.turbidity': 'Turbidity (NTU)',
  'table.header.tds': 'TDS (ppm)',
  'table.header.ph': 'pH',

    'chart.title': 'Sensor Data',
  'chart.subtitle': 'Average values per day — demo mode',
  'chart.timeRange': 'Time Range',
  'chart.sensor': 'Sensor',
  'chart.timeRange.7d': 'Last 7 days',
  'chart.timeRange.14d': 'Last 14 days',
  'chart.timeRange.30d': 'Last 30 days',
  'chart.loading': 'Loading chart...',
  'chart.error': 'Failed to prepare chart data',
  'chart.tooltip.noData': 'No data',
  'sensor.temperature': 'Temperature',
  'sensor.turbidity': 'Turbidity',
  'sensor.tds': 'TDS',
  'sensor.ph': 'pH',
  },

  id: {
    // Hero
    'hero.title': 'Monitoring Kualitas Air Pintar untuk Kolam Anda',
    'hero.subtitle': 'Pemantauan real-time pH, suhu, kekeruhan dan TDS menggunakan teknologi IoT.',
    'hero.getStarted': 'Mulai',
    'hero.learnMore': 'Pelajari Lebih Lanjut',
    'hero.currentStatus': 'Status Air Saat Ini',

    // Features
    'features.title': 'Fitur Pemantauan Lanjutan',
    'features.subtitle': 'Alat komprehensif untuk menjaga lingkungan perairan Anda tetap sehat dan produktif',
    'feature.badge': 'Segera Hadir',
    // Feature cards
    'feature.realtime.title': 'Analitik Real-Time',
    'feature.realtime.desc': 'Pemantauan kontinu parameter air dengan notifikasi instan untuk perubahan kritis.',
    'feature.historical.title': 'Data Historis',
    'feature.historical.desc': 'Lacak perubahan seiring waktu dengan grafik historis rinci dan laporan yang dapat disesuaikan.',
    'feature.alerts.title': 'Pemberitahuan Mobile',
    'feature.alerts.desc': 'Terima notifikasi ke ponsel ketika parameter air melewati ambang aman.',
    'feature.cloud.title': 'Penyimpanan Cloud Aman',
    'feature.cloud.desc': 'Semua data Anda disimpan dengan aman di cloud dengan enkripsi end-to-end.',
    'feature.maintenance.title': 'Penjadwalan Pemeliharaan',
    'feature.maintenance.desc': 'Pengingat otomatis untuk kalibrasi sensor, pengujian air, dan pemeliharaan sistem.',
    'feature.maintenance.note': 'Sistem penjadwalan pintar kami sedang dikembangkan dan akan diluncurkan pada Q3 2025.',
    'feature.predictive.title': 'Analitik Prediktif',
    'feature.predictive.desc': 'Prediksi berbasis AI untuk mengantisipasi masalah kualitas air sebelum terjadi.',
    'feature.predictive.note': 'Kami sedang mengembangkan model AI lanjutan untuk memprediksi tren kualitas air. Fitur ini akan tersedia pada Q4 2025.',

    // Roadmap
    'roadmap.title': 'Peta Jalan Pengembangan Kami',
    'roadmap.subtitle': 'Kami terus bekerja untuk menghadirkan fitur yang lebih kuat. Berikut yang sedang kami bangun:',
    'roadmap.suggest': 'Usulkan Fitur',

    // How It Works
    'how.title': 'Cara Kerja Smart FishFarm',
    'how.subtitle': 'Pengaturan sederhana untuk pemantauan kualitas air yang canggih',
    'how.step1.title': 'Daftarkan Perangkat',
    'how.step1.body': 'Setelah pembelian, daftarkan perangkat Anda di aplikasi. Buat nama perangkat baru (mis. "Kolam 1") dan salin Device ID yang dihasilkan.',
    'how.step1.deviceIdLabel': 'Device ID',
    'how.step2.title': 'Konfigurasi Perangkat',
    'how.step2.body': 'Nyalakan perangkat sambil menekan tombol konfigurasi; hubungkan ke WiFi ESP32_Config; masukkan kredensial WiFi Anda; tempel Device ID; simpan konfigurasi.',
    'how.step3.title': 'Pasang Sensor',
    'how.step3.body': 'Tempatkan sensor kedap air di kolam Anda. Semua sensor berkomunikasi secara nirkabel dengan perangkat utama. Pastikan terendam penuh tetapi tidak menyentuh dasar.',
    'how.step4.title': 'Pantau Data',
    'how.step4.body': 'Lihat data real-time dan terima peringatan melalui dashboard web atau aplikasi mobile. Pengaturan sensor akan muncul otomatis setelah konfigurasi.',
    'how.configPreview': 'Pratinjau Antarmuka Konfigurasi',
    'how.wifiSsid': 'WiFi SSID',
    'how.wifiPassword': 'WiFi Password',
    'how.deviceId': 'Device ID',
    'how.saveConfig': 'Simpan Konfigurasi',
    'how.seamless.title': 'Proses Pengaturan Tanpa Hambatan',
    'how.seamless.desc': 'Sistem kami dirancang untuk instalasi tanpa ribet. Biasanya segala sesuatunya dapat berjalan dalam 15 menit, dengan data mengalir ke dashboard segera setelah konfigurasi.',
    'how.troubleshooting.title': 'Tips Pemecahan Masalah:',
    'how.troubleshooting.tip1': 'Pastikan perangkat dalam mode konfigurasi (LED biru berkedip)',
    'how.troubleshooting.tip2': 'Device ID bersifat case-sensitive - salin persis seperti yang ditampilkan',
    'how.troubleshooting.tip3': 'Jaga perangkat dalam jarak 10m dari router WiFi saat pengaturan',
    'how.watchVideo': 'Tonton Video Panduan',

    // Pricing
    'pricing.title': 'Pilih Opsi Pengaturan Anda',
    'pricing.subtitle': 'Pilih solusi yang sesuai dengan kemampuan teknis dan kebutuhan Anda',
    'pricing.firmware.title': 'Hanya Firmware',
    'pricing.firmware.price': 'Rp 300.000',
    'pricing.firmware.subtitle': 'Pembayaran sekali',
    'pricing.components.title': 'Firmware + Kit Komponen',
    'pricing.components.price': 'Rp 750.000',
    'pricing.components.badge': 'PRO',
    'pricing.ready.badge': 'ENTERPRISE',
    'pricing.ready.title': 'Kit Siap Pakai',
    'pricing.ready.price': 'Rp 1.250.000',
    'pricing.ready.subtitle': 'Pembayaran sekali dengan garansi 1 tahun',
    'pricing.youProvide.title': 'Yang Anda Sediakan:',
    'pricing.whatYouDo.title': 'Yang Perlu Anda Lakukan:',
    'pricing.readyIn.title': 'Siap Digunakan Dalam:',
    'pricing.getFirmware': 'Dapatkan Firmware Saja',
    'pricing.getComponents': 'Dapatkan Kit Komponen',
    'pricing.getReady': 'Dapatkan Kit Siap Pakai',

    // Pricing highlights
    'pricing.highlight.firmwareFile': 'File firmware untuk ESP32',
    'pricing.highlight.wiring': 'Diagram wiring terperinci',
    'pricing.highlight.docs': 'Dokumentasi lengkap',
    'pricing.highlight.emailSupport': 'Dukungan via email untuk masalah firmware',
    'pricing.highlight.esp32': 'Board pengembangan ESP32',
    'pricing.highlight.sensors': 'Sensor kedap air: pH, Suhu, Kekeruhan, TDS',
    'pricing.highlight.solar': 'Sistem tenaga panel surya',
    'pricing.highlight.mounts': 'Aksesori pemasangan dan kabel',
    'pricing.highlight.preassembled': 'Perangkat terpasang dan teruji',
    'pricing.highlight.preinstalled': 'Firmware terpasang',
    'pricing.highlight.videoAssist': 'Pendampingan 1-on-1 melalui panggilan video',
    'pricing.highlight.warranty': 'Garansi 1 tahun untuk semua komponen',

    // Comparison
    'comparison.feature': 'Fitur',
    'comparison.firmwareOnly': 'Hanya Firmware',
    'comparison.components': 'Firmware + Komponen',
    'comparison.ready': 'Kit Siap Pakai',
    'comparison.yes': 'Ya',
    'comparison.no': 'Tidak',
    'comparison.preinstalled': 'Sudah Terpasang',

    // FAQ
    'faq.title': 'Pertanyaan yang Sering Diajukan',
    'faq.upgradeQ': 'Bisakah saya meng-upgrade paket?',
    'faq.upgradeA': 'Ya, Anda dapat meng-upgrade kapan saja. Kami menawarkan kredit untuk pembelian sebelumnya saat meng-upgrade ke paket yang lebih tinggi.',
    'faq.solarQ': 'Berapa lama panel surya bertahan?',
    'faq.solarA': 'Panel surya kami berumur lebih dari 5 tahun penggunaan terus-menerus. Dapat menyediakan daya hingga 7 hari tanpa sinar matahari langsung.',
    'faq.deliveryQ': 'Berapa waktu pengiriman Kit Siap Pakai?',
    'faq.deliveryA': 'Kami mengirim dalam 1-2 hari kerja. Pengiriman di Indonesia 2-4 hari kerja, internasional 7-14 hari.',
    'faq.viewAll': 'Lihat Semua FAQ',

    // Buttons
    'btn.viewAllFaqs': 'Lihat Semua FAQ',

    // ID additions (translations)
    'roadmap.integration': 'Integrasi dengan Pemberi Makan Pintar',
    'roadmap.automatedReporting': 'Pelaporan Otomatis',

    'pricing.youDo.assemble': 'Rakit komponen menggunakan diagram wiring',
    'pricing.youDo.flash': 'Flash firmware ke ESP32',
    'pricing.youDo.configure': 'Konfigurasi perangkat',

    'pricing.readyIn.30min': '30 menit setelah unboxing',
    'pricing.readyIn.configure': 'Cukup konfigurasi dan jalankan',

    // comparison rows (ID)
    'comparison.row.firmwareFile': 'File Firmware',
    'comparison.row.esp32Board': 'Board ESP32',
    'comparison.row.sensors': 'Sensor',
    'comparison.row.solarPower': 'Tenaga Panel Surya',
    'comparison.row.preassembled': 'Sudah Terpasang',
    'comparison.row.setupAssistance': 'Bantuan Pengaturan',
    'comparison.row.warranty': 'Garansi',

    'comparison.emailOnly': 'Email Saja',
    'comparison.emailDocs': 'Email + Dokumen',
    'comparison.oneOnOne': '1-on-1 Call',

    'comparison.none': 'Tidak Ada',
    'comparison.sixMonths': '6 bulan',
    'comparison.oneYear': '1 Tahun',

    // how.step2 list items (ID)
    'how.step2.li1': 'Nyalakan perangkat sambil menekan tombol konfigurasi',
    'how.step2.li2': 'Hubungkan ke WiFi ESP32_Config',
    'how.step2.li3': 'Masukkan kredensial WiFi Anda',
    'how.step2.li4': 'Tempel Device ID',
    'how.step2.li5': 'Simpan konfigurasi',

    // how.seamless bullets (ID)
    'how.seamless.bullet1': 'Tidak perlu keahlian teknis - Proses panduan yang sederhana',
    'how.seamless.bullet2': 'Koneksi aman - Transmisi data end-to-end terenkripsi',
    'how.seamless.bullet3': 'Konsumsi daya rendah - Opsi tenaga solar tersedia',

    'footer.companyName': 'Smart FishFarm',
    'footer.tagline': 'Solusi IoT untuk budidaya perikanan modern dan berkelanjutan.',
    'footer.products': 'Produk',
    'footer.resources': 'Sumber Daya',
    'footer.company': 'Perusahaan',
    'footer.monitoring': 'Perangkat Pemantauan',
    'footer.dashboard': 'Dashboard',
    'footer.pricing': 'Paket Harga',
    'footer.demo': 'Demo',
    'footer.blog': 'Blog',
    'footer.docs': 'Dokumentasi',
    'footer.guide': 'Panduan Penggunaan',
    'footer.support': 'Customer Service',
    'footer.about': 'Tentang Kami',
    'footer.careers': 'Karir',
    'footer.contact': 'Kontak',
    'footer.partners': 'Mitra',
    'footer.copyright': '© 2025 Smart FishFarm. All rights reserved.',
    'footer.privacy': 'Kebijakan Privasi',
    'footer.terms': 'Syarat Layanan',
    'footer.cookie': 'Kebijakan Cookie',

    'dashboard.title': 'Dashboard Interaktif',
    'dashboard.subtitle': 'Pantau dan analisa kualitas air Anda dari mana saja',
    'dashboard.tab.overview': 'Ringkasan',
    'dashboard.tab.analytics': 'Analitik',
    'dashboard.tab.alerts': 'Peringatan',
    'dashboard.alerts.title': 'Peringatan Aktif',
    'dashboard.alert.tempOutOfBounds': 'Suhu `{temp}` di luar batas [`{min}`–`{max}`]',
    'dashboard.alert.tempNormal': 'Suhu `{temp}` sudah normal kembali [`{min}`–`{max}`]',
    'device.pond1': 'Kolam 1',
    'device.pond2': 'Kolam 2',
    'dashboard.alert.allGood': 'Semua sistem beroperasi normal',
    'dashboard.alert.justNow': 'Baru saja',

     // DemoAnalytics
  'analytics.title': 'Analitik',
  'analytics.tab.data': 'Data',
  'analytics.tab.chart': 'Grafik',
  'analytics.deviceInfo': 'Menampilkan data demo untuk: {deviceName} ({deviceId})',
  'analytics.noDevice': 'Silakan pilih perangkat untuk melihat data (demo tetap berfungsi).',
  'analytics.filter': 'Filter:',
  'analytics.filter.period': 'Pilih periode',
  'analytics.filter.today': 'Hari ini',
  'analytics.filter.last7': '7 hari terakhir',
  'analytics.filter.last30': '30 hari terakhir',
  'analytics.filter.or': 'atau',
  'analytics.filter.from': 'Dari tanggal',
  'analytics.filter.to': 'Sampai tanggal',
  'analytics.filter.clear': 'Bersihkan Filter',
  'analytics.columns': 'Kolom',
  'analytics.refresh': 'Segarkan',
  'analytics.deleteSelected': 'Hapus Terpilih',
  'analytics.noData': 'Tidak ada data sensor demo.',
  'analytics.rowsPerPage': 'Baris per halaman',
  'analytics.pageInfo': 'Halaman {page} dari {totalPages}',
  'analytics.deleteConfirm.title': 'Konfirmasi Penghapusan',
  'analytics.deleteConfirm.message': 'Apakah Anda yakin ingin menghapus {count} data terpilih?',
  'analytics.deleteConfirm.cancel': 'Batal',
  'analytics.deleteConfirm.confirm': 'Ya, Hapus',
  
  // Table headers
  'table.header.selectAll': 'Pilih semua',
  'table.header.timestamp': 'Timestamp',
  'table.header.temperature': 'Suhu (°C)',
  'table.header.turbidity': 'Kekeruhan (NTU)',
  'table.header.tds': 'TDS (ppm)',
  'table.header.ph': 'pH',

    'chart.title': 'Data Sensor',
  'chart.subtitle': 'Nilai rata-rata per hari — mode demo',
  'chart.timeRange': 'Rentang Waktu',
  'chart.sensor': 'Sensor',
  'chart.timeRange.7d': '7 hari terakhir',
  'chart.timeRange.14d': '14 hari terakhir',
  'chart.timeRange.30d': '30 hari terakhir',
  'chart.loading': 'Memuat grafik...',
  'chart.error': 'Gagal menyiapkan data grafik',
  'chart.tooltip.noData': 'Tidak ada data',
  'sensor.temperature': 'Suhu',
  'sensor.turbidity': 'Kekeruhan',
  'sensor.tds': 'TDS',
  'sensor.ph': 'pH',
  },
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === 'en' || saved === 'id') setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch (e) { console.warn('Failed to save language preference', e); }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = (key: string, fallback = '', params?: Record<string, any>) => {
  let value = TRANSLATIONS[lang]?.[key];
  if (value === undefined) {
    value = TRANSLATIONS.en[key] ?? fallback ?? key;
  }

  if (params) {
    Object.keys(params).forEach(paramKey => {
      const regex = new RegExp(`\\{${paramKey}\\}`, 'g');
      value = value.replace(regex, params[paramKey]);
    });
  }
  
  return value;
};

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider');
  return ctx;
};
