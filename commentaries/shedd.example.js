// Config pronta para a Bíblia de Estudo Shedd (tradução Almeida).
// Quando você tiver gerado o JSON do comentário no formato do contrato
// (veja commentaries/README.md), copie este arquivo para "shedd.js" e
// ajuste apenas o caminho em `sources` para o seu arquivo gerado.
//
//   1) copiar:  commentaries/shedd.example.js  ->  commentaries/shedd.js
//   2) montar:  node build-commentary.js shedd
//
// (O texto bíblico já é Almeida: o app traz NAA e ACF, que são Almeida.)
module.exports = {
  id: 'shedd',
  name: 'Bíblia de Estudo Shedd',
  sources: [
    'shedd-commentary.json', // <- o JSON que você gerou no formato do contrato
  ],
};
