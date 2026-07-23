import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { LoginHistory } from '../entities/login-history.entity';
import { generateTotpSecret, verifyTotp, otpauthUri } from '../security/totp.util';

/** Security Center: two-factor auth (TOTP) + login history. */
@Injectable()
export class SecurityService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(LoginHistory) private readonly historyRepo: Repository<LoginHistory>,
  ) {}

  async status(userId: string) {
    const u = await this.userRepo.findOne({ where: { id: userId } });
    return { twoFactorEnabled: !!(u as any)?.twoFactorEnabled };
  }

  /** Step 1: generate a secret + otpauth URI (not enabled until verified). */
  async setup2fa(userId: string) {
    const u = await this.userRepo.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException('User not found');
    const secret = generateTotpSecret();
    await this.userRepo.update(userId, { twoFactorSecret: secret } as any);
    return { secret, otpauthUri: otpauthUri(secret, u.phone || u.email || userId) };
  }

  /** Step 2: verify a code from the authenticator to turn 2FA on. */
  async enable2fa(userId: string, code: string) {
    const u = await this.userRepo.createQueryBuilder('u').addSelect('u.twoFactorSecret').where('u.id = :id', { id: userId }).getOne();
    const secret = (u as any)?.twoFactorSecret;
    if (!secret) throw new BadRequestException('Run setup first');
    if (!verifyTotp(secret, code)) throw new BadRequestException('Invalid code');
    await this.userRepo.update(userId, { twoFactorEnabled: true } as any);
    return { twoFactorEnabled: true };
  }

  async disable2fa(userId: string, code: string) {
    const u = await this.userRepo.createQueryBuilder('u').addSelect('u.twoFactorSecret').where('u.id = :id', { id: userId }).getOne();
    const secret = (u as any)?.twoFactorSecret;
    if (secret && !verifyTotp(secret, code)) throw new BadRequestException('Invalid code');
    await this.userRepo.update(userId, { twoFactorEnabled: false, twoFactorSecret: null } as any);
    return { twoFactorEnabled: false };
  }

  loginHistory(userId: string) {
    return this.historyRepo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 30 });
  }

  /** Best-effort record used by the auth login flow. */
  async record(userId: string, status: string, ip?: string, device?: string) {
    try { await this.historyRepo.save(this.historyRepo.create({ userId, status, ip, device: (device || '').slice(0, 180) })); } catch { /* ignore */ }
  }
}
