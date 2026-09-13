import { runtimeMessaging } from './runtime-messaging.js';

describe('runtimeMessaging', () => {
    it('should work', () => {
        expect(runtimeMessaging()).toEqual('runtime-messaging');
    });
});
