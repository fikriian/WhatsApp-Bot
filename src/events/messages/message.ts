import { WaClient, type WaIncomingMessageEvent } from "zapo-js";

export default {
    event: 'message',
    run: async (client: WaClient, event: WaIncomingMessageEvent) => {
        const text = extractText(event.message);
        if (text) {
            log(`${event.pushName} [${event.key.remoteJid}] : ${text}`, 'info');

            for(const prefix of config.Prefix) {
                if(text.startsWith(prefix)) {
                    const args = text.slice(prefix.length).trim().split(/ +/g);
                    const cmdInput = args.shift()?.toLowerCase();
                    const cmd = commands.get(cmdInput!);
                    if(cmd) {
                        cmd.run(client, event, args);
                    }
                }
            }
        }
    }
}