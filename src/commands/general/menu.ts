import { WaClient, type WaIncomingMessageEvent, type WaSendTextMessage } from "zapo-js";

export default {
    command: 'menu',
    alias: ['m', 'list'],
    description: 'Menampilkan menu commands bot',
    run: async (client: WaClient, event: WaIncomingMessageEvent, args: string[]) => {
        client.message.send(event.key.remoteJid, 'Halo, ini adalah menu.')
    }
}