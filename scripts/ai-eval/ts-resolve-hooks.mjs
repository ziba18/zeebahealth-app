import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export async function resolve(specifier, context, next) {
  if (specifier === 'react-native') return next(new URL('./rn-stub.mjs', import.meta.url).href, context);
  if (specifier.startsWith('.') && context.parentURL) {
    const base = new URL(specifier, context.parentURL);
    for (const ext of ['.ts', '.tsx', '/index.ts']) {
      const p = fileURLToPath(base) + ext;
      if (existsSync(p)) return next(base.href + ext, context);
    }
  }
  return next(specifier, context);
}
