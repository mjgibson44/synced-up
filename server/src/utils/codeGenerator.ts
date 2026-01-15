// Characters that are easy to read and not ambiguous (no I, O, 0, 1)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateGameCode(length: number = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}
