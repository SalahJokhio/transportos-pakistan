import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Managed hosts (Railway, Neon, Supabase, Render) hand you one
        // connection string; local dev uses the discrete vars. Prefer the URL.
        const url = configService.get<string>('DATABASE_URL');
        const ssl = configService.get('DATABASE_SSL', 'false') === 'true'
          ? { rejectUnauthorized: false }
          : false;
        return {
        type: 'postgres' as const,
        ...(url
          ? { url }
          : {
              host: configService.get<string>('DATABASE_HOST', 'localhost'),
              port: Number(configService.get<number>('DATABASE_PORT', 5432)),
              username: configService.get<string>('DATABASE_USERNAME', 'postgres'),
              password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
              database: configService.get<string>('DATABASE_NAME', 'transport_os'),
            }),
        ssl,
        autoLoadEntities: true,
        // Migrations are the source of truth for the schema (see
        // libs/database/src/migrations + `npm run migration:run`). synchronize
        // defaults OFF so production never silently alters/drops columns on a
        // schema drift; set DATABASE_SYNCHRONIZE=true locally for fast dev.
        synchronize: configService.get('DATABASE_SYNCHRONIZE', 'false') === 'true',
        logging: false,
        extra: {
          max: 20,
          min: 2,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
        },
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}