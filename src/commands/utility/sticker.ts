import type { WaClient, WaIncomingMessageEvent } from "zapo-js";
import { downloadMediaMessage } from "zapo-js";
import sharp from "sharp";
import os from "os";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function isFfmpegAvailable(): Promise<boolean> {
    try {
        await execAsync("ffmpeg -version");
        return true;
    } catch {
        return false;
    }
}

function createExif(packName: string, authorName: string): Buffer {
    const json = {
        "sticker-pack-id": "com.snowcorp.stickerly.android.stickercontentprovider b5e7275f-f1de-4137-961f-57becfad88ff",
        "sticker-pack-name": packName,
        "sticker-pack-publisher": authorName,
        "emojis": ["🤖"]
    };

    const jsonBuffer = Buffer.from(JSON.stringify(json), "utf-8");
    const exifHeader = Buffer.from([
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);

    exifHeader.writeUInt32LE(jsonBuffer.length, 14);
    return Buffer.concat([exifHeader, jsonBuffer]);
}

function addExifToWebp(webpBuffer: Buffer, packName: string, authorName: string): Buffer {
    const exifData = createExif(packName, authorName);

    if (webpBuffer.subarray(0, 4).toString() !== 'RIFF' || webpBuffer.subarray(8, 12).toString() !== 'WEBP') {
        return webpBuffer;
    }

    let resultBuffer = Buffer.from(webpBuffer);
    if (resultBuffer.subarray(12, 16).toString() === 'VP8X') {
        resultBuffer[20] |= 0x08; // Set flag EXIF di VP8X
    }

    // Bersihkan chunk EXIF lama jika ada
    const chunks: Buffer[] = [];
    let offset = 12;
    while (offset < resultBuffer.length) {
        const chunkId = resultBuffer.subarray(offset, offset + 4).toString();
        const chunkSize = resultBuffer.readUInt32LE(offset + 4);
        const chunkFullSize = 8 + chunkSize + (chunkSize % 2);

        if (chunkId !== 'EXIF') {
            chunks.push(resultBuffer.subarray(offset, Math.min(offset + chunkFullSize, resultBuffer.length)));
        }
        offset += chunkFullSize;
    }

    // Buat chunk EXIF baru
    const exifChunkHeader = Buffer.alloc(8);
    exifChunkHeader.write('EXIF', 0);
    exifChunkHeader.writeUInt32LE(exifData.length, 4);

    const padding = exifData.length % 2 !== 0 ? Buffer.from([0x00]) : Buffer.alloc(0);
    const exifChunk = Buffer.concat([exifChunkHeader, exifData, padding]);

    chunks.push(exifChunk);

    // Susun ulang kontainer RIFF
    const payload = Buffer.concat(chunks);
    const riffHeader = Buffer.alloc(12);
    riffHeader.write('RIFF', 0);
    riffHeader.writeUInt32LE(payload.length + 4, 4);
    riffHeader.write('WEBP', 8);

    return Buffer.concat([riffHeader, payload]);
}

export default {
    command: 'sticker',
    alias: ['s'],
    description: 'Mengubah gambar atau video menjadi sticker',
    run: async (client: WaClient, event: WaIncomingMessageEvent, args: string[]) => {
        const jid = event.key.remoteJid!;

        try {
            // Cek apakah ada media di pesan ini atau di pesan yang di-reply (quoted)
            const quoted = event.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const targetMessage = (quoted?.imageMessage || quoted?.videoMessage || quoted?.stickerMessage)
                ? quoted
                : event.message;

            const isImage = !!targetMessage?.imageMessage;
            const isVideo = !!targetMessage?.videoMessage;
            const isSticker = !!targetMessage?.stickerMessage;

            if (!isImage && !isVideo && !isSticker) {
                return client.message.send(jid, `*Harap reply gambar/video atau kirim gambar/video bersama pesan!*\n\n*Format perintah:*\n• \`${config.Prefix[0]}s\`\n• \`${config.Prefix[0]}s <Pack Name> | <Author Name>\`\n\n*Contoh:*\n• \`${config.Prefix[0]}s My Pack | ${event.pushName || 'Fikri'}\``, {
                    quote: event
                });
            }

            // Tentukan nama pack dan author
            const input = args.join(' ').trim();
            let packName = `🤖 Bot: ${config.BotNumber}`;
            let authorName = '@fikriian';

            if (input) {
                if (input.includes('|')) {
                    const parts = input.split('|').map(s => s.trim());
                    packName = parts[0] || packName;
                    authorName = parts[1] || authorName;
                } else {
                    packName = input;
                }
            }

            await client.message.send(jid, '⏳ *_Sedang memproses sticker..._*', { quote: event });

            // Unduh media dari server WhatsApp menggunakan zapo-js
            const stream = await downloadMediaMessage(targetMessage);
            const chunks: Buffer[] = [];
            for await (const chunk of stream) {
                chunks.push(Buffer.from(chunk));
            }
            const mediaBuffer = Buffer.concat(chunks);

            let stickerBuffer: Buffer;

            if (isVideo) {
                const videoDuration = targetMessage.videoMessage?.seconds ?? 0;
                if (videoDuration > 10) {
                    return client.message.send(jid, '⚠️ *_Durasi video maksimal 10 detik untuk dijadikan sticker!_*', {
                        quote: event
                    });
                }

                const hasFfmpeg = await isFfmpegAvailable();
                if (!hasFfmpeg) {
                    return client.message.send(jid, '⚠️ *_Konversi video menjadi animated sticker membutuhkan FFmpeg terpasang di sistem. Silakan gunakan gambar/foto!_*', {
                        quote: event
                    });
                }

                const tempInput = path.join(os.tmpdir(), `input_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
                const tempOutput = path.join(os.tmpdir(), `output_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);

                await fs.promises.writeFile(tempInput, mediaBuffer);
                try {
                    await execAsync(`ffmpeg -y -i "${tempInput}" -t 7 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -vcodec libwebp -lossless 0 -compression_level 4 -q:v 70 -loop 0 -preset default -an -vsync 0 "${tempOutput}"`);
                    stickerBuffer = await fs.promises.readFile(tempOutput);
                } finally {
                    await fs.promises.unlink(tempInput).catch(() => {});
                    await fs.promises.unlink(tempOutput).catch(() => {});
                }
            } else {
                // Konversi gambar atau sticker ke 512x512 WebP menggunakan sharp
                stickerBuffer = await sharp(mediaBuffer, { animated: isSticker })
                    .resize(512, 512, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })
                    .webp({ quality: 80 })
                    .toBuffer();
            }

            // Tambahkan metadata EXIF (Author & Pack Name) ke file WebP
            stickerBuffer = addExifToWebp(stickerBuffer, packName, authorName);

            // Kirim sebagai sticker ke WhatsApp
            await client.message.send(jid, {
                type: 'sticker',
                media: stickerBuffer
            }, {
                quote: event
            });
        } catch (error: any) {
            console.error('Error in sticker command:', error);
            await client.message.send(jid, `❌ *_Gagal membuat sticker:_* ${error.message || error}`, {
                quote: event
            });
        }
    }
};