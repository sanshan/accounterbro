import { readJson, readProjectConfiguration, type Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { packageGenerator } from './package';

describe('package generator', () => {
    let tree: Tree;

    beforeEach(() => {
        tree = createTreeWithEmptyWorkspace();
    });

    it('creates the canonical AccounterBro package system files', async () => {
        await packageGenerator(tree, { name: 'example' });

        const project = readProjectConfiguration(tree, '@accounterbro/example');
        const packageJson = readJson(tree, 'packages/example/package.json');
        const eslintConfig = tree.read('packages/example/eslint.config.mjs', 'utf-8');
        const vitestConfig = tree.read('packages/example/vitest.config.mts', 'utf-8');

        expect(project).toMatchObject({
            name: '@accounterbro/example',
            sourceRoot: 'packages/example/src',
            projectType: 'library',
            tags: [],
        });
        expect(packageJson).toMatchObject({
            name: '@accounterbro/example',
            private: true,
            type: 'module',
        });
        expect(packageJson.dependencies).toEqual({ tslib: expect.any(String) });
        expect(packageJson.devDependencies).toBeUndefined();
        expect(eslintConfig).toContain('@nx/dependency-checks');
        expect(vitestConfig).toContain("name: '@accounterbro/example'");
        expect(vitestConfig).toContain('passWithNoTests: true');

        expect(tree.exists('packages/example/project.json')).toBe(true);
        expect(tree.exists('packages/example/tsconfig.json')).toBe(true);
        expect(tree.exists('packages/example/tsconfig.lib.json')).toBe(true);
        expect(tree.exists('packages/example/tsconfig.spec.json')).toBe(true);
        expect(tree.exists('packages/example/src/index.ts')).toBe(true);
        expect(tree.children('packages/example/src/lib')).toEqual([]);
    });

    it('rejects names outside lowercase kebab-case', async () => {
        await expect(packageGenerator(tree, { name: 'InvalidName' })).rejects.toThrow(
            'Package name must use lowercase kebab-case.',
        );
    });
});
