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
