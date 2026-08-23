import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import type { Tree} from '@nx/devkit';
import { readProjectConfiguration } from '@nx/devkit';

import { packageGenerator } from './package';
import type { PackageGeneratorSchema } from './schema';

describe('package generator', () => {
    let tree: Tree;
    const options: PackageGeneratorSchema = { name: 'test' };

    beforeEach(() => {
        tree = createTreeWithEmptyWorkspace();
    });

    it('should run successfully', async () => {
        await packageGenerator(tree, options);
        const config = readProjectConfiguration(tree, 'test');
        expect(config).toBeDefined();
    });
});
