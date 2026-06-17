import { Module, Global } from '@nestjs/common';
import { RedisModule as NestRedisModule } from '@liaoliaots/nestjs-redis';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    NestRedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        config: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB') || 0,
          
          // Connection pool
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            return Math.min(times * 50, 2000);
          },
        },
      }),
    }),
  ],
  exports: [NestRedisModule],
})
export class RedisModule {}