# Cara Menggunakan GIT dengan Baik dan Benar

Dokumen ini memberikan panduan tentang cara menggunakan Git secara efektif dalam proyek ini.

## Instalasi (Untuk Pengguna Baru)

Jika Anda baru bergabung dengan proyek ini, silakan lanjutkan ke bagian [Setup Project](#setup-project) untuk petunjuk instalasi.

## Berkontribusi pada Proyek Ini

Kami sangat menghargai kontribusi Anda! Mohon ikuti panduan di bawah ini untuk memastikan alur kerja yang teratur.

**PENTING:** Dilarang melakukan *push* langsung ke *branch* `main`.

### Cara Branching

Gunakan konvensi penamaan *branch* berikut berdasarkan jenis perubahan yang Anda buat:

* **Improvement:** Untuk peningkatan atau pembaruan yang sudah ada.
    ```bash
    git checkout -b "improvement/deskripsi-perubahan"
    ```
* **Bug Fixing:** Untuk memperbaiki *bug*.
    ```bash
    git checkout -b "bugfix/deskripsi-bug"
    ```
* **Feature:** Untuk menambahkan fitur baru.
    ```bash
    git checkout -b "feature/nama-fitur"
    ```

### Cara Commit

Sertakan pesan *commit* yang jelas dan ringkas, mengikuti konvensi berikut:

* **Improvement:**
    ```
    git commit -m "improvement: deskripsi singkat peningkatan"
    ```
* **Bug Fixing:**
    ```
    git commit -m "bugfix: deskripsi singkat perbaikan bug"
    ```
* **Feature:**
    ```
    git commit -m "feature: deskripsi singkat fitur yang ditambahkan"
    ```

### Cara Mengatasi Konflik

Konflik dapat terjadi ketika ada perubahan bersamaan pada baris kode yang sama. Berikut adalah dua cara untuk mengatasinya:

**Cara Mengatasi Konflik (Disarankan)**

1.  Simpan sementara perubahan lokal Anda agar tidak hilang.
    ```bash
    git stash
    ```
2.  Ambil perubahan terbaru dari *branch* `main`.
    ```bash
    git pull origin main
    ```
3.  Terapkan kembali perubahan yang sebelumnya disimpan.
    ```bash
    git stash pop
    ```
4.  Lanjutkan pekerjaan Anda dan selesaikan konflik jika ada.

**Cara Mengatasi Konflik (Alternatif)**

Gunakan langkah-langkah ini jika terjadi kesalahan atau konflik yang sulit diselesaikan dengan cara pertama.

1.  Pindah ke *branch* `main`.
    ```bash
    git checkout main
    ```
2.  Ambil perubahan terbaru dari *branch* `main`.
    ```bash
    git pull
    ```
3.  Kembali ke *branch* yang sedang Anda kerjakan.
    ```bash
    git checkout <nama-branch-anda>
    ```
4.  Gabungkan perubahan dari *branch* `main` ke *branch* Anda.
    ```bash
    git merge origin main
    ```

## Rekomendasi Kode Editor

* [Visual Studio Code](https://code.visualstudio.com/)

## Rekomendasi Extension (untuk Visual Studio Code)

* [Stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint)
* [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
* [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
* [Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens)
* [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
* [PlatformIO](https://marketplace.visualstudio.com/items?itemName=platformio.platformio-ide)

## Setup Project

Ikuti langkah-langkah berikut untuk menyiapkan proyek di lingkungan lokal Anda.

1.  **Clone Project**
    ```bash
    git clone https://github.com/AkhyarAzamta/iot-web-app
    ```
2.  **Install NodeJS**
    Anda perlu menginstal [Node.js](https://nodejs.org/) (disarankan menggunakan versi LTS).
3.  **Install Dependency**
    Pasang semua *dependency* yang dibutuhkan untuk *frontend* dan *backend*.
4.  **Setup Env**
    * **Backend:**
        Masuk ke direktori `backend/`, buat salinan file `.env.example` dan ubah namanya menjadi `.env`. Sesuaikan variabel lingkungan di dalamnya.
        ```bash
        cd backend
        cp .env.example .env
        # Edit file .env sesuai kebutuhan
        ```
    * **Frontend:**
        Masuk ke direktori `frontend/`, buat salinan file `.env.local.example` dan ubah namanya menjadi `.env`. Sesuaikan variabel lingkungan di dalamnya.
        ```bash
        cd frontend
        cp .env.local.example .env
        # Edit file .env sesuai kebutuhan
        ```
5.  **Install Packages**
    Jalankan perintah berikut di direktori utama proyek untuk menginstal semua *dependency*.
    ```bash
    npm install
    ```

## Menjalankan Aplikasi

Ikuti petunjuk di bawah ini untuk menjalankan *NodeMCU*, *Backend* dan *Frontend*.

### ESP8266 (NodeMCU)

Untuk mengunggah kode ke *microcontroller* ESP8266 (NodeMCU), gunakan [PlatformIO](https://platformio.org/).

1.  **Instal Driver USB (Jika Perlu):**
    * **Windows:** Biasanya otomatis. Jika tidak, unduh *driver* CP210x atau CH340G.
    * **macOS/Linux:** Sebagian besar tidak memerlukan *driver* tambahan.

2.  **Hubungkan NodeMCU:**
    Gunakan kabel Micro USB.

3.  **Buka Proyek PlatformIO:**
    Buat proyek baru jika belum ada (PIO Home > New Project). Pilih *board* NodeMCU dan *framework* Arduino.

4.  **Instal Library:**
    * Melalui **PIO Home > Libraries**, cari dan tambahkan *library* yang dibutuhkan ke proyek.
    * Atau, tambahkan *dependency* di `platformio.ini` pada bagian `[env:...]` seperti:
        ```ini
        lib_deps =
            nama/library@^versi
        ```

5.  **Tulis Kode:**
    Edit file `main.cpp` di folder `src/`.

6.  **Unggah Kode:**
    Klik tombol **Upload** di PlatformIO.

7.  **Pantau Serial Monitor (Opsional):**
    Buka **PIO Home > Serial Monitor** untuk melihat output (*baud rate* sesuaikan dengan kode).


### Backend

1.  Pindah ke direktori `backend`.
    ```bash
    cd backend
    ```
2.  Jalankan migrasi database menggunakan prisma.
    ```bash
    npx prisma migrate dev
    ```
3.  Jalankan server *backend* dalam mode pengembangan.
    ```bash
    npm run dev
    ```

### Frontend

1.  Buka terminal baru lalu masuk ke direktori `frontend`.
    ```bash
    cd frontend
    ```
2.  Jalankan aplikasi *frontend* dalam mode pengembangan.
    ```bash
    npm run dev
    ```
3.  Untuk membuat *build* produksi, jalankan perintah berikut:
    ```bash
    npm run build
    ```
4.  Untuk menjalankan aplikasi *frontend* dalam mode produksi setelah di-*build*:
    ```bash
    npm run start
    ```

## 💻 Tech Stack

Berikut adalah teknologi utama yang digunakan dalam proyek ini:

**Client**

* [Next.js](https://nextjs.org/) – *React Framework* untuk aplikasi *fullstack* dengan dukungan SSR/SSG
* [Tailwind CSS](https://tailwindcss.com/) – *Utility-first CSS Framework* untuk desain UI responsif
* [Socket.IO Client](https://socket.io/docs/v4/client-api/) – Komunikasi *real-time* antara *browser* dan *server*

**Server**

* [Node.js](https://nodejs.org/) – Lingkungan *runtime JavaScript*
* [Express.js](https://expressjs.com/) – *Framework web server* minimal untuk Node.js
* [MQTT.js](https://www.npmjs.com/package/mqtt) – *MQTT client* untuk komunikasi antar perangkat IoT
* [Socket.IO](https://socket.io/) – Lapisan komunikasi *real-time*, dua arah
* [Prisma](https://www.prisma.io/) – ORM modern untuk *database* SQL (MySQL, PostgreSQL, dll.)

**Microcontroller**

* [ESP8266 / NodeMCU](https://www.espressif.com/en/products/socs/esp8266) – *Microcontroller* dengan Wi-Fi, cocok untuk aplikasi IoT