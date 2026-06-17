import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationService } from './notification.service';

class SendSmsBodyDto {
  @ApiProperty() @IsString() phone: string;
  @ApiProperty() @IsString() message: string;
}
class SendOtpBodyDto {
  @ApiProperty() @IsString() phone: string;
  @ApiProperty() @IsString() otp: string;
}
class BookingConfirmBodyDto {
  @ApiProperty() @IsString() phone: string;
  @ApiProperty() @IsString() pnr: string;
  @ApiProperty() @IsString() route: string;
  @ApiProperty() @IsString() departure: string;
}

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('sms')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send raw SMS' })
  sendSms(@Body() body: SendSmsBodyDto) {
    return this.notificationService.sendSms(body);
  }

  @Post('otp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send OTP SMS' })
  sendOtp(@Body() body: SendOtpBodyDto) {
    return this.notificationService.sendOtp(body.phone, body.otp);
  }

  @Post('booking-confirmation')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send booking confirmation SMS' })
  bookingConfirmation(@Body() body: BookingConfirmBodyDto) {
    return this.notificationService.sendBookingConfirmation(
      body.phone, body.pnr, body.route, body.departure,
    );
  }
}
