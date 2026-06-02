// TEMPLATE — copy this to "<sua-biblia>.js" (ex.: genebra.js) e ajuste os campos.
// Depois rode: node build-commentary.js <sua-biblia>
//
// O `id` vira o nome do arquivo gerado (public/data/commentary-<id>.json) e a chave
// guardada no navegador. O `name` é o texto que aparece no seletor do app.
// `sources` é a lista de arquivos JSON já no formato do contrato (veja README.md).
module.exports = {
  id: 'minha-biblia',
  name: 'Minha Bíblia de Estudos',
  sources: [
    // Arquivos gerados pelo SEU parser, no formato do contrato:
    'minha-biblia-commentary.json',
  ],
};
