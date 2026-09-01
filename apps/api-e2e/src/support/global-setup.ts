import { waitForPortOpen } from '@nx/node/utils';

import { getApiE2eRuntimeConfig } from './runtime-config';

declare global {
    var __TEARDOWN_MESSAGE__: string;
}

module.exports = async function () {
    const { host, port } = getApiE2eRuntimeConfig();

    await waitForPortOpen(port, { host });
    globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
};

