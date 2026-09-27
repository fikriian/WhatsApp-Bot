import type { WaClient, WaIncomingMessageEvent } from "zapo-js";
import * as cheerio from "cheerio";

const baseUrl = "https://ssstik.io";
const regexTiktokUrl =
    /https:\/\/(?:m|www|vm|vt|lite)?\.?tiktok\.com\/((?:.*\b(?:(?:usr|v|embed|user|video|photo)\/|\?shareId=|\&item_id=)(\d+))|\w+)/;
const regexSsstikToken = /s_tt\s*=\s*'([^']+)'/;

const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
];

const extractToken = async (userAgent: string): Promise<{ token: string; cookie?: string }> => {
    try {
        const response = await fetch(`${baseUrl}/id`, {
            headers: {
                "User-Agent": userAgent,
                "Referer": "https://ssstik.io/id",
                "Origin": "https://ssstik.io",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to load ssstik page: HTTP ${response.status}`);
        }

        const html = await response.text();
        const cookie = response.headers.get("set-cookie") || undefined;
        const matchedToken = html.match(regexSsstikToken);

        if (matchedToken && matchedToken.length > 1) {
            return { token: matchedToken[1], cookie };
        } else {
            throw new Error("Can't find session token on ssstik.");
        }
    } catch (error: any) {
        throw new Error(
            "Something went wrong while fetching token: " + error.message,
        );
    }
};

async function scrape(url: string) {
    try {
        if (!regexTiktokUrl.test(url)) {
            throw new Error("Must be a valid tiktok url.");
        }

        const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        const { token, cookie } = await extractToken(userAgent);

        const formData = new URLSearchParams();
        formData.append("id", url);
        formData.append("locale", "id");
        formData.append("tt", token);

        const headers: Record<string, string> = {
            "User-Agent": userAgent,
            "Referer": "https://ssstik.io/id",
            "Origin": "https://ssstik.io",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "HX-Request": "true",
            "HX-Trigger": "submit",
            "HX-Target": "target",
        };

        if (cookie) {
            headers["Cookie"] = cookie;
        }

        const response = await fetch(`${baseUrl}/abc?url=dl`, {
            method: "POST",
            headers,
            body: formData.toString(),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch download links: HTTP ${response.status}`);
        }

        const html = await response.text();

        let $ = cheerio.load(html);

        if (
            $("div.math-inline").length > 0 ||
            html.includes("Please paste a valid link") ||
            html.includes("Error")
        ) {
            throw new Error("Invalid link or failed to fetch data.");
        }

        let title = $("p.maintext").text().trim() || $("h2").text().trim();
        let author = $("h2").text().trim();
        let avatarUrl = $("img.result_author").attr("src");

        let isPhoto = false;
        let downloads = [];

        if (
            $("ul.splide__list").length > 0 ||
            $("a.slide").length > 0 ||
            $("a.download_slide").length > 0
        ) {
            isPhoto = true;
            $("a.slide, a.download_slide").each((i, el) => {
                let href = $(el).attr("href");
                if (href) {
                    if (href.startsWith("/")) href = `${baseUrl}${href}`;
                    downloads.push({ type: "photo", url: href });
                }
            });
            let musicUrl = $("a.music").attr("href");
            if (musicUrl) {
                if (musicUrl.startsWith("/")) musicUrl = `${baseUrl}${musicUrl}`;
                downloads.push({ type: "music", url: musicUrl });
            }
        } else {
            $("a").each((i, el) => {
                let href = $(el).attr("href");
                let text = $(el).text().trim().toLowerCase();

                if (href && href !== "/" && !href.includes("snaptik")) {
                    if (
                        $(el).hasClass("without_watermark") ||
                        text.includes("tanpa tanda air") ||
                        text.includes("without watermark")
                    ) {
                        if (href.startsWith("/")) href = `${baseUrl}${href}`;
                        downloads.push({ type: "video", url: href });
                    } else if (
                        $(el).hasClass("music") ||
                        text.includes("mp3") ||
                        text.includes("music")
                    ) {
                        if (href.startsWith("/")) href = `${baseUrl}${href}`;
                        downloads.push({ type: "music", url: href });
                    }
                }
            });
            if (downloads.length === 0) {
                $("a.pure-button").each((i, el) => {
                    let href = $(el).attr("href");
                    if (href && href.includes("dl=")) {
                        if (href.startsWith("/")) href = `${baseUrl}${href}`;
                        downloads.push({ type: "video", url: href });
                    }
                });
            }
        }

        return {
            status: true,
            result: {
                title: title || "TikTok Content",
                author: author || "Unknown",
                thumbnail: avatarUrl || "",
                type: isPhoto ? "photo" : "video",
                downloads,
            },
        };
    } catch (error: any) {
        return {
            status: false,
            message: error.message,
        };
    }
}

export default {
    command: 'tiktok',
    alias: ['tt'],
    description: 'Men-download apapun dari TikTok!',
    run: async (client: WaClient, event: WaIncomingMessageEvent, args: string[]) => {
        const url = args.join(' ');

        if (!url) {
            return client.message.send(event.key.remoteJid!, "*Harap masukan URL TikTok!*", { quote: event });
        }

        await client.message.send(event.key.remoteJid!, "⏳ *_Memproses..._*", { quote: event });

        try {

            const result = await scrape(url);

            if (!result.status) {
                return client.message.send(event.key.remoteJid!, `❌ *_Gagal:_* ${result.message}`, { quote: event });
            }

            const data = result.result;

            if (!data?.downloads || data.downloads.length === 0 || !data.downloads[0]?.url) {
                return client.message.send(event.key.remoteJid!, "❌ *_Tidak ada link download yang dapat diproses!_*", { quote: event });
            }

            let text: string = `*${data.title}*\n\n`;
            text += `👤 Kreator: *${data.author}*\n\n`;
            text += `Ingin download video lain? Gunakan lagi \`${config.Prefix[0]}tiktok <Link>\``;

            const downloadUrl = data.downloads[0].url;
            const mediaRes = await fetch(downloadUrl, {
                headers: {
                    "User-Agent": userAgents[0],
                    "Referer": "https://ssstik.io/",
                }
            });

            if (!mediaRes.ok) {
                return client.message.send(event.key.remoteJid!, `❌ *_Gagal mengunduh media dari TikTok (HTTP ${mediaRes.status})_*`, { quote: event });
            }

            const mediaBuffer = Buffer.from(await mediaRes.arrayBuffer());
            const isPhoto = data.type === 'photo';

            await client.message.send(event.key.remoteJid!, {
                type: isPhoto ? 'image' : 'video',
                caption: text,
                gifPlayback: false,
                media: mediaBuffer,
                mimetype: isPhoto ? 'image/jpeg' : 'video/mp4'
            }, {
                quote: event
            });
        } catch (error: any) {
            await client.message.send(event.key.remoteJid!, `❌ *_Gagal:_* ${error.message}`, { quote: event });
        }
    }
}