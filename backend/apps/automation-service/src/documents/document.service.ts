import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { Booking } from '../../../booking-service/src/entities/booking.entity';
import { Payment } from '../../../payment-service/src/entities/payment.entity';
import { Trip } from '../../../fleet-service/src/entities/trip.entity';
import { Route } from '../../../fleet-service/src/entities/route.entity';
import { Employee } from '../../../fleet-service/src/entities/employee.entity';
import { Attendance } from '../../../fleet-service/src/entities/attendance.entity';

/**
 * Document Engine: generates branded PDFs (invoice, salary slip, offer letter)
 * from real records. Pure pdfkit — no Chromium/headless dependency.
 */
@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Route) private readonly routeRepo: Repository<Route>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Attendance) private readonly attendanceRepo: Repository<Attendance>,
  ) {}

  private render(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      try { build(doc); doc.end(); } catch (e) { reject(e); }
    });
  }

  private header(doc: PDFKit.PDFDocument, title: string) {
    doc.fillColor('#ea580c').fontSize(22).text('TransportOS', 50, 50);
    doc.fillColor('#64748b').fontSize(9).text('Pakistan Intercity Transport Platform', 50, 76);
    doc.fillColor('#0f172a').fontSize(16).text(title, 50, 105);
    doc.moveTo(50, 130).lineTo(545, 130).strokeColor('#e2e8f0').stroke();
    doc.moveDown(2);
  }

  private kv(doc: PDFKit.PDFDocument, label: string, value: string, y: number) {
    doc.fillColor('#64748b').fontSize(10).text(label, 50, y);
    doc.fillColor('#0f172a').fontSize(11).text(value, 220, y);
  }

  private rs(n: number) { return `Rs ${Math.round(Number(n)).toLocaleString('en-PK')}`; }

  // ── Invoice ─────────────────────────────────────────────────────────
  async invoice(pnr: string): Promise<{ buffer: Buffer; filename: string }> {
    const booking = await this.bookingRepo.findOne({ where: { pnr } });
    if (!booking) throw new NotFoundException('Booking not found');
    const trip = await this.tripRepo.findOne({ where: { id: booking.tripId } });
    const route = trip ? await this.routeRepo.findOne({ where: { id: trip.routeId } }) : null;
    const payment = await this.paymentRepo.findOne({ where: { bookingId: booking.id } });

    const buffer = await this.render((doc) => {
      this.header(doc, 'INVOICE');
      let y = 150;
      this.kv(doc, 'Invoice / PNR', booking.pnr, y); y += 22;
      this.kv(doc, 'Date', new Date(booking.createdAt).toLocaleDateString('en-PK'), y); y += 22;
      this.kv(doc, 'Route', route ? `${route.originCity} → ${route.destinationCity}` : '—', y); y += 22;
      this.kv(doc, 'Departure', trip ? new Date(trip.departureTime).toLocaleString('en-PK') : '—', y); y += 22;
      this.kv(doc, 'Seats', (booking.seatNumbers || []).join(', '), y); y += 22;
      this.kv(doc, 'Payment', `${payment?.provider ?? 'N/A'} · ${payment?.status ?? booking.status}`, y); y += 34;

      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').stroke(); y += 14;
      this.kv(doc, 'Subtotal', this.rs(booking.totalAmount), y); y += 20;
      if (Number(booking.discountAmount) > 0) { this.kv(doc, 'Discount', '- ' + this.rs(booking.discountAmount), y); y += 20; }
      doc.fillColor('#ea580c').fontSize(13).text('Total Paid', 50, y);
      doc.fillColor('#ea580c').fontSize(13).text(this.rs(booking.finalAmount), 220, y);

      doc.fillColor('#94a3b8').fontSize(8).text('This is a computer-generated invoice and needs no signature.', 50, 760);
    });
    return { buffer, filename: `invoice-${booking.pnr}.pdf` };
  }

  // ── Salary slip ─────────────────────────────────────────────────────
  async salarySlip(employeeId: string, month: string): Promise<{ buffer: Buffer; filename: string }> {
    const emp = await this.employeeRepo.findOne({ where: { id: employeeId } });
    if (!emp) throw new NotFoundException('Employee not found');
    // month = YYYY-MM
    const rows = await this.attendanceRepo.query(
      `SELECT status, COUNT(*)::int n FROM attendance WHERE "employeeId"=$1 AND to_char(date::date,'YYYY-MM')=$2 GROUP BY status`,
      [employeeId, month],
    );
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.status] = r.n;
    const present = (counts.PRESENT ?? 0) + (counts.HALF_DAY ?? 0) * 0.5;
    const salary = Number(emp.salary) || 0;

    const buffer = await this.render((doc) => {
      this.header(doc, 'SALARY SLIP');
      let y = 150;
      this.kv(doc, 'Employee', `${emp.firstName} ${(emp as any).lastName ?? ''}`.trim(), y); y += 22;
      this.kv(doc, 'Type', emp.employeeType, y); y += 22;
      this.kv(doc, 'Month', month, y); y += 22;
      this.kv(doc, 'Days present', String(present), y); y += 22;
      this.kv(doc, 'Days on leave', String(counts.LEAVE ?? 0), y); y += 22;
      this.kv(doc, 'Days absent', String(counts.ABSENT ?? 0), y); y += 34;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').stroke(); y += 14;
      this.kv(doc, 'Monthly salary', this.rs(salary), y); y += 20;
      doc.fillColor('#ea580c').fontSize(13).text('Net Pay', 50, y);
      doc.fillColor('#ea580c').fontSize(13).text(this.rs(salary), 220, y);
      doc.fillColor('#94a3b8').fontSize(8).text('Computer-generated salary slip.', 50, 760);
    });
    return { buffer, filename: `salary-${emp.firstName}-${month}.pdf` };
  }

  // ── Offer letter ────────────────────────────────────────────────────
  async offerLetter(employeeId: string): Promise<{ buffer: Buffer; filename: string }> {
    const emp = await this.employeeRepo.findOne({ where: { id: employeeId } });
    if (!emp) throw new NotFoundException('Employee not found');
    const buffer = await this.render((doc) => {
      this.header(doc, 'OFFER OF EMPLOYMENT');
      doc.moveDown();
      doc.fillColor('#0f172a').fontSize(11).text(`Date: ${new Date().toLocaleDateString('en-PK')}`, 50, 150);
      doc.moveDown(2);
      doc.fontSize(12).text(`Dear ${emp.firstName},`, { continued: false });
      doc.moveDown();
      doc.fontSize(11).fillColor('#334155').text(
        `We are pleased to offer you the position of ${emp.employeeType} at TransportOS. ` +
        `Your monthly gross salary will be ${this.rs(Number(emp.salary) || 0)}` +
        `${(emp as any).joinDate ? `, with a joining date of ${new Date((emp as any).joinDate).toLocaleDateString('en-PK')}` : ''}. ` +
        `This offer is subject to our standard terms of employment, verification of documents, and applicable company policies.`,
        { align: 'left', lineGap: 4 },
      );
      doc.moveDown(2);
      doc.fillColor('#0f172a').text('We look forward to welcoming you to the team.');
      doc.moveDown(3);
      doc.text('_______________________');
      doc.fillColor('#64748b').fontSize(10).text('Authorised Signatory, TransportOS');
    });
    return { buffer, filename: `offer-${emp.firstName}.pdf` };
  }
}
