import { WaClient, type WaIncomingMessageEvent } from "zapo-js";
import os from "os";

export default {
    command: 'stats',
    alias: [],
    owner: true,
    description: 'Menampilkan informasi bot',
    run: async (client: WaClient, event: WaIncomingMessageEvent, args: string[]) => {
        let sent = await client.message.send(event.key.remoteJid, '⏳ _Mengumpulkan metrik sistem..._', {
            quote: event
        });

        const startPing = Date.now();
        const latency = event.timestampSeconds
            ? Math.max(0, Date.now() - (event.timestampSeconds * 1000))
            : Math.round(Date.now() - startPing);

        // Region & ISP via ip-api.com
        let regionStr = 'Unknown';
        let ispStr = 'Unknown';
        try {
            const res = await fetch('http://ip-api.com/json/?fields=status,country,regionName,city,isp', {
                signal: AbortSignal.timeout(3500)
            });
            if (res.ok) {
                const data = await res.json() as { status?: string; country?: string; regionName?: string; city?: string; isp?: string };
                if (data.status === 'success') {
                    const parts = [data.city, data.regionName, data.country].filter(Boolean);
                    regionStr = parts.join(', ') || 'Unknown';
                    ispStr = data.isp || 'Unknown';
                }
            }
        } catch {
            regionStr = 'Unavailable';
        }

        // Platform & Runtime
        const platform = getPlatformName();
        const runtime = typeof (globalThis as any).Bun !== 'undefined'
            ? `Bun v${(globalThis as any).Bun.version}`
            : `Node.js ${process.version}`;

        // Memory (RAM, Heap, RSS, HSS)
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memPercent = totalMem > 0 ? ((usedMem / totalMem) * 100).toFixed(1) : '0';
        const ramStr = `${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${memPercent}%)`;

        const mem = process.memoryUsage();
        const rssStr = formatBytes(mem.rss);
        const heapStr = `${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}`;
        const hssStr = formatBytes(mem.external ?? 0);

        // Disk
        const diskStr = getDiskUsage();

        let text = `┌───「 *SYSTEM METRICS* 」\n`;
        text += `│\n`;
        text += `├─ 📡 *Network & Region*\n`;
        text += `│  • *Ping* : ${latency} ms\n`;
        text += `│  • *Region* : ${regionStr}\n`;
        text += `│  • *ISP* : ${ispStr}\n`;
        text += `│\n`;
        text += `├─ ⚙️ *Environment*\n`;
        text += `│  • *Platform* : ${platform}\n`;
        text += `│  • *Runtime* : ${runtime}\n`;
        text += `│  • *Uptime* : ${formatUptime(process.uptime())}\n`;
        text += `│\n`;
        text += `├─ 🧠 *Memory Usage*\n`;
        text += `│  • *RAM* : ${ramStr}\n`;
        text += `│  • *Heap* : ${heapStr}\n`;
        text += `│  • *RSS* : ${rssStr}\n`;
        text += `│  • *HSS* : ${hssStr}\n`;
        text += `│\n`;
        text += `├─ 💾 *Storage*\n`;
        text += `│  • *Disk* : ${diskStr}\n`;
        text += `│\n`;
        text += `└───「 *STATUS: ONLINE* 」`;

        await client.message.send(event.key.remoteJid, text, {
            quote: event,
            editKey: sent
        });
    }
}