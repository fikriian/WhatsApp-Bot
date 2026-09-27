import { config as dotenvConfig } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

export interface BotConfig {
    BotNumber: string;
    Prefix: string[];
    Owners: string[];
    AuthType: 'pairing' | 'qr';
}

declare global {
    var config: BotConfig;
}

export const load = async (): Promise<BotConfig> => {
    log('Memuat Environment...', 'info');

    dotenvConfig({ quiet: true });

    let botNumber = process.env.BOT_NUMBER;
    if(!botNumber || typeof botNumber !== 'string') {
        log('BOT_NUMBER tidak ditemukan di .env!', 'error');
        process.exit(1);
    } else if(botNumber.startsWith('+')) {
        log('Format BOT_NUMBER salah! Harap hapus tanda "+"', 'error');
        process.exit(1);
    } else if (botNumber.startsWith('0')) {
        log('Ditemukan format lama (diawali 0). Mengubah otomatis...', 'warn');
        botNumber = `62${botNumber.slice(1)}`
        await save('BOT_NUMBER', botNumber);
    }
    log('Nomor bot berhasil dimuat.', 'success');

    let rawPrefixes = process.env.PREFIX || '.';
    let prefixes: string[];
    if(typeof rawPrefixes === 'string') {
        prefixes = rawPrefixes.split(',');
    } else {
        prefixes = [rawPrefixes];
    }
    log(`Prefix berhasil dimuat: ${prefixes}`, 'success');

    let rawOwners = process.env.OWNERS || '';
    let owners: string[];
    if(typeof rawOwners === 'string') {
        owners = rawOwners.split(',');
    } else {
        owners = [rawOwners];
    }
    log(`Owner berhasil dimuat: ${owners}`, 'success');

    const authType = process.env.AUTH_TYPE;
    if (authType !== 'pairing' && authType !== 'qr') {
        log('AUTH_TYPE tidak valid!', 'error');
        process.exit(1);
    }
    log(`Auth Type berhasil dimuat: ${authType}`, 'success');

    const stikerAuthor = process.env.STICKER_AUTHOR;
    if (!stikerAuthor) {
        log('STICKER_AUTHOR tidak ditemukan di .env!', 'error');
        process.exit(1);
    }
    log(`Sticker Author berhasil dimuat: ${stikerAuthor}`, 'success');

    const stikerPackName = process.env.STICKER_PACK_NAME;
    if (!stikerPackName) {
        log('STICKER_PACK_NAME tidak ditemukan di .env!', 'error');
        process.exit(1);
    }
    log(`Sticker Pack berhasil dimuat: ${stikerPackName}`, 'success');

    const botConfig: BotConfig = {
        BotNumber: botNumber,
        Prefix: prefixes,
        Owners: owners,
        AuthType: authType
    };

    globalThis.config = botConfig;
    return botConfig;
}

export const save = async (key: string, value: any) => {
    if (!key) {
        log('Mohon masukkan \'key\' terlebih dahulu.', 'error');
        return false;
    }

    if (value === undefined || value === null) {
        log('Mohon masukkan nilai untuk \'key\'!', 'error');
        return false;
    }

    const envPath = path.resolve(process.cwd(), '.env');
    const strVal = Array.isArray(value) ? value.join(',') : String(value);

    try {
        let content = '';
        try {
            content = await fs.readFile(envPath, 'utf-8');
        } catch (err: any) {
            if (err.code !== 'ENOENT') throw err;
            content = '';
        }

        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const keyRegex = new RegExp(`^${escapedKey}=.*$`, 'm');
        let newContent: string;

        if (keyRegex.test(content)) {
            newContent = content.replace(keyRegex, `${key}=${strVal}`);
        } else {
            const trimmed = content.trim();
            newContent = trimmed ? `${trimmed}\n${key}=${strVal}\n` : `${key}=${strVal}\n`;
        }

        await fs.writeFile(envPath, newContent, 'utf-8');
        process.env[key] = strVal;

        log(`Key '${key}' berhasil disimpan ke .env`, 'success');
        return true;
    } catch (error) {
        log(`Gagal menyimpan '${key}' ke .env: ${error}`, 'error');
        return false;
    }
};