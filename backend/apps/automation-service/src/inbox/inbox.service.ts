import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InboxNotification } from './inbox.entity';

/** In-app notification inbox (Notification Engine's in-app channel). */
@Injectable()
export class InboxService {
  constructor(@InjectRepository(InboxNotification) private readonly repo: Repository<InboxNotification>) {}

  create(userId: string, dto: { title: string; body?: string; type?: string; link?: string }) {
    if (!userId) return null;
    return this.repo.save(this.repo.create({ userId, title: dto.title, body: dto.body, type: dto.type || 'info', link: dto.link }));
  }

  list(userId: string, limit = 50) {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: limit });
  }

  async unreadCount(userId: string) {
    const count = await this.repo.count({ where: { userId, isRead: false } });
    return { unread: count };
  }

  async markRead(id: string, userId: string) {
    await this.repo.update({ id, userId }, { isRead: true });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
    return { ok: true };
  }
}
