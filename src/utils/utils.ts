import type { Proto } from "zapo-js";
import os from "os";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export function extractText(message?: Proto.IMessage | null): string | undefined {
    if (!message) return undefined
    return (
        message.conversation ??
        message.extendedTextMessage?.text ??
        message.imageMessage?.caption ??
        message.videoMessage?.caption ??
        undefined
    )
}

export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

export function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}

export function getPlatformName(): string {
    const arch = os.arch();
    if (process.platform === 'win32') {
        const release = os.release();
        const major = parseInt(release.split('.')[0] ?? '0', 10);
        const build = parseInt(release.split('.')[2] ?? '0', 10);
        let winName = 'Windows';
        if (major === 10) {
            winName = build >= 22000 ? 'Windows 11' : 'Windows 10';
        }
        return `${winName} (${arch})`;
    }
    if (process.platform === 'linux') {
        try {
            if (fs.existsSync('/etc/os-release')) {
                const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
                const prettyMatch = osRelease.match(/PRETTY_NAME="?([^"\n]+)"?/);
                if (prettyMatch) {
                    return `${prettyMatch[1]} (${arch})`;
                }
            }
        } catch {
            // fallback
        }
        return `Linux ${os.release()} (${arch})`;
    }
    if (process.platform === 'darwin') {
        return `macOS ${os.release()} (${arch})`;
    }
    return `${os.type()} ${os.release()} (${arch})`;
}

export function getDiskUsage(): string {
    // 1. fs.statfsSync (didukung native di Bun & modern Node.js di Linux & Windows)
    try {
        if (typeof fs.statfsSync === 'function') {
            const targetPath = process.platform === 'win32'
                ? (path.parse(process.cwd()).root || 'C:\\')
                : (process.cwd() || '/');
            const stat = fs.statfsSync(targetPath);
            const total = stat.bsize * stat.blocks;
            const free = stat.bsize * stat.bfree;
            const used = total - free;
            if (total > 0) {
                const pct = ((used / total) * 100).toFixed(1);
                return `${formatBytes(used)} / ${formatBytes(total)} (${pct}%)`;
            }
        }
    } catch {
        // fallback ke CLI di bawah
    }

    // 2. Fallback cross-platform via CLI
    try {
        if (process.platform === 'win32') {
            const drive = path.parse(process.cwd()).root.replace(/\\$/, '');
            const output = execSync(`wmic logicaldisk where "DeviceID='${drive}'" get FreeSpace,Size /value`, {
                encoding: 'utf8',
                timeout: 2000,
                windowsHide: true
            });
            const freeMatch = output.match(/FreeSpace=(\d+)/);
            const sizeMatch = output.match(/Size=(\d+)/);
            if (freeMatch && sizeMatch) {
                const total = parseInt(sizeMatch[1], 10);
                const free = parseInt(freeMatch[1], 10);
                const used = total - free;
                const pct = total > 0 ? ((used / total) * 100).toFixed(1) : '0';
                return `${formatBytes(used)} / ${formatBytes(total)} (${pct}%)`;
            }
        } else {
            // Linux / Unix fallback (df -k)
            const output = execSync('df -k / | tail -n 1', {
                encoding: 'utf8',
                timeout: 2000
            });
            const parts = output.trim().split(/\s+/);
            if (parts.length >= 4) {
                const total = parseInt(parts[1], 10) * 1024;
                const used = parseInt(parts[2], 10) * 1024;
                const pct = total > 0 ? ((used / total) * 100).toFixed(1) : '0';
                return `${formatBytes(used)} / ${formatBytes(total)} (${pct}%)`;
            }
        }
    } catch {
        // fallback gagal
    }

    return 'Unavailable';
}

declare global {
    var extractText: (message?: Proto.IMessage | null) => string | undefined;
    var formatBytes: (bytes: number) => string;
    var formatUptime: (seconds: number) => string;
    var getPlatformName: () => string;
    var getDiskUsage: () => string;
}

globalThis.extractText = extractText;
globalThis.formatBytes = formatBytes;
globalThis.formatUptime = formatUptime;
globalThis.getPlatformName = getPlatformName;
globalThis.getDiskUsage = getDiskUsage;