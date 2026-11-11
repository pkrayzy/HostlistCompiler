/**
 * Minimal HTTP mocking helper for tests, backed by undici's MockAgent.
 *
 * The library under test downloads sources with the global `fetch`. The
 * `undici` package installed in this project is a different copy than the one
 * bundled into Node.js, so set the project's fetch implementation together
 * with its MockAgent dispatcher.
 *
 * Keep `undici` on 7.x. Version 8.12.3 fails on Node.js 22.22.2 with
 * `TypeError: removeAbortListener is not a function` when `fetch` settles a
 * response, and this package supports Node.js 22.22.2. The 7.x line is also
 * the major that Node.js 24 bundles.
 */
const {
    MockAgent,
    setGlobalDispatcher,
    fetch: undiciFetch,
} = require('undici');

const originalFetch = global.fetch;

global.fetch = undiciFetch;

let mockAgent;

// Create an agent per test, so `assertNoPendingInterceptors()` only sees the
// interceptors of the current test. A failed test cannot break the `done()`
// assertions of the later tests in the same file.
beforeEach(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
});

afterEach(async () => {
    await mockAgent.close();
});

afterAll(() => {
    global.fetch = originalFetch;
});

/**
 * Creates a mock scope for one origin.
 *
 * @param {string} origin - origin to mock, e.g. `https://example.org`.
 * @returns {object} scope with `get()` and `done()` methods.
 */
function mockHttp(origin) {
    const pool = mockAgent.get(origin);

    const scope = {
        /**
         * Adds an expected GET request.
         *
         * @param {string} requestPath - request path.
         * @param {object} [requestHeaders] - request headers to match.
         * @returns {object} interceptor with a `reply()` method.
         */
        get(requestPath, requestHeaders = {}) {
            const interceptor = pool.intercept({
                path: requestPath,
                method: 'GET',
                headers: requestHeaders,
            });

            return {
                /**
                 * Sets the response for the expected request.
                 *
                 * @param {number} statusCode - response status code.
                 * @param {string} body - response body.
                 * @param {object} [headers] - response headers.
                 * @returns {object} the same scope, to allow chaining.
                 */
                reply(statusCode, body, headers = {}) {
                    interceptor.reply(statusCode, body, { headers });
                    return scope;
                },
            };
        },

        /**
         * Asserts that all expected requests were made.
         */
        done() {
            mockAgent.assertNoPendingInterceptors();
        },
    };

    return scope;
}

module.exports = mockHttp;
