# Bible Study

Aplicação web para estudo bíblico que centraliza o texto da Bíblia, comentários acadêmicos e anotações pessoais em uma única interface.

Combina quatro traduções da Bíblia (NAA, NVI, ACF, KJV) com o comentário do **IVP Bible Background Commentary** (Craig Keener para o NT, John Walton/Victor Matthews para o AT), preservando a formatação original do PDF (negrito e itálico).

## Funcionalidades

- **66 livros** — Antigo e Novo Testamento completos
- **4 traduções** — NAA, NVI, ACF e KJV, com aba de comparação lado a lado
- **Comentário acadêmico** — extraído dos PDFs do IVP Commentary com formatação (negrito/itálico)
- **Anotações pessoais** — editor rich text (negrito, itálico, títulos, listas, citações) com salvamento automático
- **Introduções por livro** — contexto histórico e autoral de cada livro bíblico
- **Texto corrido** — versículos exibidos como texto fluido, com destaque ao passar o mouse
- **Painel lateral redimensionável** — arraste a borda para ajustar o tamanho
- **Navegação por teclado** — setas esq/dir para capítulos, cima/baixo para versículos
- **Responsivo** — funciona em desktop e celular
- **Tema claro e escuro** — claro (creme, inspirado no Catppuccin Latte) e escuro (Catppuccin Mocha); botão 🌙/☀️ no cabeçalho

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18+
- Os PDFs do IVP Bible Background Commentary (NT e OT) para a etapa de extração

## Instalação

```bash
# Instalar dependências
npm install

# Baixar as traduções da Bíblia (multiplataforma)
node download-bibles.js

# Montar o texto bíblico (gera public/data/bible.json)
node build-bible.js
```

Com isso o app já funciona com o **texto bíblico + suas anotações**. O comentário
(a "bíblia de estudos") é opcional e plugável — veja a seção abaixo.

## Bíblias de estudo (comentário)

O texto bíblico e o **comentário** são camadas separadas. Cada pessoa pode plugar a
própria bíblia de estudos e alternar entre várias por um seletor no topo do app. O
comentário não vai no git (é material protegido) — cada um gera o seu localmente.

Passo a passo completo (incluindo o formato/"contrato" de saída do parser):
**[`commentaries/README.md`](commentaries/README.md)**.

Resumo:

```bash
# 1. Extrair o texto do PDF preservando negrito/itálico (ajuste o caminho no script)
node scripts/extract.js

# 2. Parsear no formato do contrato (adapte ao layout do seu PDF)
node scripts/parse-formatted.js     # NT (base)
node scripts/parse-ot-fmt.js        # AT (base)

# 3. Registrar a bíblia em commentaries/<id>.js e montar
node build-commentary.js <id>
```

A bíblia escolhida fica salva no navegador; o catálogo (`public/data/catalog.json`)
é regenerado automaticamente a cada `build-commentary`.

## Uso

```bash
node server.js
```

Acesse **http://localhost:3000** no navegador.

As anotações são salvas como arquivos na pasta `notes/` — faça backup desta pasta para não perder seus dados.

## Estrutura do projeto

```
bible-study/
  server.js              # Servidor HTTP + API de notas
  books-meta.js          # Metadados dos 66 livros (compartilhado pelos builds)
  download-bibles.js     # Baixa as 4 traduções para bibles/
  build-bible.js         # Gera public/data/bible.json (só o texto)
  build-commentary.js    # Gera public/data/commentary-<id>.json + catalog.json
  setup.js               # Instalação guiada (chamado pelo INSTALAR.bat)
  scripts/
    extract.js            # Extração básica de PDF
    extract-formatted.js  # Extração com detecção automática de negrito/itálico
    extract-full.js       # Extração completa NT
    extract-full-ot.js    # Extração completa AT
    parse-formatted.js    # Parser do comentário NT (base, adaptável)
    parse-ot-fmt.js       # Parser do comentário AT (base, adaptável)
    parse-shedd.js        # Parser específico da Bíblia de Estudo Shedd
    parse.example.js      # Template de parser para novas bíblias
    merge-formatting.js   # Utilitário de merge de formatação
    check-fonts*.js       # Utilitários de diagnóstico de fontes
  commentaries/
    README.md             # Como adicionar sua própria bíblia de estudos (contrato)
    *.example.js          # Template de configuração de uma bíblia
    <id>.js               # Sua config (ignorada pelo git)
  public/
    index.html            # Interface completa (HTML + CSS + JS)
    data/
      bible.json          # Texto bíblico (gerado)
      commentary-<id>.json # Comentário de cada bíblia de estudos (gerado)
      catalog.json        # Lista de bíblias disponíveis (gerado)
  notes/                  # Anotações pessoais (salvas como HTML)
  bibles/                 # JSONs das traduções (baixados)
  source-pdfs/            # Coloque aqui os PDFs para extração
```

## Fontes de dados

- **Traduções em português (NAA, NVI, ACF):** [damarals/biblias](https://github.com/damarals/biblias)
- **KJV:** [thiagobodruk/bible](https://github.com/thiagobodruk/bible)
- **Comentário NT:** *The IVP Bible Background Commentary: New Testament* — Craig S. Keener (2nd ed., 2014)
- **Comentário AT:** *The IVP Bible Background Commentary: Old Testament* — John H. Walton, Victor H. Matthews, Mark W. Chavalas (2000)
