export class ValidationUtil {
  static isEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isPhone(phone: string): boolean {
    // Pakistan phone number format
    const phoneRegex = /^(\+92|0)?[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  static isCNIC(cnic: string): boolean {
    // Pakistan CNIC format: XXXXX-YYYYYYY-Z (13 digits total)
    const cnicRegex = /^[0-9]{5}-[0-9]{7}-[0-9]$/;
    return cnicRegex.test(cnic);
  }

  static parseCNIC(cnic: string): {
    valid: boolean;
    formatted: string;
    district: string;
    serial: string;
    checkDigit: number;
    gender: 'MALE' | 'FEMALE' | null;
  } | null {
    // Normalize: strip dashes and spaces
    const digits = cnic.replace(/[-\s]/g, '');
    if (!/^\d{13}$/.test(digits)) return null;

    const formatted = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits[12]}`;
    const checkDigit = Number(digits[12]);
    const gender = checkDigit % 2 === 0 ? 'FEMALE' : 'MALE';

    return {
      valid: true,
      formatted,
      district: digits.slice(0, 5),
      serial: digits.slice(5, 12),
      checkDigit,
      gender,
    };
  }

  static isURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static sanitizePhone(phone: string): string {
    // Remove spaces, dashes, and convert to standard format
    let cleaned = phone.replace(/[\s\-]/g, '');
    
    // Convert +92 to 0
    if (cleaned.startsWith('+92')) {
      cleaned = '0' + cleaned.substring(3);
    }
    
    return cleaned;
  }
}