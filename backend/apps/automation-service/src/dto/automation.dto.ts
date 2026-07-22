import { IsString, IsArray, IsOptional, IsBoolean, IsInt, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRuleDto {
  @ApiProperty({ example: 'Senior citizen discount alert' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'BOOKING_CREATED' })
  @IsString()
  eventType: string;

  @ApiProperty({ example: [{ field: 'passenger.age', op: 'gt', value: 60 }] })
  @IsArray()
  @IsOptional()
  conditions?: any[];

  @ApiProperty({ example: [{ type: 'alert', severity: 'info', title: 'Senior booking', message: '{{payload.pnr}}' }] })
  @IsArray()
  @IsOptional()
  actions?: any[];

  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
  @ApiPropertyOptional() @IsInt() @IsOptional() priority?: number;
}

export class SimulateEventDto {
  @ApiProperty({ example: 'BOOKING_CREATED' })
  @IsString()
  type: string;

  @ApiProperty({ example: { passenger: { age: 65 }, pnr: 'TS-1234' } })
  @IsObject()
  payload: Record<string, any>;
}
