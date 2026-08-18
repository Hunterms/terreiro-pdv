// Confere a matemática dos combos LENDO O index.html — não uma cópia dela.
// Roda: node test-combos.mjs
//
// Por que existe: combo e item avulso podem apontar pro mesmo produto, e a
// venda baixa um só inventário. Errar aqui vende estoque que não existe, ou
// baixa metade do que saiu. É a única lógica do arquivo que não dá pra
// conferir batendo o olho na tela.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const bloco = html.split('// ── COMBOS ─')[1]?.split('// ── FIM COMBOS ─')[0];
assert.ok(bloco, 'bloco de helpers de combo não encontrado no index.html');

// Monta os helpers com um S de mentira no lugar do estado do app
const montar = new Function('S', bloco.slice(bloco.indexOf('\n')) +
  '\nreturn { itensDe, consumoCarrinho, estoqueDe, custoDe, cabeNoCarrinho };');

const S = {
  products: [
    { id:'coxinha', nome:'Coxinha', preco:8,  precoCusto:3, estoque:10 },
    { id:'refri',   nome:'Refri',   preco:6,  precoCusto:2, estoque:4  },
    { id:'kit',     nome:'Kit Gira',preco:12, combo:[{id:'coxinha',qty:2},{id:'refri',qty:1}] },
    { id:'orfao',   nome:'Combo quebrado', preco:9, combo:[{id:'sumiu',qty:1}] },
  ],
  cart: [],
};
const { itensDe, consumoCarrinho, estoqueDe, custoDe, cabeNoCarrinho } = montar(S);
const prod = id => S.products.find(p => p.id === id);

// 1. Produto normal continua sendo o que sempre foi
assert.equal(estoqueDe(prod('coxinha')), 10);
assert.equal(custoDe(prod('coxinha')), 3);
assert.equal(itensDe(prod('coxinha')), null);

// 2. Combo: quantos dá pra montar sai do item mais escasso
//    coxinha 10/2 = 5 · refri 4/1 = 4  →  4
assert.equal(estoqueDe(prod('kit')), 4);
assert.equal(custoDe(prod('kit')), 3*2 + 2, 'custo do combo é a soma do que tem dentro');

// 3. Componente apagado do estoque: combo não vende (não estoura)
assert.equal(estoqueDe(prod('orfao')), 0);

// 4. Carrinho soma avulso + o que os combos carregam
S.cart = [{ id:'kit', qty:2 }, { id:'coxinha', qty:3 }];
assert.deepEqual(consumoCarrinho(), { coxinha: 2*2 + 3, refri: 2 });

// 5. O limite enxerga os dois caminhos ao mesmo tempo
//    refri tem 4; 2 kits já usaram 2; cabem mais 2 kits, não 3
S.cart = [{ id:'kit', qty:2 }];
assert.equal(cabeNoCarrinho(prod('kit'), 2), true);
assert.equal(cabeNoCarrinho(prod('kit'), 3), false);

//    e o avulso não pode furar o que o combo já reservou
S.cart = [{ id:'kit', qty:4 }];              // consome 8 coxinhas e 4 refris
assert.equal(cabeNoCarrinho(prod('coxinha'), 2), true);
assert.equal(cabeNoCarrinho(prod('coxinha'), 3), false, 'sobram 2 coxinhas, não 3');
assert.equal(cabeNoCarrinho(prod('refri'), 1), false, 'os 4 refris já foram pros combos');

// 6. Carrinho vazio não trava nada
S.cart = [];
assert.equal(cabeNoCarrinho(prod('kit'), 4), true);
assert.equal(cabeNoCarrinho(prod('kit'), 5), false);

console.log('✓ combos: 6 checagens passaram');
