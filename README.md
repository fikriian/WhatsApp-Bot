# Bot WhatsApp

Sebuah Bot WhatsApp yang jalan di bawah Runtime Bun dengan library **[zapo-js](https://zapo.to)**. Project ini cocok untuk kamu yang masih memiliki pengetahuan dasar dan ingin membuat Bot WhatsApp. Diprogram dengan bahasa *TypeScript*. Kamu sendiri bisa menambahkan beberapa event dan command sesuai preferensi kamu. Cukup lihat dan buka isi file di dalam folder **[events](./events/)** dan **[commands](./commands/)** untuk referensi kamu.

## Struktur Folder

```txt
/
├── src
│   ├── commands
│   │   ├── general
│   │   └── ...
│   ├── events
│   │   ├── connection
│   │   └── ...
│   ├── handlers
│   │   ├── commands.ts
│   │   └── events.ts
│   ├── utils
│   │   ├── config.ts
│   │   ├── log.ts
│   │   └── utils.ts
│   └── index.ts (file utama)
├── .env.example
├── .gitignore
├── bun.lock
├── package.json
├── README.md
└── tsconfig.json
```

## Cara Install

```bash
git clone https://github.com/fikriian/WhatsApp-Bot.git
cd WhatsApp-Bot
```

```bash
bun install
```

## Cara Menjalankan

Linux:
```bash
cp .env.example .env
bun .
```

Windows:
```bat
copy .env.example .env
bun .
```

## Kontribusi

Proyek ini terbuka untuk semua orang yang ingin berkontribusi. Berikut adalah beberapa langkah yang dapat kamu ikuti:

1. **Fork** repository ini
2. **Buat branch** baru (`git checkout -b feature/AmazingFeature`)
3. **Commit** perubahan kamu (`git commit -m 'Add some AmazingFeature'`)
4. **Push** ke branch (`git push origin feature/AmazingFeature`)
5. **Buka Pull Request**

## Kredit

**[zapo-js](https://zapo.to)** - Library yang digunakan untuk membuat bot.

**[Bun](https://bun.com)** - Runtime yang digunakan untuk menjalankan bot.

**[bun-qr](https://github.com/cipher-rc5/bun-qr)** - Library yang digunakan untuk menampilkan QR (Autentikasi QR)

## ⚠️ CATATAN ⚠️

Proyek ini ditujukan untuk edukasi semata. Saya tidak bertanggung jawab atas tindakan yang kamu lakukan dengan bot ini. Gunakan bot ini dengan bijak dan sesuai dengan hukum yang berlaku. Dilindungi oleh **[MIT License](https://github.com/fikriian/WhatsApp-Bot/blob/main/LICENSE)**.