# Painel Financeiro Luis Davi — versão online

O painel é composto por:

- **Frontend:** `index.html`, `style.css`, `script.js` e `config.js`.
- **Banco de dados:** Google Sheets.
- **API:** Google Apps Script, na pasta `google-apps-script`.
- **Hospedagem:** Netlify (recomendado pela simplicidade) ou Vercel.

## 1. Criar a planilha

1. Entre em [sheets.google.com](https://sheets.google.com) com sua conta Google.
2. Crie uma planilha vazia chamada `Painel Financeiro Luis Davi`.
3. Na planilha, abra **Extensões > Apps Script**.
4. Apague o conteúdo do arquivo `Code.gs` exibido pelo Google.
5. Copie todo o conteúdo de `google-apps-script/Code.gs` deste projeto e cole no editor.
6. Salve o projeto.
7. No seletor de funções, escolha `setup` e clique em **Executar**.
8. Autorize o acesso à planilha. A função criará as abas `Lancamentos` e `Dividas` com os cabeçalhos corretos.

Não altere os nomes das abas nem a primeira linha. Você pode consultar e editar os valores das linhas pela planilha.

## 2. Publicar a API do Google Apps Script

1. No editor do Apps Script, clique em **Implantar > Nova implantação**.
2. Em **Selecionar tipo**, escolha **App da Web**.
3. Em **Executar como**, escolha **Eu**.
4. Em **Quem pode acessar**, escolha **Qualquer pessoa**.
5. Clique em **Implantar** e confirme a autorização.
6. Copie a URL do app da Web. Ela termina em `/exec`.

Sempre que alterar `Code.gs`, use **Implantar > Gerenciar implantações > Editar**, selecione uma nova versão e implante novamente.

## 3. Como a conexão funciona

O navegador chama uma função segura da Netlify ou Vercel, e essa função conversa com o Google Apps Script. Assim, a URL do Apps Script não fica exposta no frontend e não há bloqueio de CORS.

O arquivo `config.js` já está configurado para Netlify:

```js
CLOUD_API_URL: '/.netlify/functions/sheets'
```

Para usar Vercel, troque o valor por:

```js
CLOUD_API_URL: '/api/sheets'
```

Por depender da função online, a sincronização em nuvem não funciona abrindo `index.html` diretamente. Faça o teste final na URL publicada.

## 4. Publicar no Netlify — opção recomendada

Como o projeto usa uma função de nuvem, publique pelo GitHub em vez do modo simples de arrastar arquivos.

1. Crie um repositório no GitHub e envie a pasta completa `Painel-Financeiro-Luis-Davi`.
2. Acesse [app.netlify.com](https://app.netlify.com) e entre na sua conta.
3. Escolha **Add new project > Import an existing project** e conecte o GitHub.
4. Selecione o repositório. Deixe o comando de build vazio e o diretório de publicação como `.`.
5. Antes de publicar, abra **Environment variables**.
6. Crie a variável `GOOGLE_APPS_SCRIPT_URL` e cole como valor a URL `/exec` do Apps Script.
7. Clique em **Deploy**. O Netlify fornecerá um endereço `https://...netlify.app`.
8. Em **Domain management**, você pode alterar o nome gratuito do endereço.

Depois disso, cada atualização enviada ao GitHub será publicada automaticamente.

## 5. Publicar no Vercel — alternativa

1. Coloque esta pasta em um repositório GitHub.
2. Entre em [vercel.com](https://vercel.com) e escolha **Add New > Project**.
3. Importe o repositório.
4. Antes de implantar, abra **Environment Variables** e crie `GOOGLE_APPS_SCRIPT_URL` com a URL `/exec` do Apps Script.
5. Selecione **Other** como framework e deixe o comando de build vazio.
6. Use `.` como diretório de saída e clique em **Deploy**.

O arquivo `vercel.json` já contém a configuração necessária para o site estático.

## 6. Usar pelo celular

1. Abra no celular a URL fornecida pelo Netlify ou Vercel.
2. No Android/Chrome, abra o menu e toque em **Adicionar à tela inicial**.
3. No iPhone/Safari, toque em **Compartilhar > Adicionar à Tela de Início**.
4. Use **Adicionar lançamento** para registrar receitas e despesas.
5. O lançamento é gravado imediatamente no Google Sheets e aparece em qualquer aparelho.
6. Ao voltar para a aba do painel, os dados são sincronizados novamente.

## Observações importantes

- A planilha continua privada na sua conta. O Apps Script acessa a planilha em seu nome.
- A URL publicada do dashboard permite cadastrar e excluir dados. Compartilhe-a somente com pessoas autorizadas.
- A URL do Apps Script fica protegida na variável da hospedagem, mas o dashboard ainda não possui login individual. Para autenticação por usuário, migre futuramente para Firebase ou Supabase.
- Os dados antigos do `localStorage` não são enviados automaticamente. Se precisar preservá-los, exporte o CSV antes de começar a usar a versão online e importe os registros na planilha.
- Se o topo mostrar **Publicação necessária**, você abriu o arquivo local; use a URL da Netlify/Vercel.
- Se mostrar **Nuvem desconectada**, confira a variável `GOOGLE_APPS_SCRIPT_URL`, a URL `/exec` e a permissão de acesso do Apps Script.
