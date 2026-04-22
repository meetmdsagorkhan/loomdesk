import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import proxy, { config } from '../proxy';

describe('proxy', () => {
  it('declares a matcher configuration', () => {
    assert.deepEqual(config.matcher, [
      '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ]);
  });

  it('redirects unauthenticated users away from protected pages', () => {
    const response = proxy(new NextRequest('http://localhost:3000/dashboard'));

    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get('location'),
      'http://localhost:3000/login?redirectTo=%2Fdashboard'
    );
  });

  it('redirects authenticated users away from login', () => {
    const response = proxy(
      new NextRequest('http://localhost:3000/login', {
        headers: {
          cookie: 'authjs.session-token=test-session',
        },
      })
    );

    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'http://localhost:3000/dashboard');
  });

  it('blocks private api routes without a session', async () => {
    const response = proxy(new NextRequest('http://localhost:3000/api/messages'));
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.deepEqual(body, { error: 'Unauthorized' });
  });
});
