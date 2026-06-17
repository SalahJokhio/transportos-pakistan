import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { User } from '../entities/user.entity';
import { Otp } from '../entities/otp.entity';
import { RegisterDto, LoginDto, SendOtpDto, VerifyOtpDto, ResetPasswordDto, ChangePasswordDto } from '../dto/register.dto';
import { EncryptionUtil } from '@app/common';
import { DateUtil } from '@app/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Otp) private readonly otpRepo: Repository<Otp>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('Phone number already registered');

    const hashedPassword = await EncryptionUtil.hashPassword(dto.password);
    const user = this.userRepo.create({ ...dto, password: hashedPassword });
    await this.userRepo.save(user);

    const tokens = this.generateTokens(user);
    return { user: this.sanitize(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { phone: dto.phone },
      select: ['id', 'phone', 'email', 'firstName', 'lastName', 'role', 'password', 'isActive'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account disabled');

    const valid = await EncryptionUtil.comparePassword(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    const tokens = this.generateTokens(user);
    return { user: this.sanitize(user), ...tokens };
  }

  async sendOtp(dto: SendOtpDto) {
    const code = EncryptionUtil.generateOTP(6);
    const expiresAt = DateUtil.addDays(new Date(), 0); // reuse addDays(0) + 10min
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await this.otpRepo.update(
      { identifier: dto.phone, purpose: dto.purpose, isUsed: false },
      { isUsed: true },
    );

    await this.otpRepo.save({
      identifier: dto.phone,
      code,
      purpose: dto.purpose,
      expiresAt,
    });

    // Call notification-service to deliver OTP via SMS
    const notifUrl = this.configService.get(
      'NOTIFICATION_SERVICE_URL',
      'http://localhost:3006/api/v1',
    );
    try {
      await axios.post(`${notifUrl}/notifications/otp`, { phone: dto.phone, otp: code });
    } catch {
      // Fallback: log in dev, never block the user
      this.logger.warn(`Notification service unreachable — OTP for ${dto.phone}: ${code}`);
    }
    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otp = await this.otpRepo.findOne({
      where: { identifier: dto.phone, purpose: dto.purpose, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!otp || otp.code !== dto.code) throw new BadRequestException('Invalid OTP');
    if (new Date() > otp.expiresAt) throw new BadRequestException('OTP expired');

    await this.otpRepo.update(otp.id, { isUsed: true });

    if (dto.purpose === 'REGISTER' || dto.purpose === 'LOGIN') {
      await this.userRepo.update({ phone: dto.phone }, { isPhoneVerified: true });
    }

    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) throw new BadRequestException('User not found');

    const tokens = this.generateTokens(user);
    return { user: this.sanitize(user), ...tokens };
  }

  async refreshToken(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_SECRET', 'transport-os-secret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const user = await this.userRepo.findOne({ where: { id: payload.sub, isActive: true } });
    if (!user) throw new UnauthorizedException('User not found or inactive');
    return this.generateTokens(user);
  }

  async forgotPassword(phone: string) {
    const user = await this.userRepo.findOne({ where: { phone } });
    if (!user) {
      // Don't reveal whether phone exists — return same message
      return { message: 'If this number is registered, an OTP has been sent' };
    }
    return this.sendOtp({ phone, purpose: 'RESET_PASSWORD' });
  }

  async resetPassword(dto: ResetPasswordDto) {
    const otp = await this.otpRepo.findOne({
      where: { identifier: dto.phone, purpose: 'RESET_PASSWORD', isUsed: false },
      order: { createdAt: 'DESC' },
    });
    if (!otp || otp.code !== dto.otp) throw new BadRequestException('Invalid OTP');
    if (new Date() > otp.expiresAt) throw new BadRequestException('OTP expired');

    await this.otpRepo.update(otp.id, { isUsed: true });
    const hashed = await EncryptionUtil.hashPassword(dto.newPassword);
    await this.userRepo.update({ phone: dto.phone }, { password: hashed });
    return { message: 'Password reset successfully. Please login.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });
    if (!user) throw new UnauthorizedException();
    const valid = await EncryptionUtil.comparePassword(dto.currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    const hashed = await EncryptionUtil.hashPassword(dto.newPassword);
    await this.userRepo.update(userId, { password: hashed });
    return { message: 'Password changed successfully' };
  }

  private generateTokens(user: User) {
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  private sanitize(user: User) {
    const { password, ...safe } = user as any;
    return safe;
  }
}
