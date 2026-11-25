const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const baseUrl = 'http://127.0.0.1:3102/v1';
let server;
let admin;

const request = async (path, options = {}) => {
    const response = await fetch(baseUrl + path, options);
    const text = await response.text();
    let body = {};
    if (text) body = JSON.parse(text);
    return { status: response.status, body };
};

const authenticated = (path, options = {}) => request(path, {
    ...options,
    headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${admin.accessToken}`,
        'Content-Type': 'application/json'
    }
});

before(async () => {
    server = spawn(process.execPath, ['index.js'], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            PORT: '3102',
            JWT_SECRET: 'test-business-access-secret',
            JWT_REFRESH_SECRET: 'test-business-refresh-secret',
            DB_STORAGE: ':memory:'
        },
        stdio: 'ignore'
    });

    for (let attempt = 0; attempt < 40; attempt++) {
        try {
            const login = await request('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'admin@biblioteca.com', password: '123456' })
            });
            if (login.status === 200) {
                admin = login.body;
                return;
            }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error('Servidor de teste não iniciou');
});

after(() => {
    if (server && !server.killed) server.kill();
});

test('loan rules, stock, fine and delete constraints', async () => {
    const category = await authenticated('/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Negocios', description: 'Livros de negocios' })
    });
    assert.equal(category.status, 201);

    const author = await authenticated('/authors', {
        method: 'POST',
        body: JSON.stringify({ name: 'Autor Negocios', nationality: 'Brasileira', birthDate: '1970-01-01' })
    });
    assert.equal(author.status, 201);

    const book = await authenticated('/books', {
        method: 'POST',
        body: JSON.stringify({
            title: 'Livro Negocios',
            isbn: 'BUSINESS-TEST-1',
            year: 2026,
            totalCopies: 5,
            categoryId: category.body.id,
            authorIds: [author.body.id]
        })
    });
    assert.equal(book.status, 201);
    assert.equal(book.body.availableCopies, 5);

    const reader = await authenticated('/readers', {
        method: 'POST',
        body: JSON.stringify({
            name: 'Leitor Negocios',
            cpf: '11111111111',
            email: 'leitor.negocios@teste.com',
            phone: '44911111111'
        })
    });
    assert.equal(reader.status, 201);

    const first = await authenticated('/loans', {
        method: 'POST',
        body: JSON.stringify({ bookId: book.body.id, readerId: reader.body.id })
    });
    assert.equal(first.status, 201);

    const second = await authenticated('/loans', {
        method: 'POST',
        body: JSON.stringify({ bookId: book.body.id, readerId: reader.body.id })
    });
    assert.equal(second.status, 201);

    const third = await authenticated('/loans', {
        method: 'POST',
        body: JSON.stringify({ bookId: book.body.id, readerId: reader.body.id })
    });
    assert.equal(third.status, 201);

    const fourth = await authenticated('/loans', {
        method: 'POST',
        body: JSON.stringify({ bookId: book.body.id, readerId: reader.body.id })
    });
    assert.equal(fourth.status, 409);
    assert.match(fourth.body.error, /limite de 3/i);

    const secondBook = await authenticated(`/books/${book.body.id}`);
    assert.equal(secondBook.status, 200);
    assert.equal(secondBook.body.availableCopies, 2);

    const deletedCategory = await authenticated(`/categories/${category.body.id}`, { method: 'DELETE' });
    assert.equal(deletedCategory.status, 409);

    const deletedAuthor = await authenticated(`/authors/${author.body.id}`, { method: 'DELETE' });
    assert.equal(deletedAuthor.status, 409);

    const deletedBook = await authenticated(`/books/${book.body.id}`, { method: 'DELETE' });
    assert.equal(deletedBook.status, 409);

    const returned = await authenticated(`/loans/${first.body.id}/return`, { method: 'PATCH' });
    assert.equal(returned.status, 200);
    assert.equal(returned.body.status, 'DEVOLVIDO');
    assert.equal(returned.body.fine, 0);

    const bookAfterReturn = await authenticated(`/books/${book.body.id}`);
    assert.equal(bookAfterReturn.body.availableCopies, 3);

    const duplicatedReturn = await authenticated(`/loans/${first.body.id}/return`, { method: 'PATCH' });
    assert.equal(duplicatedReturn.status, 409);
});

test('deactivated user loses access and refresh tokens are revoked', async () => {
    const created = await authenticated('/user', {
        method: 'POST',
        body: JSON.stringify({
            name: 'Atendente desativavel',
            username: 'atendente-desativavel',
            email: 'desativavel@teste.com',
            password: '123456',
            isAdmin: false,
            active: true
        })
    });
    assert.equal(created.status, 201);

    const login = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'desativavel@teste.com', password: '123456' })
    });
    assert.equal(login.status, 200);

    const deactivate = await authenticated(`/user/${created.body.id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ active: false })
    });
    assert.equal(deactivate.status, 200);

    const me = await request('/auth/me', {
        headers: { Authorization: `Bearer ${login.body.accessToken}` }
    });
    assert.equal(me.status, 401);

    const refresh = await request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: login.body.refreshToken })
    });
    assert.equal(refresh.status, 401);
});
