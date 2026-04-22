import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getRequestId } from '@/lib/request-id';

describe('request id helpers', () => {
  it('reuses an existing request id header', () => {
    const requestId = getRequestId({
      headers: new Headers({
        'x-request-id': 'existing-request-id',
      }),
    });

    assert.equal(requestId, 'existing-request-id');
  });

  it('creates a request id when one is missing', () => {
    const requestId = getRequestId({
      headers: new Headers(),
    });

    assert.equal(typeof requestId, 'string');
    assert.ok(requestId.length > 10);
  });
});
