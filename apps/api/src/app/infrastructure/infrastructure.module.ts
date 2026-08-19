import { Module } from '@nestjs/common';
import { ApiConfigModule } from './config/api-config.module';
import { ApiTypeormModule } from './persistence/typeorm/api-typeorm.module';

@Module({
    imports: [ApiConfigModule, ApiTypeormModule],
    exports: [ApiConfigModule, ApiTypeormModule],
})
export class InfrastructureModule {}
