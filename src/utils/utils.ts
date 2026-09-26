import type { Proto } from "zapo-js";


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

declare global {
    var extractText: (message?: Proto.IMessage | null) => string | undefined;
}

globalThis.extractText = extractText;