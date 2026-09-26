import chalk from 'chalk';

export type LogLevel = 'info' | 'error' | 'warn' | 'success';

export const log = (message: string, level: LogLevel = 'info') => {
    const timestamp = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const color = level === 'info' ? chalk.blue : level === 'error' ? chalk.red : level === 'warn' ? chalk.yellow : chalk.green;
    const label = level === 'info' ? 'INFO' : level === 'error' ? 'ERROR' : level === 'warn' ? 'WARN' : 'SUCCESS';
    
    console.log(chalk.gray(`[${timestamp}]`), color(`[${label}]`), ':', message);
};

declare global {
    var log: (message: string, level?: LogLevel) => void;
}

globalThis.log = log;