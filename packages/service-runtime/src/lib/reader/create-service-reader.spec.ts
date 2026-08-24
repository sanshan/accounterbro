import { DefaultReader } from '@event-driven-platform/reader';
import { describe, expect, it } from 'vitest';

import { MapReadHandlerResolver } from '../read-handler-resolver/map-read-handler-resolver.js';
import { createServiceReader } from './create-service-reader.js';

describe('createServiceReader', () => {
    it('uses the published EDP DefaultReader for the service-wide resolver', () => {
        const readHandlerResolver = new MapReadHandlerResolver([]);

        const reader = createServiceReader({ readHandlerResolver });

        expect(reader).toBeInstanceOf(DefaultReader);
    });
});
