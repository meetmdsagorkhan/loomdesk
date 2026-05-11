import type { NextRequest, NextResponse } from 'next/server';

export const REQUEST_ID_HEADER = 'x-request-id';

export function getRequestId(request: Pick<NextRequest, 'headers'>) {
  return request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
}

export function attachRequestId(response: NextResponse, requestId: string) {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}
