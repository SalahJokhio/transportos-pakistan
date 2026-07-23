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

  /**
   * Send over WhatsApp (Twilio WhatsApp channel). Falls back to console until
   * TWILIO_WHATSAPP_FROM + creds are set. Used for transactional messages
   * (booking confirmation, delay, "bus arriving") — WhatsApp-first for PK.
   */
  async sendWhatsApp(dto: SendSmsDto): Promise<{ success: boolean; provider: string }> {
    const phone = this.normalizePakistaniPhone(dto.phone);
    const from = this.configService.get('TWILIO_WHATSAPP_FROM');
    if (this.twilioClient && from) {
      try {
        await this.twilioClient.messages.create({
          body: dto.message,
          from: `whatsapp:${from}`,
          to: `whatsapp:${phone}`,
        });
        return { success: true, provider: 'twilio-whatsapp' };
      } catch (err: any) {
        this.logger.warn(`WhatsApp failed: ${err.message}`);
      }
    }
    this.logger.log(`[DEV WhatsApp] To: ${dto.phone} | ${dto.message}`);
    return { success: true, provider: 'console' };
  }

  /**
   * Email via an HTTP provider (SendGrid) when SENDGRID_API_KEY is set, else
   * logged. No SMTP/nodemailer dependency — same graceful pattern as SMS.
   */
  async sendEmail(dto: { to: string; subject: string; body: string }): Promise<{ success: boolean; provider: string }> {
    const key = this.configService.get('SENDGRID_API_KEY');
    const from = this.configService.get('EMAIL_FROM') || 'no-reply@transportos.pk';
    if (key && !String(key).startsWith('your-')) {
      try {
        await axios.post('https://api.sendgrid.com/v3/mail/send', {
          personalizations: [{ to: [{ email: dto.to }] }],
          from: { email: from, name: 'TransportOS' },
          subject: dto.subject,
          content: [{ type: 'text/plain', value: dto.body }],
        }, { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 15000 });
        return { success: true, provider: 'sendgrid' };
      } catch (err: any) { this.logger.warn(`Email failed: ${err.message}`); }
    }
    this.logger.log(`[DEV Email] To: ${dto.to} | ${dto.subject}`);
    return { success: true, provider: 'console' };
  }

  /** Telegram Bot API when TELEGRAM_BOT_TOKEN is set (to = chat id), else logged. */
  async sendTelegram(dto: { to: string; message: string }): Promise<{ success: boolean; provider: string }> {
    const token = this.configService.get('TELEGRAM_BOT_TOKEN');
    if (token && !String(token).startsWith('your-')) {
      try {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`,
          { chat_id: dto.to, text: dto.message }, { timeout: 15000 });
        return { success: true, provider: 'telegram' };
      } catch (err: any) { this.logger.warn(`Telegram failed: ${err.message}`); }
    }
    this.logger.log(`[DEV Telegram] To: ${dto.to} | ${dto.message}`);
    return { success: true, provider: 'console' };
  }

  /** Push via FCM legacy HTTP when FCM_SERVER_KEY is set (to = device token), else logged. */
  async sendPush(dto: { to: string; title: string; body: string }): Promise<{ success: boolean; provider: string }> {
    const key = this.configService.get('FCM_SERVER_KEY');
    if (key && !String(key).startsWith('your-')) {
      try {
        await axios.post('https://fcm.googleapis.com/fcm/send',
          { to: dto.to, notification: { title: dto.title, body: dto.body } },
          { headers: { Authorization: `key=${key}`, 'Content-Type': 'application/json' }, timeout: 15000 });
        return { success: true, provider: 'fcm' };
      } catch (err: any) { this.logger.warn(`Push failed: ${err.message}`); }
    }
    this.logger.log(`[DEV Push] To: ${dto.to} | ${dto.title}`);
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
