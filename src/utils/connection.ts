import { WaClient } from 'zapo-js';

export const requestPairingCode = async (client: WaClient) => {
    try {
        if (!config.BotNumber) {
            log('BOT_NUMBER tidak ditemukan!', 'error');
            return;
        }

        const code = await client.auth.requestPairingCode(config.BotNumber, true);
        log(`Masukkan kode ini di WhatsApp: ${code.match(/.{1,4}/g)?.join('-')}`, 'info');
    } catch (error) {
        log(`Gagal meminta kode pairing: ${error}`, 'error');
    }
}