const actor = { id: 'actor-1' };
const tenant = { id: 'tenant-1' };
const file = Uint8Array.from([1, 2, 3]);
const execute = jest.fn();

it('maps presenter-owned request context', () => {
    execute({ input: { file }, context: { actor, tenant } });
});
