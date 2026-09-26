import { WaClient, type WaIncomingMessageEvent, isGroupJid, splitJid } from "zapo-js";

export default {
    event: 'message',
    run: async (client: WaClient, event: WaIncomingMessageEvent) => {
        const text = extractText(event.message);
        if (text) {
            if(isGroupJid(event.key.remoteJid)) {
                log(`${event.pushName} [${splitJid(event.key.participantAlt!).user} -> ${splitJid(event.key.remoteJid).user}] : ${text}`, 'info');
            } else {
                log(`${event.pushName} [${splitJid(event.key.remoteJidAlt!).user}] : ${text}`, 'info');
            }
            await client.chat.setChatRead(event.key.remoteJid, true);
            await client.message.sendReceipt(event, { type: 'read' });
            
            for(const prefix of config.Prefix) {
                if(text.startsWith(prefix)) {
                    const args = text.slice(prefix.length).trim().split(/ +/g);
                    const cmdInput = args.shift()?.toLowerCase();
                    const cmd = commands.get(cmdInput!) || commands.get(aliases.get(cmdInput!)!);
                    if(cmd) {
                        await client.presence.sendChatstate(event.key.remoteJid, { state: 'composing' });
                        cmd.run(client, event, args);
                        await client.presence.sendChatstate(event.key.remoteJid, { state: 'paused' });
                    }
                }
            }
        }
    }
}