import moment from 'moment';

export class DateUtil {
  static formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
    return moment(date).format(format);
  }

  static formatDateTime(date: Date): string {
    return moment(date).format('YYYY-MM-DD HH:mm:ss');
  }

  static addDays(date: Date, days: number): Date {
    return moment(date).add(days, 'days').toDate();
  }

  static subtractDays(date: Date, days: number): Date {
    return moment(date).subtract(days, 'days').toDate();
  }

  static differenceInDays(date1: Date, date2: Date): number {
    return moment(date1).diff(moment(date2), 'days');
  }

  static differenceInHours(date1: Date, date2: Date): number {
    return moment(date1).diff(moment(date2), 'hours');
  }

  static isAfter(date1: Date, date2: Date): boolean {
    return moment(date1).isAfter(date2);
  }

  static isBefore(date1: Date, date2: Date): boolean {
    return moment(date1).isBefore(date2);
  }

  static startOfDay(date: Date): Date {
    return moment(date).startOf('day').toDate();
  }

  static endOfDay(date: Date): Date {
    return moment(date).endOf('day').toDate();
  }
}