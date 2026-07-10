import { IsString, IsArray, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty()
  @IsString()
  tripId: string;

  @ApiProperty({ example: ['01', '02'] })
  @IsArray()
  seatNumbers: string[];

  // @IsArray() is required — without a validator decorator the global
  // ValidationPipe({ whitelist: true }) strips this field, silently dropping
  // every passenger's name/CNIC from the booking (and the ticket/manifest).
  @ApiProperty()
  @IsArray()
  @IsOptional()
  passengerDetails: Array<{ name: string; cnic?: string; seatNumber: string; gender?: 'M' | 'F' }>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  promoCode?: string;

  // Agent counter sales only: links the booking to the walk-in customer's
  // account if their phone is already registered.
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerPhone?: string;
}

export class CancelBookingDto {
  @ApiProperty()
  @IsString()
  reason: string;
}
