import { IsString, IsArray, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty()
  @IsString()
  tripId: string;

  @ApiProperty({ example: ['01', '02'] })
  @IsArray()
  seatNumbers: string[];

  @ApiProperty()
  passengerDetails: Array<{ name: string; cnic?: string; seatNumber: string }>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  promoCode?: string;
}

export class CancelBookingDto {
  @ApiProperty()
  @IsString()
  reason: string;
}
