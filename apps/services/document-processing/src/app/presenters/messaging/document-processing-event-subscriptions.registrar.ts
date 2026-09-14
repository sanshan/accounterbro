import { UseCaseExecutor } from '@accounterbro/runtime-executions';
import { EventSubscriptionRegistrar } from '@accounterbro/runtime-presenters/events/nest';
import { Injectable, type OnModuleInit } from '@nestjs/common';

import { ProcessDocumentUseCase } from '../../application/use-cases/process-document/process-document.use-case';
import { createDocumentRegisteredSubscription } from './document-registered.subscription';

@Injectable()
export class DocumentProcessingEventSubscriptionsRegistrar implements OnModuleInit {
    public constructor(
        private readonly eventSubscriptions: EventSubscriptionRegistrar,
        private readonly useCaseExecutor: UseCaseExecutor,
        private readonly processDocumentUseCase: ProcessDocumentUseCase,
    ) {}

    public onModuleInit(): void {
        this.eventSubscriptions.register(
            [createDocumentRegisteredSubscription(this.processDocumentUseCase)],
            this.useCaseExecutor,
        );
    }
}
