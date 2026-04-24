const isTTY = process.stdout.isTTY;

export const green = (text: string) => isTTY ? `\x1b[32m${text}\x1b[0m` : text;
export const red = (text: string) => isTTY ? `\x1b[31m${text}\x1b[0m` : text;
export const yellow = (text: string) => isTTY ? `\x1b[33m${text}\x1b[0m` : text;
export const cyan = (text: string) => isTTY ? `\x1b[36m${text}\x1b[0m` : text;
export const gray = (text: string) => isTTY ? `\x1b[90m${text}\x1b[0m` : text;
export const bold = (text: string) => isTTY ? `\x1b[1m${text}\x1b[0m` : text;
