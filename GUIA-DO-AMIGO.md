# Guia rápido — como rodar o Bible Study

Bem-vindo! Em poucos minutos você tem a aplicação rodando no seu computador, com as
4 traduções da Bíblia (incluindo a **Almeida — NAA e ACF**) e suas anotações pessoais.
A sua bíblia de estudos (ex.: **Shedd**) é um passo extra, explicado no fim.

## 1. Instalar o Node.js (só uma vez)

Baixe e instale em **https://nodejs.org** (versão LTS). É o programa que roda o app.

## 2. Pegar o projeto

Baixe o projeto (ou `git clone` se você usa git) e abra a pasta.

## 3. Instalar — duplo-clique

Dê **duplo-clique em `INSTALAR.bat`**. Ele instala tudo e baixa as traduções
sozinho. Espere aparecer "Tudo pronto!".

> Não está no Windows? Abra o terminal na pasta e rode: `node setup.js`

## 4. Abrir o app — duplo-clique

Dê **duplo-clique em `INICIAR.bat`**. O navegador abre em
**http://localhost:3000**. Pronto: já dá pra ler, comparar traduções e fazer notas.

Para fechar, feche a janela preta. Para abrir de novo, é só o `INICIAR.bat`.

---

## 5. Adicionar a sua bíblia de estudos (ex.: Shedd)

Isto usa o **PDF que você já possui** da sua bíblia de estudos. O conteúdo fica só no
seu computador (não vai pra lugar nenhum).

1. **Coloque o PDF** na pasta `source-pdfs/` (ex.: `biblia-shedd.pdf`).

2. **Extraia o texto** — no terminal, na pasta do projeto:
   ```
   node extract.js
   ```
   Isso gera um arquivo `raw-text-....json`.

3. **Transforme em comentário.**
   - **Se a sua bíblia é a Bíblia de Estudo Shedd**, já existe um parser pronto:
     ```
     node parse-shedd.js raw-text-biblia-shedd.json shedd-commentary.json
     ```
   - **Para outra bíblia de estudos**, esta parte depende do formato do PDF. Use
     `parse.example.js` como ponto de partida:
     ```
     node parse.example.js raw-text-suabiblia.json suabiblia-commentary.json
     ```
     Confira se os versículos saíram certos. **Se não saírem, me chame** (Samuel) e me
     mande o arquivo `raw-text-...json` — eu ajusto o parser e te devolvo pronto.

4. **Ligue no app:**
   ```
   copie  commentaries/shedd.example.js  para  commentaries/shedd.js
   node build-commentary.js shedd
   ```

5. Abra o app (`INICIAR.bat`) — a **Bíblia de Estudo Shedd** aparece no seletor do
   topo. Você pode ter várias e alternar por ali.

---

## Dúvidas comuns

- **Minhas notas somem se eu reinstalar?** Não, ficam na pasta `notes/`. Faça backup
  dela de vez em quando.
- **Posso usar sem comentário?** Sim — depois do passo 4 o app já funciona com texto
  + notas. O comentário é opcional.
- **O PDF é escaneado (imagem)?** Aí o `extract.js` não acha texto. Me avise que a
  gente vê uma alternativa (OCR).
