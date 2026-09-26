import { WaClient } from "zapo-js";

export default {
    event: 'auth_paired',
    once: true,
    run: async (client: WaClient, {credentials}: {credentials: any}) => {
        log(`Autentikasi berhasil sebagai ${credentials.meJid.user}`, 'success');
    }
}