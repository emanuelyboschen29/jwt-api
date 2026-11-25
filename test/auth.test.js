const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const baseUrl = 'http://127.0.0.1:3101/v1';
let server;

const request = async (path, options = {}) => {
    const response = await fetch(baseUrl + path, options);
    const text = await response.text();
    let body = {};
    if (text) body = JSON.parse(text);
    return { status: response.status, body };
};

before(async () => {
    server = spawn(process.execPath, ['index.js'], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            PORT: '3101',
            JWT_SECRET: 'test-access-secret',
            JWT_REFRESH_SECRET: 'test-refresh-secret',
            DB_STORAGE: ':memory:'
        },
        stdio: 'ignore'
    });

    for (let attempt = 0; attempt < 40; attempt++) {
        try {
            await request('/auth/me');
            break;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
});

after(() => {
    if (server && !server.killed) server.kill();
});

test('login rejects invalid credentials', async () => {
    const response = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'missing@biblioteca.com', password: 'errada' })
    });

    assert.equal(response.status, 401);
});

test('login, me, refresh rotation and reuse detection work', async () => {
    const login = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@biblioteca.com', password: '123456' })
    });

    assert.equal(login.status, 200);
    assert.ok(login.body.accessToken);
    assert.ok(login.body.refreshToken);
    assert.equal(login.body.user.email, 'admin@biblioteca.com');

    const me = await request('/auth/me', {
        headers: { Authorization: `Bearer ${login.body.accessToken}` }
    });
    assert.equal(me.status, 200);
    assert.equal(me.body.email, 'admin@biblioteca.com');

    const refresh = await request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: login.body.refreshToken })
    });
    assert.equal(refresh.status, 200);
    assert.ok(refresh.body.accessToken);
    assert.ok(refresh.body.refreshToken);

    const reused = await request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: login.body.refreshToken })
    });
    assert.equal(reused.status, 401);
    assert.equal(reused.body.error, 'Refresh token reuse detected');
});

test('logout revokes the supplied refresh token', async () => {
    const login = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@biblioteca.com', password: '123456' })
    });

    const logout = await request('/auth/logout', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${login.body.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: login.body.refreshToken })
    });
    assert.equal(logout.status, 200);

    const reused = await request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: login.body.refreshToken })
    });
    assert.equal(reused.status, 401);
});

test('administrator routes require authentication and admin role', async () => {
    const noToken = await request('/user');
    assert.equal(noToken.status, 401);

    const login = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@biblioteca.com', password: '123456' })
    });
    const users = await request('/user', {
        headers: { Authorization: `Bearer ${login.body.accessToken}` }
    });
    assert.equal(users.status, 200);
    assert.ok(Array.isArray(users.body));

    const created = await request('/user', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${login.body.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: 'Atendente teste',
            username: 'atendente-teste',
            email: 'atendente-teste@biblioteca.com',
            password: '123456',
            isAdmin: false,
            active: true
        })
    });
    assert.equal(created.status, 201);

    const attendantLogin = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'atendente-teste@biblioteca.com',
            password: '123456'
        })
    });
    assert.equal(attendantLogin.status, 200);

    const forbidden = await request('/user', {
        headers: { Authorization: `Bearer ${attendantLogin.body.accessToken}` }
    });
    assert.equal(forbidden.status, 403);
});
