import { WaClient } from "zapo-js";
import { requestPairingCode } from "../../utils/connection";
import encode_qr from 'bun-qr';

export default {
    event: 'auth_qr',
    once: false,
    run: async (client: WaClient, {qr, ttlMs}: {qr: string, ttlMs: number}) => {
        if(config.AuthType !== 'qr') {
            log('Autentikasi \'pairing\' aktif. Meminta kode pairing...')
            await requestPairingCode(client);
            return;
        }

        log(`Autentikasi \'qr\' aktif. Harap scan QR code dalam ${ttlMs / 1000} detik`);
        const term = encode_qr(qr, 'ascii');
        console.log('');
        console.log(term);
    }
}