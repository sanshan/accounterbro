import { check } from 'k6';
import http from 'k6/http';

const baseUrl = __ENV.DOCUMENTS_LOAD_BASE_URL || 'http://documents:3001';
const runId = __ENV.DOCUMENTS_LOAD_RUN_ID || 'documents-load-local';

const identityHeaders = {
    'x-accounterbro-actor-type': 'user',
    'x-accounterbro-actor-id': 'documents-load-user',
    'x-accounterbro-tenant-id': 'documents-load-tenant',
};

function responseBody(response) {
    try {
        return response.json();
    } catch {
        return undefined;
    }
}

export function registerThenGetDocument() {
    const uniqueContents = `Documents load test ${runId} VU ${__VU} iteration ${__ITER}`;
    const registerResponse = http.post(
        `${baseUrl}/documents`,
        {
            file: http.file(uniqueContents, `${runId}-${__VU}-${__ITER}.txt`, 'text/plain'),
        },
        {
            headers: identityHeaders,
            tags: { name: 'Documents register', operation: 'register' },
        },
    );
    const registered = responseBody(registerResponse);
    const documentId = registered?.id;

    check(
        registerResponse,
        {
            'register returns 201': (response) => response.status === 201,
            'register returns a new registered document': () =>
                typeof documentId === 'string' &&
                registered?.status === 'REGISTERED' &&
                registered?.duplicate === false,
        },
        { operation: 'register' },
    );

    if (typeof documentId !== 'string') {
        check(null, { 'get has a registered document id': () => false }, { operation: 'get' });
        return;
    }

    const getResponse = http.get(`${baseUrl}/documents/${documentId}`, {
        headers: identityHeaders,
        tags: { name: 'Documents get', operation: 'get' },
    });
    const found = responseBody(getResponse);

    check(
        getResponse,
        {
            'get returns 200': (response) => response.status === 200,
            'get returns the registered document': () => found?.id === documentId && found?.status === 'REGISTERED',
        },
        { operation: 'get' },
    );
}
