import { WaClient, type WaConnectionEvent } from "zapo-js";
import { log } from "utils/log";
import { loadCommands } from "handlers/commands";

export default {
    event: 'connection',
    once: false,
    run: async (client: WaClient, connection: WaConnectionEvent) => {
        if(connection.status === 'open') {
            log('Koneksi WhatsApp berhasil!', 'success');

            await loadCommands(client);
        } else if(connection.status === 'close') {
            log(`Koneksi WhatsApp ditutup: ${connection.reason}`, 'warn');
        }
    }
}