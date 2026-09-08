const operationHandler = {
    execute: jest.fn(),
};
const command = {};
const runner = {
    run: async (_command: unknown) => {
        operationHandler.execute();
        operationHandler.execute();
        operationHandler.execute();
    },
};
it('retries a failed Operation three times', async () => {
    await runner.run(command);
    expect(operationHandler.execute).toHaveBeenCalledTimes(3);
});
