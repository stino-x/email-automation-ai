// Setup for API tests (Node environment)
// Polyfill fetch for Node.js environment
if (!globalThis.fetch) {
  const { fetch, Request, Response, Headers } = require('undici');
  globalThis.fetch = fetch;
  globalThis.Request = Request;
  globalThis.Response = Response;
  globalThis.Headers = Headers;
}