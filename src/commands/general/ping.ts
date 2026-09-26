import { WaClient, type WaIncomingMessageEvent, type WaSendTextMessage } from "zapo-js";

export default {
    command: 'ping',
    alias: ['p'],
    description: 'Cek kecepatan response bot',
    run: async (client: WaClient, event: WaIncomingMessageEvent, args: string[]) => {
        const startTime = event.timestampSeconds;
        const latency = Math.round(Date.now() - (startTime! * 1000));
        await client.message.send(event.key.remoteJid, `🏓 *Pong!* ${latency} ms`, { quote: event })
    }
}