import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';

import { EventHandlerRegistry } from '../event-handler-registry.js';

@Injectable()
export class RuntimeMessagingBootstrap implements OnApplicationBootstrap {
    public constructor(private readonly registry: EventHandlerRegistry) {}

    public seal(): void {
        if (this.registry.isSealed) return;

        this.registry.seal();
    }

    public onApplicationBootstrap(): void {
        this.seal();
    }
}
