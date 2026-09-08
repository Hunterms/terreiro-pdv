// Confere a conta da gaveta e a devolução do estoque LENDO O index.html.
// Roda: node test-caixa.mjs
//
// Por que existe: são as duas contas do arquivo que erram em silêncio.
//
// A gaveta, porque somar pix e cartão junto do dinheiro faz a conferência
// acusar falta todos os dias — e conferência que acusa falta todo dia é
// conferência que ninguém olha mais, que é pior que não ter.
//
// A devolução, porque o mesmo produto pode estar avulso E dentro de um combo
// na mesma venda. Devolver por linha do carrinho devolve a menos, e o estoque
// passa a mentir pra baixo sem nada reclamar.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

// ── a conta da gaveta ────────────────────────────────────────────────────
const bloco = html.split('// ── DINHEIRO NA GAVETA ─')[1]?.split('function getFS()')[0];
assert.ok(bloco, 'bloco DINHEIRO NA GAVETA não encontrado');
const puro = bloco.slice(bloco.indexOf('function caixaDiaISO'));

const dia = '2026-09-08';
const emDia = (h, m = 0) => new Date(2026, 8, 8, h, m);
const S = {
  sales: [
    { method:'dinheiro', total:50,  ts: emDia(10) },
    { method:'dinheiro', total:30,  ts: emDia(11) },
    { method:'pix',      total:200, ts: emDia(12) },   // não passa pela gaveta
    { method:'credito',  total:80,  ts: emDia(13) },   // idem
    { method:'dinheiro', total:999, ts: new Date(2026, 8, 7, 20) }, // outro dia
  ],
  caixaMov: [
    { tipo:'fundo',      valor:100, dia },
    { tipo:'suprimento', valor:20,  dia },
    { tipo:'sangria',    valor:60,  dia },
    { tipo:'sangria',    valor:500, dia: '2026-09-07' },  // outro dia
  ],
};
const doc = { getElementById: () => ({ value: dia }) };
const { esperadoEmDinheiro, movsDoDia } = new Function('S', 'document', puro +
  '\nreturn { esperadoEmDinheiro, movsDoDia };')(S, doc);

assert.equal(movsDoDia().length, 3, 'movimento de outro dia não entra');
// 100 fundo + 80 dinheiro + 20 suprimento − 60 sangria = 140
assert.equal(esperadoEmDinheiro(), 140, 'pix e cartão NÃO podem entrar na gaveta');

S.caixaMov = [];
assert.equal(esperadoEmDinheiro(), 80, 'sem fundo nem sangria, é só o dinheiro do dia');
S.sales = [];
assert.equal(esperadoEmDinheiro(), 0, 'dia sem nada é zero, não NaN');

// ── a devolução do estoque ───────────────────────────────────────────────
// Recria a conta do estornarVenda a partir do próprio arquivo, pra não testar
// uma cópia dela.
const est = html.split('const volta = {};')[1]?.split('await Promise.all')[0];
assert.ok(est, 'trecho da devolução não encontrado');
const devolver = new Function('v', 'const volta = {};' + est + '\nreturn volta;');

// coxinha aparece avulsa (2) e dentro de 3 kits (1 cada) = 5
const venda = { items: [
  { id:'coxinha', qty:2 },
  { id:'kit', qty:3, componentes:[{ id:'coxinha', qty:1 }, { id:'refri', qty:2 }] },
]};
const volta = devolver(venda);
assert.equal(volta.coxinha, 5, 'avulso + dentro de combo somam; devolver por linha devolveria 2');
assert.equal(volta.refri, 6, '2 por kit × 3 kits');
assert.equal(volta.kit, undefined, 'o combo não é estoque: quem volta são os componentes');

// venda sem componentes (item simples) continua devolvendo
assert.deepEqual(devolver({ items:[{ id:'vela', qty:4 }] }), { vela: 4 });
// componentes vazio não pode virar "combo": o item é ele mesmo
assert.deepEqual(devolver({ items:[{ id:'vela', qty:1, componentes: [] }] }), { vela: 1 });
assert.deepEqual(devolver({ items: [] }), {}, 'venda sem itens não quebra');

console.log('✓ caixa: 11 asserções');
