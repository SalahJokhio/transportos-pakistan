import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** Document Engine: streams generated PDFs. */
@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentController {
  constructor(private readonly docs: DocumentService) {}

  private send(res: Response, doc: { buffer: Buffer; filename: string }) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${doc.filename}"`,
      'Content-Length': doc.buffer.length,
    });
    res.end(doc.buffer);
  }

  @Get('invoice/:pnr')
  @ApiOperation({ summary: 'Invoice PDF for a booking (by PNR)' })
  async invoice(@Param('pnr') pnr: string, @Res() res: Response) {
    this.send(res, await this.docs.invoice(pnr));
  }

  @Get('salary/:employeeId')
  @ApiOperation({ summary: 'Salary slip PDF (?month=YYYY-MM)' })
  async salary(@Param('employeeId') employeeId: string, @Query('month') month: string, @Res() res: Response) {
    const m = month || new Date().toISOString().slice(0, 7);
    this.send(res, await this.docs.salarySlip(employeeId, m));
  }

  @Get('offer/:employeeId')
  @ApiOperation({ summary: 'Offer-letter PDF for an employee' })
  async offer(@Param('employeeId') employeeId: string, @Res() res: Response) {
    this.send(res, await this.docs.offerLetter(employeeId));
  }
}
