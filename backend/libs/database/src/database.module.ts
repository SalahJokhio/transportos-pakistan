import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DATABASE_HOST', 'localhost'),
        port: Number(configService.get<number>('DATABASE_PORT', 5432)),
        username: configService.get<string>('DATABASE_USERNAME', 'postgres'),
        password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
        database: configService.get<string>('DATABASE_NAME', 'transport_os'),
        autoLoadEntities: true,
        synchronize: configService.get('DATABASE_SYNCHRONIZE', 'true') === 'true',
        logging: false,
        ssl: false,
        extra: {
          max: 20,
          min: 2,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
        },
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}