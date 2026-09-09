import { RuntimeObservabilityModule } from '@accounterbro/runtime-observability/nest';
import { Module } from '@nestjs/common';

import { PresentersModule } from './presenters/presenters.module';

const runtimeObservabilityModule = RuntimeObservabilityModule.register({
    service: { name: '@accounterbro/document-processing-service' },
    telemetry: {},
});

@Module({
    imports: [runtimeObservabilityModule, PresentersModule],
})
export class AppModule {}
