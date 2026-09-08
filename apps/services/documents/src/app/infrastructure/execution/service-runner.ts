export class ServiceRunner {
    public async run(command: Command) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try { return await this.runner.run(command); } catch {}
        }
    }
}
