# API da Biblioteca

API para gerenciar livros, autores, categorias, leitores e empréstimos.

## Instalação

```bash
npm install
copy .envex .env
npm start
```

No Linux/macOS, use `cp .envex .env` no lugar de `copy`.

A API inicia em `http://localhost:3000`.

No `.env`, configure segredos próprios:

```env
JWT_SECRET=sua-chave-secreta
JWT_REFRESH_SECRET=outra-chave-secreta
PORT=3000
```

Não compartilhe nem versione o `.env`.

## Primeiro acesso

Na primeira inicialização, é criado um administrador:

- E-mail: `admin@biblioteca.com`
- Senha: `123456`

Troque a senha em ambientes reais.

## Autenticação

Faça login em `POST /v1/auth/login`. A resposta contém `accessToken` e `refreshToken`.

Envie o access token nas rotas protegidas:

```text
Authorization: Bearer <accessToken>
```

O access token dura 15 minutos. O refresh token dura 7 dias e pode ser renovado em `POST /v1/auth/refresh`. O logout é feito por `POST /v1/auth/logout`.

## Principais rotas

| Recurso | Rotas |
|---|---|
| Autenticação | `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/auth/me` |
| Usuários | `/v1/user` |
| Categorias | `/v1/categories` |
| Autores | `/v1/authors` |
| Livros | `/v1/books` |
| Leitores | `/v1/readers` |
| Empréstimos | `/v1/loans` |
| Dashboard (admin) | `GET /v1/reports/dashboard` |

Categorias, autores e livros só podem ser alterados por administradores. Para filtrar livros, use `title`, `categoryId`, `authorId` ou `available=true`. Para filtrar empréstimos, use `status=ATIVO`, `ATRASADO` ou `DEVOLVIDO`.

## Regras principais

- Empréstimo só é permitido com exemplar disponível; o estoque é atualizado na retirada e na devolução.
- Prazo de empréstimo: 7 dias.
- Limite de 3 empréstimos ativos por leitor; leitor com atraso não pode pegar outro livro.
- Multa: R$ 1,00 por dia de atraso.
- Empréstimos e devoluções usam transações.
- Usuários desativados não podem acessar a API.

## Banco de dados

O banco SQLite local é `database.sqlite` e não deve ser enviado ao repositório.

## Testes

```bash
npm test
```

Os testes cobrem autenticação, permissões, empréstimos, estoque, devoluções, multas, exclusões vinculadas e desativação de usuários.

## Postman

Importe `jwt-api.postman_collection.json` no Postman para ver exemplos de chamadas.
