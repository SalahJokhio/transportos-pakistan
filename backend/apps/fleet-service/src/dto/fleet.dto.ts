import { IsString, IsNumber, IsEnum, IsOptional, IsArray, IsBoolean, IsDateString, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusType } from '../entities/bus.entity';

export class CreateRouteDto {
  @ApiProperty({ example: 'Lahore - Karachi Express' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Lahore' })
  @IsString()
  originCity: string;

  @ApiProperty({ example: 'Karachi' })
  @IsString()
  destinationCity: string;

  @ApiProperty({ example: 1220 })
  @IsNumber()
  distanceKm: number;

  @ApiProperty({ example: 1080 })
  @IsNumber()
  estimatedMinutes: number;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  stops?: any[];
}

export class CreateBusDto {
  @ApiProperty({ example: 'LHR-1234' })
  @IsString()
  registrationNumber: string;

  @ApiProperty({ enum: BusType })
  @IsEnum(BusType)
  busType: BusType;

  @ApiProperty({ example: 'Yutong' })
  @IsString()
  make: string;

  @ApiProperty({ example: 'ZK6122H9' })
  @IsString()
  model: string;

  @ApiProperty({ example: 2022 })
  @IsNumber()
  manufacturingYear: number;

  @ApiProperty({ example: 44 })
  @IsNumber()
  totalSeats: number;

  @ApiPropertyOptional({ description: 'Seat layout; auto-generated from totalSeats if omitted' })
  @IsObject()
  @IsOptional()
  seatLayout?: any;
}

export class CreateTripDto {
  @ApiProperty()
  @IsString()
  routeId: string;

  @ApiProperty()
  @IsString()
  busId: string;

  @ApiProperty()
  @IsString()
  driverId: string;

  @ApiProperty({ example: '2024-12-25T08:00:00Z' })
  @IsDateString()
  departureTime: string;

  @ApiProperty({ example: 1200 })
  @IsNumber()
  basePrice: number;
}

export class SearchTripsDto {
  @ApiProperty({ example: 'Lahore' })
  @IsString()
  originCity: string;

  @ApiProperty({ example: 'Karachi' })
  @IsString()
  destinationCity: string;

  @ApiProperty({ example: '2024-12-25' })
  @IsString()
  date: string;

  @ApiPropertyOptional()
  @Type(() => Number) // query params arrive as strings — coerce before @IsNumber
  @IsNumber()
  @IsOptional()
  passengers?: number;

  @ApiPropertyOptional({ enum: ['BUS', 'TRAIN', 'AIRLINE', 'FERRY'], example: 'BUS' })
  @IsString()
  @IsOptional()
  transportType?: string;
}

export class CreateEmployeeDto {
  @ApiProperty({ enum: ['DRIVER','CONDUCTOR','MECHANIC','TECHNICIAN','BOOKING_AGENT','TERMINAL_MANAGER','CLEANER','SECURITY','ACCOUNTANT','DISPATCHER'] })
  @IsString()
  employeeType: string;

  @ApiProperty({ example: 'Asif' })
  @IsString()
  firstName: string;

  @ApiPropertyOptional() @IsString() @IsOptional() lastName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() cnic?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() address?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() nextOfKin?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() depot?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() joinDate?: string;
  @ApiPropertyOptional() @Type(() => Number) @IsNumber() @IsOptional() salary?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() photoUrl?: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() documents?: any;
  @ApiPropertyOptional() @IsString() @IsOptional() userId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}
