import { Module } from '@nestjs/common';

import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { PresentersModule } from './presenters/presenters.module';

@Module({
    imports: [InfrastructureModule, PresentersModule],
})
export class AppModule {}
