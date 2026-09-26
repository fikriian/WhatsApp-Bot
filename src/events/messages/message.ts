import { WaClient, type WaIncomingMessageEvent, isGroupJid, splitJid } from "zapo-js";

export default {
    event: 'message',
    run: async (client: WaClient, event: WaIncomingMessageEvent) => {
        const text = extractText(event.message);
        if (text) {
            if(isGroupJid(event.key.remoteJid)) {
                const groupName = (await client.group.queryGroupMetadata(event.key.remoteJid)).subject;
                log(`${event.pushName} [${splitJid(event.key.participantAlt!).user} -> ${groupName}] : ${text}`, 'info');
            } else {
                log(`${event.pushName} [${splitJid(event.key.remoteJidAlt!).user || 'Unknown'}] : ${text}`, 'info');
            }
            await client.chat.setChatRead(event.key.remoteJid, true);
            await client.message.sendReceipt(event, { type: 'read' });
            
            for(const prefix of config.Prefix) {
                if(text.startsWith(prefix)) {
                    const args = text.slice(prefix.length).trim().split(/ +/g);
                    const cmdInput = args.shift()?.toLowerCase();
                    const cmd = commands.get(cmdInput!) || commands.get(aliases.get(cmdInput!)!);
                    if(cmd) {
                        const sender = isGroupJid(event.key.remoteJid)
                            ? (event.key.participantAlt ?? event.key.participant!)
                            : (event.key.remoteJidAlt ?? event.key.remoteJid);

                        if(cmd.owner && !config.Owners.includes(splitJid(sender).user)) {
                            await client.message.send(event.key.remoteJid, '❌ _Perintah ini hanya dapat digunakan oleh Owner bot!_', {
                                quote: event
                            });
                            return;
                        }

                        await client.presence.sendChatstate(event.key.remoteJid, { state: 'composing' });
                        cmd.run(client, event, args);
                        await client.presence.sendChatstate(event.key.remoteJid, { state: 'paused' });
                    }
                }
            }
        }
    }
}