import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const headers = readFileSync(join(root, 'public/_headers'), 'utf8');

describe('security headers (public/_headers)', () => {
  it('allows exactly the inline theme script in index.html', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
    expect(inline).toHaveLength(1);
    const hash = createHash('sha256').update(inline[0]!, 'utf8').digest('base64');
    expect(headers).toContain(`'sha256-${hash}'`);
  });

  it('allows the Supabase project the app talks to', () => {
    const src = readFileSync(join(root, 'src/data/supabase.ts'), 'utf8');
    const url = /https:\/\/[a-z0-9]+\.supabase\.co/.exec(src)?.[0];
    expect(url).toBeTruthy();
    expect(headers).toContain(`connect-src 'self' ${url}`);
  });

  it('sends the basic protections', () => {
    for (const h of [
      'Strict-Transport-Security',
      'X-Content-Type-Options: nosniff',
      'X-Frame-Options: DENY',
      "frame-ancestors 'none'",
      "object-src 'none'",
      'camera=(self)',
    ])
      expect(headers).toContain(h);
  });
});
