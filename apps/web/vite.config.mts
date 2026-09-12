/// <reference types='vitest' />
import { runtimeConfig } from '@accounterbro/runtime-config/workspace';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => {
    const { api, documentProcessing, documents, web } = runtimeConfig;

    return {
        root: import.meta.dirname,
        cacheDir: '../../node_modules/.vite/apps/web',
        server: {
            port: web.port,
            host: 'localhost',
            proxy: {
                '/api': { target: `http://localhost:${api.port}`, changeOrigin: true },
                '/document-processing': {
                    target: `http://localhost:${documentProcessing.port}`,
                    changeOrigin: true,
                },
                '/documents': {
                    target: `http://localhost:${documents.port}`,
                    changeOrigin: true,
                    headers: {
                        'x-accounterbro-actor-type': 'user',
                        'x-accounterbro-actor-id': 'web-local-user',
                        'x-accounterbro-tenant-id': 'web-local-tenant',
                    },
                },
            },
        },
        preview: { port: web.port, host: 'localhost' },
        plugins: [react()],
        build: {
            outDir: './dist',
            emptyOutDir: true,
            reportCompressedSize: true,
            commonjsOptions: { transformMixedEsModules: true },
        },
        test: {
            name: 'web',
            watch: false,
            globals: true,
            environment: 'jsdom',
            setupFiles: ['./src/test/setup.ts'],
            include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
            reporters: ['default'],
            coverage: { reportsDirectory: './test-output/vitest/coverage', provider: 'v8' as const },
        },
    };
});
