import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';
import { setLang, t, tn, tr } from './i18n';
import { ZH } from './zh';

const SRC = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

/** Text literals a node can evaluate to: a string, or either branch of a ?: */
function literals(node: ts.Node): string[] {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isParenthesizedExpression(node)) return literals(node.expression);
  if (ts.isConditionalExpression(node))
    return [...literals(node.whenTrue), ...literals(node.whenFalse)];
  return [];
}

/** Strings inside a tr({...}) table, skipping icon paths, links and ids. */
function tableTexts(node: ts.Node): string[] {
  const out: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const parent = n.parent;
      const key =
        ts.isPropertyAssignment(parent) && parent.initializer === n ? parent.name.getText() : '';
      if (['to', 'icon', 'id', 'time', 'value', 'key'].includes(key)) return;
      if (/[A-Za-z]{2,}/.test(n.text)) out.push(n.text);
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
}

/** Every text the code sends through t(), tn() or tr(). */
function usedTexts(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of sourceFiles(SRC)) {
    const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        const name = n.expression.text;
        const arg = n.arguments[0];
        if (arg && (name === 't' || name === 'tn'))
          for (const s of literals(arg)) found.set(s, file);
        if (arg && name === 'tr') for (const s of tableTexts(arg)) found.set(s, file);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return found;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

afterEach(() => setLang('en'));

describe('Chinese translation', () => {
  const used = usedTexts();

  it('has a Chinese entry for every text in the code', () => {
    expect(used.size).toBeGreaterThan(800); // the scan really found the app's texts
    const missing = [...used.keys()].filter((k) => !(k in ZH));
    expect(missing).toEqual([]);
  });

  it('keeps the same {placeholders} in every translation', () => {
    const wrong = Object.entries(ZH).filter(
      ([en, zh]) => placeholders(en).join() !== placeholders(zh).join(),
    );
    expect(wrong).toEqual([]);
  });

  it('switches texts, tables and placeholders with the language', () => {
    setLang('zh');
    expect(t('Today')).toBe(ZH['Today']);
    expect(t('{n} kg to go', { n: 3 })).toBe(ZH['{n} kg to go']?.replace('{n}', '3'));
    expect(tr({ a: 'Breakfast' }).a).toBe(ZH['Breakfast']);
    expect(tn('You logged food on {days}', { days: 'X' })).toBeTruthy();
    setLang('en');
    expect(t('Today')).toBe('Today');
  });
});
