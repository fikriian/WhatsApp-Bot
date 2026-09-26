import { WaClient, type WaAuthCredentials, splitJid } from "zapo-js";

export default {
    event: 'auth_paired',
    once: true,
    run: async (client: WaClient, {credentials}: {credentials: WaAuthCredentials}) => {
        log(`Autentikasi berhasil sebagai ${splitJid(credentials.meJid ?? '').user}`, 'success');
    }
}