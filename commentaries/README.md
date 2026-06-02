# Como adicionar a sua própria bíblia de estudos

O app separa **texto bíblico** (igual para todos) de **comentário** (a sua bíblia de
estudos). Você pode ter várias bíblias de estudos instaladas e alternar entre elas
pelo seletor no topo do app.

Cada bíblia de estudos é gerada em **3 etapas**. As etapas 1 e 3 são mecânicas; a
etapa 2 (o *parser*) é a única que precisa ser adaptada ao formato do seu PDF.

```
PDF  ──(1) extrair──>  raw-text.json  ──(2) parsear──>  commentary.json  ──(3) montar──>  app
                       (texto + <b>/<i>)                 (formato do contrato)
```

## 1. Extrair o texto do PDF

Use `extract-formatted.js` como base (ele detecta automaticamente as fontes de
negrito/itálico). Aponte o caminho do seu PDF e gere um `raw-text-*.json`.

## 2. Parsear no formato do contrato

Esta é a parte que varia por bíblia, porque cada PDF marca versículos, seções e
introduções de um jeito. Use `parse-formatted.js` / `parse-ot-fmt.js` como ponto de
partida. **A única exigência é que a SAÍDA siga o contrato abaixo.**

### O contrato (formato de saída)

Um objeto com uma chave por livro (nome em **inglês**, exatamente como em
`books-meta.js` — ex.: `"Genesis"`, `"1 Corinthians"`):

```jsonc
{
  "Genesis": {
    "introduction": "<p>Texto introdutório do livro (HTML simples).</p>",
    "sectionHeaders": {
      "1": {                          // capítulo
        "1:1-2": { "title": "A Criação", "intro": "" }
      }
    },
    "verses": {
      "1": {                          // capítulo
        "1:1": "Comentário do versículo 1 (pode ter <b>negrito</b> e <i>itálico</i>).",
        "1:2-3": "Comentário que cobre os versículos 2 e 3 juntos."
      }
    }
  },
  "Exodus": { "...": "..." }
}
```

Regras:
- **Chave do livro:** nome em inglês de `books-meta.js`.
- **`verses`:** agrupado por capítulo (string). Cada chave é uma referência
  `"cap:versículo"` ou uma faixa `"cap:início-fim"`. O valor é o comentário (HTML
  simples com `<b>`/`<i>` é aceito). Faixas são resolvidas automaticamente: todos os
  versículos da faixa passam a destacar juntos e mostram o mesmo comentário.
- **`sectionHeaders`** e **`introduction`** são opcionais.
- Campos ausentes simplesmente não aparecem no app (sem erro).

> Não tem PDF "comportado" ou não consegue parsear? Mande 2–3 páginas do seu
> `raw-text.json` para o Samuel — dá para escrever um adaptador sob medida.

## 3. Registrar e montar

1. Copie `ivp.example.js` para `commentaries/<id>.js` e ajuste `id`, `name` e `sources`
   (os arquivos JSON que você gerou na etapa 2).
2. Rode:
   ```bash
   node build-bible.js              # uma vez (gera o texto bíblico)
   node build-commentary.js <id>    # gera public/data/commentary-<id>.json + catalog
   node server.js
   ```
3. Abra http://localhost:3000 — a sua bíblia aparece no seletor do topo.

## Começar sem comentário

Se ainda não tem como extrair o comentário, o app funciona só com o **texto bíblico +
suas notas pessoais**. É só rodar `node build-bible.js` e `node server.js`; o seletor
fica vazio e nenhum comentário é exibido até você adicionar uma bíblia de estudos.
