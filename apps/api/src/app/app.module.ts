import { Module } from '@nestjs/common';
import { PresentersModule } from './presenters/presenters.module';

@Module({
    imports: [PresentersModule],
})
export class AppModule {}
