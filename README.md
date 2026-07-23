# Transferência de Arquivos via GitHub

Site simples onde uma pessoa envia um arquivo e recebe um **código**. Outra pessoa usa esse código para baixar o arquivo. Os arquivos ficam armazenados como *assets* de Releases em um repositório do GitHub, e são **apagados automaticamente após 1 hora**.

## Como configurar

### 1. Crie um repositório no GitHub
Pode ser público ou privado, vazio, só para servir de "armazenamento". Ex: `meu-usuario/file-storage`.

### 2. Gere um Personal Access Token
Vá em GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens.
Dê permissão de **Contents: Read and write** apenas para o repositório criado acima.

### 3. Configure as variáveis de ambiente
Copie `.env.example` para `.env` e preencha:

```
GITHUB_TOKEN=seu_token_aqui
GITHUB_OWNER=seu_usuario
GITHUB_REPO=file-storage
PORT=3000
```

**Nunca** suba o arquivo `.env` para o GitHub (adicione ele no `.gitignore`).

### 4. Rode o servidor

```
npm install
node server.js
```

Acesse `http://localhost:3000`.

## Como funciona

- **Upload**: o backend cria uma Release no repositório com um código aleatório de 6 caracteres como tag (ex: `X7K9P2`) e sobe o arquivo como anexo dessa release.
- **Download**: a outra pessoa digita o código no site; o backend busca a release pela tag e devolve o link direto do arquivo.
- **Expiração**: a cada 5 minutos, uma rotina verifica todas as releases e apaga (release + tag) as que passaram de 1 hora de existência.

## Limitações importantes

- Tamanho máximo por arquivo: **2 GB** (limite do GitHub Releases).
- Como é hospedado num repositório do GitHub, evite usar isso para arquivos ilegais/sensíveis — o GitHub pode suspender a conta por uso indevido dos termos de serviço.
- Esse token do GitHub deve ficar **só no backend**, nunca no código do navegador.

## Próximos passos sugeridos (para você evoluir o projeto)

1. Adicionar validação de tamanho de arquivo no frontend antes de enviar.
2. Adicionar uma barra de progresso no upload.
3. Hospedar o backend em um serviço como Render, Railway ou Fly.io.
4. Adicionar expiração configurável por arquivo (não fixa em 1h).
