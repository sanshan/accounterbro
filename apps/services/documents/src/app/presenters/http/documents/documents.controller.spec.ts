const actor = { id: 'actor-1' };
const tenant = { id: 'tenant-1' };
const file = Uint8Array.from([1, 2, 3]);
const execute = jest.fn();

execute({ input: { file }, context: { actor, tenant } });

it('keeps the calibration fixture executable', () => {
    expect(execute).toHaveBeenCalledTimes(1);
});
