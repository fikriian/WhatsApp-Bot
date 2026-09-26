import { WaClient, type WaIncomingMessageEvent, type WaSendTextMessage } from "zapo-js";

export default {
    command: 'menu',
    alias: ['m'],
    description: 'Menampilkan menu commands bot',
    run: async (client: WaClient, event: WaIncomingMessageEvent, args: string[]) => {
        let text: string = '🎉 Selamat datang di Bot Hyerii! 🎉\n\n';
        text += "Bot ini dirancang untuk edukasi semata, dibuat oleh *@hyeriirim* menggunakan *_zapo-js_* dan diketik dalam bahasa _TypeScript_.";
        text += "Namun, kamu juga dapat menggunakan bot ini untuk mendapatkan masukan dan akan dikirim ke pembuat bot!\n\n";
        text += "Berikut adalah beberapa perintah yang tersedia:\n\n";
        let count = 1;
        for(const [cmd, cmdObj] of commands.entries()) {
            if(cmdObj.alias) {
                text += `${count++}. *${config.Prefix[0]}${cmd}* (${cmdObj.alias.map((alias: string) => config.Prefix[0] + alias).join(', ')}) - ${cmdObj.description}\n`;
            } else {
                text += `${count++}. *${config.Prefix[0]}${cmd}* - ${cmdObj.description}\n`;
            }
        }

        text += "\n*_Semoga bermanfaat._*";

        let sent = await client.message.send(event.key.remoteJid, '⏳ _Mohon tunggu sebentar..._', {
            quote: event
        })

        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        await client.message.send(event.key.remoteJid, text, {
            quote: event,
            editKey: sent
        })
    }
}