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

    // Only SMS has a live delivery path today (Twilio, else console). Other
    // channels are recorded but not yet wired to a provider.
    if (channel === 'SMS' || channel === 'WHATSAPP') {
      for (const u of recipients) {
        this.notificationService.sendSms({ phone: u.phone, message: dto.message }).catch(() => undefined);
      }
    } else {
      this.logger.log(`Broadcast via ${channel} to ${recipients.length} recipients (channel not wired — logged only)`);
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
