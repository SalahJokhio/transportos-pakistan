import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Broadcast } from '../entities/broadcast.entity';
import { NotificationService } from '../../../notification-service/src/notification.service';

const MAX_RECIPIENTS = 1000; // safety cap per blast

interface SendDto {
  title?: string;
  message: string;
  channel?: string; // SMS | WHATSAPP | PUSH | EMAIL
  segment?: string; // ALL | <role>
}

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Broadcast) private readonly broadcastRepo: Repository<Broadcast>,
    private readonly notificationService: NotificationService,
  ) {}

  /** Send a message to a user segment and record the blast. */
  async send(dto: SendDto, createdBy?: string) {
    const segment = dto.segment || 'ALL';
    const channel = dto.channel || 'SMS';

    const where = segment === 'ALL' ? {} : { role: segment as any };
    const users = await this.userRepo.find({ where, take: MAX_RECIPIENTS });
    const recipients = users.filter((u) => u.phone);

    // Every channel now has a delivery path (live when its provider creds are
    // set, else logged — same graceful pattern across the platform).
    const title = dto.title || 'TransportOS';
    for (const u of recipients) {
      const msg = dto.message;
      switch (channel) {
        case 'WHATSAPP': this.notificationService.sendWhatsApp({ phone: u.phone, message: msg }).catch(() => undefined); break;
        case 'EMAIL': if ((u as any).email) this.notificationService.sendEmail({ to: (u as any).email, subject: title, body: msg }).catch(() => undefined); break;
        case 'PUSH': if ((u as any).pushToken) this.notificationService.sendPush({ to: (u as any).pushToken, title, body: msg }).catch(() => undefined); break;
        case 'TELEGRAM': if ((u as any).telegramChatId) this.notificationService.sendTelegram({ to: (u as any).telegramChatId, message: msg }).catch(() => undefined); break;
        default: this.notificationService.sendSms({ phone: u.phone, message: msg }).catch(() => undefined);
      }
    }

    return this.broadcastRepo.save(
      this.broadcastRepo.create({
        title: dto.title,
        message: dto.message,
        channel,
        segment,
        recipientCount: recipients.length,
        status: 'SENT',
        createdBy,
      }),
    );
  }

  history(limit = 50) {
    return this.broadcastRepo.find({ order: { createdAt: 'DESC' }, take: limit });
  }

  /** Recipient count preview for a segment (before sending). */
  async segmentSize(segment: string) {
    const where = segment === 'ALL' ? {} : { role: segment as any };
    const total = await this.userRepo.count({ where });
    return { segment, total };
  }
}
