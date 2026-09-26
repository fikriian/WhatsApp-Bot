import { WaClient } from "zapo-js";
import { requestPairingCode } from "../../utils/connection";

export default {
    event: 'auth_pairing_required',
    once: false,
    run: async (client: WaClient) => {
        if(config.AuthType !== 'pairing') return;

        log('Meminta ulang permintaan autentikasi \'pairing\'...');
        await requestPairingCode(client);
    }
}