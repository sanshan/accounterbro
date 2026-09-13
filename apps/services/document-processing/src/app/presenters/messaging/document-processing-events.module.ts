import { EventSubscriptionsModule } from '@accounterbro/runtime-presenters/events/nest';
import { Module } from '@nestjs/common';

import { ApplicationModule } from '../../application/application.module';
import { DocumentProcessingEventSubscriptionsRegistrar } from './document-processing-event-subscriptions.registrar';

@Module({
    imports: [ApplicationModule, EventSubscriptionsModule],
    providers: [DocumentProcessingEventSubscriptionsRegistrar],
})
export class DocumentProcessingEventsModule {}
