import { readdirSync } from 'fs';
import { WaClient } from 'zapo-js';

export interface BotEvent {
    event: string;
    once?: boolean;
    run: (client: WaClient, ...args: any[]) => any;
}

export const loadEvents = async (client: WaClient) => {
    let count = 0;
    log('Memuat event...', 'info');

    for(const dir of readdirSync('./src/events/')) {
        for(const file of readdirSync('./src/events/' + dir + '/').filter((f) => f.endsWith('.ts'))) {
            const rawEv = require('../events/' + dir + '/' + file);
            const ev = rawEv.default ?? rawEv;

            if (!ev || !ev.event) {
                log(`Event '${file}' tidak valid! Event harus memiliki properti 'event'.`, 'error');
                continue;
            }

            if (typeof ev.run !== 'function') {
                log(`Event '${file}' tidak valid! Event harus memiliki properti 'run' bertipe function.`, 'error');
                continue;
            }

            if (ev.once) {
                client.once(ev.event as any, (...args: any[]) => ev.run(client, ...args));
            } else {
                client.on(ev.event as any, (...args: any[]) => ev.run(client, ...args));
            }

            count++;
        }
    }

    log(`Berhasil memuat ${count} event`, 'success');
}