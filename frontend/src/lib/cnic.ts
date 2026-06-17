// Pakistan CNIC validation utilities

export function parseCnic(raw: string): {
  valid: boolean;
  formatted: string;
  gender: 'MALE' | 'FEMALE';
  district: string;
} | null {
  const digits = raw.replace(/[-\s]/g, '');
  if (!/^\d{13}$/.test(digits)) return null;

  const checkDigit = Number(digits[12]);
  return {
    valid: true,
    formatted: `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits[12]}`,
    gender: checkDigit % 2 === 0 ? 'FEMALE' : 'MALE',
    district: digits.slice(0, 5),
  };
}

// Auto-format as user types: inserts dashes at positions 5 and 13
export function formatCnicInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits[12]}`;
}

export function isCnicValid(cnic: string): boolean {
  const digits = cnic.replace(/[-\s]/g, '');
  return /^\d{13}$/.test(digits);
}
