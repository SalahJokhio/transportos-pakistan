import { Controller, Post, Get, Body, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CouponService } from './services/coupon.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Coupons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Preview the discount a promo code gives on a subtotal' })
  validate(@Body() body: { code: string; amount: number }) {
    return this.couponService.validate(body.code, Number(body.amount) || 0);
  }

  @Get()
  @ApiOperation({ summary: 'List coupons (admin/finance)' })
  list(@Request() req) {
    this.assertAdmin(req);
    return this.couponService.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create a coupon (admin/finance)' })
  create(@Request() req, @Body() body: any) {
    this.assertAdmin(req);
    return this.couponService.create(body);
  }

  private assertAdmin(req: any) {
    const role = req.user?.role;
    if (role !== 'SUPER_ADMIN' && role !== 'FINANCE_OFFICER' && role !== 'COMPANY_ADMIN') {
      throw new ForbiddenException('Admin only');
    }
  }
}
