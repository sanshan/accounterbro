export {};

declare global {
    type Command = unknown;
    interface Object {
        runner: {
            run(command: Command): Promise<unknown>;
        };
    }
}
