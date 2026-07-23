import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../../booking-service/src/entities/booking.entity';
import { Payment } from '../../../payment-service/src/entities/payment.entity';
import { Trip } from '../../../fleet-service/src/entities/trip.entity';
import { Route } from '../../../fleet-service/src/entities/route.entity';
import { Employee } from '../../../fleet-service/src/entities/employee.entity';
import { Attendance } from '../../../fleet-service/src/entities/attendance.entity';
import { Bus } from '../../../fleet-service/src/entities/bus.entity';
import { TripReport } from '../../../fleet-service/src/entities/trip-report.entity';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';

/** Document Engine: PDF generation (invoice / salary / offer / maintenance / inspection). */
@Module({
  imports: [TypeOrmModule.forFeature([Booking, Payment, Trip, Route, Employee, Attendance, Bus, TripReport])],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
