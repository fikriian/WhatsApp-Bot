import { readdirSync } from 'fs';
import { WaClient } from 'zapo-js';

export interface BotCommand {
    command: string;
    alias?: string[];
    description?: string;
    run: (client: WaClient, ...args: any[]) => any;
}

export const commands: Map<string, BotCommand> = new Map();
export const aliases: Map<string, string> = new Map();

declare global {
    var commands: Map<string, BotCommand>;
    var aliases: Map<string, string>;
}

globalThis.commands = commands;
globalThis.aliases = aliases;

export const loadCommands = async (client: WaClient) => {
    let count = 0;
    log('Memuat commands...', 'info');

    for(const dir of readdirSync('./src/commands/')) {
        for(const file of readdirSync('./src/commands/' + dir + '/').filter((f) => f.endsWith('.ts'))) {
            const rawEv = require('../commands/' + dir + '/' + file);
            const ev = rawEv.default ?? rawEv;

            if (!ev || !ev.command) {
                log(`Command '${file}' tidak valid! Command harus memiliki properti 'command'.`, 'error');
                continue;
            }

            if (typeof ev.run !== 'function') {
                log(`Command '${file}' tidak valid! Command harus memiliki properti 'run' bertipe function.`, 'error');
                continue;
            }

            commands.set(ev.command, ev);
            count++;

            if(ev.alias && Array.isArray(ev.alias)) {
                ev.alias.forEach((alias: string) => {
                    if(commands.has(alias) || aliases.has(alias)) {
                        log(`Alias '${alias}' sudah digunakan oleh command atau alias lain!`, 'warn');
                        return;
                    }
                    aliases.set(alias, ev.command);
                });
            }
        }
    }

    log(`Berhasil memuat ${count} command`, 'success');
}