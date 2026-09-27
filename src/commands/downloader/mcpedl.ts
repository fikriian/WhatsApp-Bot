import type { WaClient, WaIncomingMessageEvent } from "zapo-js";
import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";

const API = "https://api.mcpedl.com";
const WEB = "https://mcpedl.com";
const UA = "Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

const defaultHeaders = {
    "User-Agent": UA,
    "Accept": "application/json",
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    "Origin": WEB,
    "Referer": WEB + "/"
};

function parseJson(d: any) {
    if (typeof d === "string") {
        try {
            return JSON.parse(d);
        } catch (_) {
            return null;
        }
    }
    return d;
}

function pickItem(a: any) {
    if (!a) return null;
    const dl = Array.isArray(a.downloads) ? a.downloads : [];
    return {
        slug: a.slug ?? null,
        title: a.title ?? null,
        summary: a.summary ?? null,
        image: a.image ?? null,
        images: a.submission_images ?? [],
        thumbnails: a.thumbnails ?? [],
        url: a.slug ? WEB + "/" + a.slug + "/" : null,
        sourceUrl: a.url ?? null,
        downloadsCount: a.downloadCount ?? 0,
        averageRating: parseFloat(a.average_rating) || 0,
        popular: a.popular ?? {},
        tags: (a.tags || []).map((t: any) => t.name).filter(Boolean),
        categories: a.categories ?? [],
        author: a.username ?? null,
        authorAvatar: a.user_avatar ?? null,
        authorId: a.user_id ?? null,
        createdAt: a.created_at ?? null,
        publishedAt: a.publish_date ?? null,
        updatedAt: a.update_date ?? null,
        sortDate: a.sort_date ?? null,
        files: dl.map((f: any) => ({
            name: f.name ?? null,
            filename: f.filename ?? null,
            url: f.downloadUrl ?? null,
            size: f.fileLength ?? null,
            date: f.fileDate ?? null
        })),
        mainDownloadUrl: dl[0]?.downloadUrl ?? null,
        mainFilename: dl[0]?.filename ?? null
    };
}

async function fetchSubmissions(params: Record<string, any> = {}) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) qs.append(k, String(v));
    }
    const url = API + "/api/submissions" + (qs.toString() ? "?" + qs.toString() : "");
    const r = await fetch(url, { headers: defaultHeaders, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = parseJson(await r.text());
    if (!d || d.status !== "success") throw new Error("Response tidak valid");
    return { params: d.searchParams || {}, data: d.data || [] };
}

async function latest(limit = 15, from = 0) {
    const res = await fetchSubmissions({ from, size: limit });
    return { mode: "latest", from, size: limit, count: res.data.length, items: res.data.map(pickItem) };
}

async function detail(slug: string) {
    if (!slug) throw new Error("Slug kosong");

    // 1. Coba cari submission dengan slug yang tepat via endpoint submissions?s=
    const searchRes = await fetchSubmissions({ s: slug });
    let item = searchRes?.data?.find((x: any) => x.slug === slug);

    // 2. Jika belum ditemukan, coba via load-submission-by-type-and-slug di berbagai kategori
    if (!item) {
        for (const type of ['addons', 'texture-packs', 'maps', 'skins', 'servers']) {
            try {
                const url = `${API}/api/load-submission-by-type-and-slug?type=${type}&slug=${encodeURIComponent(slug)}`;
                const r = await fetch(url, { headers: defaultHeaders, signal: AbortSignal.timeout(10000) });
                if (r.ok) {
                    const d = parseJson(await r.text());
                    const found = d?.data?.find((x: any) => x.slug === slug);
                    if (found) {
                        item = found;
                        break;
                    }
                }
            } catch (_) {}
        }
    }

    if (!item) throw new Error("Addon / konten tidak ditemukan: " + slug);
    return { mode: "detail", addon: pickItem(item) };
}

async function search(query: string, limit = 15) {
    if (!query) throw new Error("Query kosong");

    // Endpoint pencarian submissions via parameter s=
    try {
        const res = await fetchSubmissions({ s: query, size: limit });
        if (res.data && res.data.length > 0) {
            return { mode: "search", query, count: res.data.length, items: res.data.map(pickItem) };
        }
    } catch (_) {
        // Lanjutkan ke fallback jika ada kendala
    }

    // Fallback: ambil submissions terbaru lalu filter client-side
    const all = await fetchSubmissions({ from: 0, size: 50 });
    const q = query.toLowerCase();
    const items = all.data
        .filter((a: any) => (a.title || "").toLowerCase().includes(q) || (a.summary || "").toLowerCase().includes(q))
        .map(pickItem);
    return { mode: "search-fallback", query, count: items.length, items };
}

async function searchByKeyword(query: string, limit = 15) {
    return await search(query, limit);
}

async function download(fileUrl: string, outPath?: string) {
    if (!fileUrl) throw new Error("URL file kosong");
    const out = outPath || path.join(process.cwd(), decodeURIComponent(fileUrl.split("/").pop() || "addon.mcaddon"));
    const writer = fs.createWriteStream(out);

    const r = await fetch(fileUrl, {
        headers: { "User-Agent": UA, Referer: WEB + "/" }
    });

    if (!r.ok || !r.body) {
        writer.close();
        try { fs.unlinkSync(out); } catch (_) {}
        throw new Error("Download gagal: HTTP " + r.status);
    }

    const total = Number(r.headers.get("content-length") || 0);

    return new Promise<{ path: string; size: number; expected: number | null }>((resolve, reject) => {
        let size = 0;
        let last = 0;
        const nodeStream = Readable.fromWeb(r.body as any);
        nodeStream.on("data", (c: Buffer) => {
            size += c.length;
            const now = Date.now();
            if (now - last > 1000) {
                last = now;
                const pct = total ? ((size / total) * 100).toFixed(1) + "%" : "";
                process.stderr.write("\r[download] " + (size / 1024 / 1024).toFixed(2) + " MB " + pct);
            }
        });
        nodeStream.pipe(writer);
        writer.on("finish", () => {
            process.stderr.write("\n");
            resolve({ path: out, size, expected: total || null });
        });
        writer.on("error", reject);
        nodeStream.on("error", reject);
    });
}

export default {
    command: 'mcpedl',
    alias: ['mcpe'],
    description: 'Download atau cari addon dari MCPEDL!',
    run: async (client: WaClient, event: WaIncomingMessageEvent, args: string[]) => {
        try {
            const query = args.join(' ').trim();

            if (!query) {
                return client.message.send(event.key.remoteJid!, `*Harap masukkan keyword pencarian atau link / slug addon MCPEDL!*\n\n*Contoh penggunaan:*\n• Cari addon: \`${config.Prefix[0]}mcpedl gun\`\n• Unduh addon: \`${config.Prefix[0]}mcpedl bare-bones-x-villager-news\`\n• Unduh via URL: \`${config.Prefix[0]}mcpedl https://mcpedl.com/bare-bones-x-villager-news/\``, {
                    quote: event
                });
            }

            let sent = await client.message.send(event.key.remoteJid!, '⏳ *_Sedang mencari data di MCPEDL..._*', {
                quote: event
            });

            // Cek apakah query berupa URL MCPEDL atau slug langsung (tanpa spasi)
            const urlMatch = query.match(/mcpedl\.com\/(?:addons\/|texture-packs\/|maps\/|skins\/|servers\/)?([a-zA-Z0-9_-]+)/);
            const isDirectSlug = urlMatch ? urlMatch[1] : (!query.includes(' ') && !query.includes('+') ? query : null);

            let addonDetail = null;
            if (isDirectSlug) {
                try {
                    const detailRes = await detail(isDirectSlug);
                    if (detailRes?.addon) {
                        addonDetail = detailRes.addon;
                    }
                } catch (_) {
                    // Bukan slug valid, lanjutkan ke mode pencarian
                }
            }

            // Jika addon spesifik ditemukan, kirim detail & file
            if (addonDetail) {
                const file = addonDetail.files?.[0];

                if (!file || !file.url) {
                    let text = `📦 *${addonDetail.title}*\n\n`;
                    if (addonDetail.summary) text += `${addonDetail.summary}\n\n`;
                    text += `👤 *Kreator:* ${addonDetail.author || 'Unknown'}\n`;
                    text += `⭐ *Rating:* ${addonDetail.averageRating} | 📥 *Unduhan:* ${addonDetail.downloadsCount}\n\n`;
                    text += `⚠️ *_File ini tidak memiliki link unduhan langsung dari server (eksternal)._*\n\nSilakan kunjungi link resmi berikut:\n${addonDetail.url}`;

                    return client.message.send(event.key.remoteJid!, text, {
                        quote: event,
                        editKey: sent
                    });
                }

                let text = `📦 *${addonDetail.title}*\n\n`;
                if (addonDetail.summary) text += `${addonDetail.summary}\n\n`;
                text += `👤 *Kreator:* ${addonDetail.author || 'Unknown'}\n`;
                text += `⭐ *Rating:* ${addonDetail.averageRating} | 📥 *Unduhan:* ${addonDetail.downloadsCount}\n`;
                text += `📁 *File:* ${file.filename || file.name || 'addon.mcpack'} (${formatBytes(file.size || 0)})\n\n`;
                text += `⏳ *_Sedang mengunduh file addon untuk dikirimkan..._*`;

                await client.message.send(event.key.remoteJid!, text, {
                    quote: event,
                    editKey: sent
                });

                if (file.size && file.size > 100 * 1024 * 1024) {
                    return client.message.send(event.key.remoteJid!, `⚠️ *_Ukuran file (${formatBytes(file.size)}) melebihi batas pengiriman WhatsApp (100 MB)._*\n\nSilakan unduh langsung dari link resmi:\n${file.url}`, {
                        quote: event
                    });
                }

                const res = await fetch(file.url, {
                    headers: { "User-Agent": UA, "Referer": WEB + "/" }
                });

                if (!res.ok) {
                    throw new Error(`Gagal mengunduh file addon (HTTP ${res.status})`);
                }

                const fileBuffer = Buffer.from(await res.arrayBuffer());

                return client.message.send(event.key.remoteJid!, {
                    type: 'document',
                    media: fileBuffer,
                    fileName: file.filename || file.name || `${addonDetail.slug}.mcpack`,
                    mimetype: 'application/octet-stream',
                    caption: `✅ *${addonDetail.title}* berhasil diunduh!`
                }, {
                    quote: event
                });
            }

            // Mode pencarian
            const results = await search(query);

            if (!results || !results.items.length) {
                return client.message.send(event.key.remoteJid!, `❌ *_Tidak ada addon yang ditemukan untuk:_* *${query}*`, {
                    quote: event,
                    editKey: sent
                });
            }

            let text = `┌───「 *MCPEDL SEARCH* 」\n`;
            text += `│\n`;
            text += `├─ 🔍 *Query:* ${query}\n`;
            text += `├─ 📦 *Ditemukan:* ${results.items.length} addon\n`;
            text += `│\n`;

            results.items.slice(0, 10).forEach((item: any, idx: number) => {
                text += `├─ ${idx + 1}. *${item.title}*\n`;
                text += `│  • 👤 *Author:* ${item.author || '-'}\n`;
                text += `│  • ⭐ *Rating:* ${item.averageRating} | 📥 ${item.downloadsCount}\n`;
                text += `│  • 💾 *Download:* \`${config.Prefix[0]}mcpedl ${item.slug}\`\n`;
                text += `│\n`;
            });

            text += `└───「 *Ketik perintah download di atas* 」`;

            await client.message.send(event.key.remoteJid!, text, {
                quote: event,
                editKey: sent
            });
        } catch (err: any) {
            await client.message.send(event.key.remoteJid!, `❌ *_Gagal:_* ${err.message || err}`, {
                quote: event
            });
        }
    }
};