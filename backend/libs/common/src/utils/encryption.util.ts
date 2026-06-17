import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export class EncryptionUtil {
  private static readonly SALT_ROUNDS = 10;
  
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateOTP(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  static encryptData(data: string, secret: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', secret);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  static decryptData(encryptedData: string, secret: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', secret);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}