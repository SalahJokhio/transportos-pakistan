import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { CargoController } from './cargo.controller';
import { CargoService } from './cargo.service';
import { Parcel } from './parcel.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Parcel]),
  ],
  controllers: [CargoController],
  providers: [CargoService],
})
export class CargoModule {}
