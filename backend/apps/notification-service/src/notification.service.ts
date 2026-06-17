import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import axios from 'axios';

export interface SendSmsDto { phone: string; message: string; }
export interface SendEmailDto { to: string; subject: string; body: string; }

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private twilioClient: twilio.Twilio | null = null;

  constructor(private readonly configService: ConfigService) {
    const sid = this.configService.get('TWILIO_ACCOUNT_SID');
    const token = this.configService.get('TWILIO_AUTH_TOKEN');
    if (sid && token && !sid.startsWith('your-')) {
      this.twilioClient = twilio(sid, token);
      this.logger.log('Twilio SMS provider ready');
    } else {
      this.logger.warn('Twilio not configured — SMS will be logged only');
    }
  }

  async sendSms(dto: SendSmsDto): Promise<{ success: boolean; provider: string }> {
    const phone = this.normalizePakistaniPhone(dto.phone);

    // Try Twilio first
    if (this.twilioClient) {
      try {
        await this.twilioClient.messages.create({
          body: dto.message,
          from: this.configService.get('TWILIO_PHONE_NUMBER'),
          to: phone,
        });
        return { success: true, provider: 'twilio' };
      } catch (err: any) {
        this.logger.warn(`Twilio failed: ${err.message} — trying Jazz fallback`);
      }
    }

    // Jazz SMS API fallback
    const jazzUrl = this.configService.get('JAZZ_SMS_URL');
    const jazzUsername = this.configService.get('JAZZ_SMS_USERNAME');
    const jazzPassword = this.configService.get('JAZZ_SMS_PASSWORD');
    if (jazzUrl && jazzUsername) {
      try {
        await axios.get(jazzUrl, {
          params: {
            username: jazzUsername,
            password: jazzPassword,
            to: phone.replace('+', ''),
            from: 'TransportOS',
            text: dto.message,
          },
        });
        return { success: true, provider: 'jazz' };
      } catch (err: any) {
        this.logger.warn(`Jazz SMS failed: ${err.message}`);
      }
    }

    // Dev fallback — log to console
    this.logger.log(`[DEV SMS] To: ${dto.phone} | ${dto.message}`);
    return { success: true, provider: 'console' };
  }

  async sendOtp(phone: string, otp: string): Promise<{ success: boolean; provider: string }> {
    return this.sendSms({
      phone,
      message: `TransportOS: Your verification code is ${otp}. Valid for 10 minutes. Do not share this code.`,
    });
  }

  async sendBookingConfirmation(phone: string, pnr: string, route: string, departure: string): Promise<void> {
    await this.sendSms({
      phone,
      message: `TransportOS: Booking confirmed!\nPNR: ${pnr}\nRoute: ${route}\nDeparture: ${departure}\nHave a safe journey! 🚌`,
    });
  }

  async sendCancellationNotice(phone: string, pnr: string): Promise<void> {
    await this.sendSms({
      phone,
      message: `TransportOS: Booking ${pnr} has been cancelled. Refund will be processed in 3-5 business days.`,
    });
  }

  async sendTripDelayAlert(phone: string, pnr: string, delayMinutes: number): Promise<void> {
    await this.sendSms({
      phone,
      message: `TransportOS: Alert for booking ${pnr} — your bus is delayed by ${delayMinutes} minutes. We apologize for the inconvenience.`,
    });
  }

  // Normalize Pakistani phone to E.164
  private normalizePakistaniPhone(phone: string): string {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+92')) return cleaned;
    if (cleaned.startsWith('0092')) return '+92' + cleaned.slice(4);
    if (cleaned.startsWith('0')) return '+92' + cleaned.slice(1);
    return '+92' + cleaned;
  }
}
