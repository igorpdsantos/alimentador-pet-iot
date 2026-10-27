// Exemplos do contrato em tools/protocol-fixtures (os mesmos que os testes do firmware usam).
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIR = resolve(process.cwd(), '../tools/protocol-fixtures');

export const fixture = (name: string): unknown => JSON.parse(readFileSync(join(DIR, name), 'utf8'));
export const fixtureNames = () => readdirSync(DIR).filter((f) => f.endsWith('.json'));
