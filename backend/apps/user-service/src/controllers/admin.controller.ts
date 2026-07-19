import { Controller, Get, Patch, Post, Put, Delete, Body, Param, Query, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { SettlementService } from '../services/settlement.service';
import { CompanyService } from '../services/company.service';
import { CatalogService } from '../services/catalog.service';
import { ComplianceService } from '../services/compliance.service';
import { AuditService, AuditInterceptor } from '../services/audit.service';
import { BroadcastService } from '../services/broadcast.service';
import { SupportService } from '../services/support.service';
import { DisputeService } from '../services/dispute.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '@app/common';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly settlementService: SettlementService,
    private readonly companyService: CompanyService,
    private readonly catalogService: CatalogService,
    private readonly complianceService: ComplianceService,
    private readonly auditService: AuditService,
    private readonly broadcastService: BroadcastService,
    private readonly supportService: SupportService,
    private readonly disputeService: DisputeService,
  ) {}

  // ---- Support / ticketing ----------------------------------------------

  @Get('support')
  @ApiOperation({ summary: 'Support tickets with SLA state' })
  supportList(@Query('status') status?: string) {
    return this.supportService.list(status);
  }

  @Get('support/canned')
  @ApiOperation({ summary: 'Canned reply templates' })
  supportCanned() {
    return this.catalogService.getCannedReplies();
  }

  @Put('support/canned')
  setSupportCanned(@Body() body: { replies: Array<{ title: string; body: string }> }) {
    return this.catalogService.setCannedReplies(body.replies);
  }

  @Get('support/:id')
  @ApiOperation({ summary: 'A ticket with its message thread' })
  supportGet(@Param('id') id: string) {
    return this.supportService.get(id);
  }

  @Post('support/:id/reply')
  @ApiOperation({ summary: 'Reply to a ticket (public reply or internal note)' })
  supportReply(@Param('id') id: string, @Body() body: { body: string; isInternal?: boolean }, @Request() req) {
    return this.supportService.reply(id, body.body, { id: req.user?.sub, role: req.user?.role }, body.isInternal);
  }

  @Patch('support/:id')
  @ApiOperation({ summary: 'Update ticket status / priority / assignment' })
  supportUpdate(@Param('id') id: string, @Body() body: any) {
    return this.supportService.update(id, body);
  }

  // ---- Broadcast center -------------------------------------------------

  @Get('broadcasts')
  @ApiOperation({ summary: 'Broadcast history' })
  broadcasts() {
    return this.broadcastService.history();
  }

  @Get('broadcasts/segment-size')
  @ApiOperation({ summary: 'Recipient count for a segment' })
  segmentSize(@Query('segment') segment: string) {
    return this.broadcastService.segmentSize(segment || 'ALL');
  }

  @Post('broadcasts')
  @ApiOperation({ summary: 'Send a broadcast (SMS/WhatsApp) to a user segment' })
  sendBroadcast(@Body() body: any, @Request() req) {
    return this.broadcastService.send(body, req.user?.sub);
  }

  // ---- Audit log + RBAC editor ------------------------------------------

  @Get('audit-logs')
  @ApiOperation({ summary: 'Recent admin actions (audit trail)' })
  auditLogs(@Query('limit') limit?: string) {
    return this.auditService.list(limit ? Number(limit) : 100);
  }

  @Get('rbac')
  @ApiOperation({ summary: 'Role → capability permission matrix' })
  getRbac() {
    return this.catalogService.getRbac();
  }

  @Put('rbac')
  @ApiOperation({ summary: 'Update the permission matrix' })
  setRbac(@Body() body: { matrix: Record<string, string[]> }) {
    return this.catalogService.setRbac(body.matrix);
  }

  // ---- Compliance / KYC -------------------------------------------------

  @Get('compliance/expiring')
  @ApiOperation({ summary: 'Documents expired or expiring soon (alert queue)' })
  complianceExpiring(@Query('days') days?: string) {
    return this.complianceService.expiring(days ? Number(days) : 30);
  }

  @Get('compliance')
  @ApiOperation({ summary: 'All compliance documents (optionally filtered)' })
  complianceList(@Query('ownerType') ownerType?: string, @Query('ownerId') ownerId?: string) {
    return this.complianceService.list({ ownerType, ownerId });
  }

  @Post('compliance')
  @ApiOperation({ summary: 'Add a compliance document (permit/fitness/licence/CNIC…)' })
  addCompliance(@Body() body: any) {
    return this.complianceService.create(body);
  }

  @Patch('compliance/:id/verify')
  @ApiOperation({ summary: 'Verify or reject a document' })
  verifyCompliance(@Param('id') id: string, @Body() body: { status: string; notes?: string }) {
    return this.complianceService.verify(id, body.status, body.notes);
  }

  @Delete('compliance/:id')
  deleteCompliance(@Param('id') id: string) {
    return this.complianceService.remove(id);
  }

  // ---- CMS / catalog ----------------------------------------------------

  @Get('catalog/cities')
  @ApiOperation({ summary: 'All cities (incl. inactive)' })
  adminCities() { return this.catalogService.listCities(false); }

  @Post('catalog/cities')
  @ApiOperation({ summary: 'Add a city' })
  addCity(@Body() body: any) { return this.catalogService.createCity(body); }

  @Patch('catalog/cities/:id')
  updateCity(@Param('id') id: string, @Body() body: any) { return this.catalogService.updateCity(id, body); }

  @Delete('catalog/cities/:id')
  deleteCity(@Param('id') id: string) { return this.catalogService.deleteCity(id); }

  @Get('catalog/banners')
  @ApiOperation({ summary: 'All banners (incl. inactive)' })
  adminBanners() { return this.catalogService.listBanners(undefined, false); }

  @Post('catalog/banners')
  addBanner(@Body() body: any) { return this.catalogService.createBanner(body); }

  @Patch('catalog/banners/:id')
  updateBanner(@Param('id') id: string, @Body() body: any) { return this.catalogService.updateBanner(id, body); }

  @Delete('catalog/banners/:id')
  deleteBanner(@Param('id') id: string) { return this.catalogService.deleteBanner(id); }

  @Get('catalog/fare-rules')
  getFareRules() { return this.catalogService.getFareRules(); }

  @Put('catalog/fare-rules')
  @ApiOperation({ summary: 'Set the fare governor (min/max fare, surge cap)' })
  setFareRules(@Body() body: any) { return this.catalogService.setFareRules(body); }

  // ---- Multi-tenant: companies -----------------------------------------

  @Get('companies')
  @ApiOperation({ summary: 'All operators with plan, status, limits and usage' })
  companies() {
    return this.companyService.list();
  }

  @Patch('companies/:companyId')
  @ApiOperation({ summary: 'Update a company plan / limits / branding' })
  updateCompany(@Param('companyId') companyId: string, @Body() body: any) {
    return this.companyService.update(companyId, body);
  }

  @Post('companies/:companyId/suspend')
  @ApiOperation({ summary: 'Suspend a company (also blocks the operator login)' })
  suspendCompany(@Param('companyId') companyId: string) {
    return this.companyService.setSuspended(companyId, true);
  }

  @Post('companies/:companyId/activate')
  @ApiOperation({ summary: 'Reactivate a suspended company' })
  activateCompany(@Param('companyId') companyId: string) {
    return this.companyService.setSuspended(companyId, false);
  }

  // ---- Settlements (operator payouts) -----------------------------------

  @Get('settlements/summary')
  @ApiOperation({ summary: 'Per-operator payable: gross → commission → net → outstanding' })
  settlementSummary() {
    return this.settlementService.summary();
  }

  @Get('settlements')
  @ApiOperation({ summary: 'List generated settlements (payout records)' })
  settlements(@Query('status') status?: string) {
    return this.settlementService.list(status);
  }

  @Post('settlements/generate')
  @ApiOperation({ summary: 'Snapshot an operator’s outstanding amount as a PENDING settlement' })
  generateSettlement(@Body() body: { companyId: string }) {
    return this.settlementService.generate(body.companyId);
  }

  @Post('settlements/:id/pay')
  @ApiOperation({ summary: 'Mark a settlement as paid out' })
  paySettlement(@Param('id') id: string, @Body() body: { reference?: string }) {
    return this.settlementService.markPaid(id, body?.reference);
  }

  // ---- Payments & refunds -----------------------------------------------

  @Get('payments')
  @ApiOperation({ summary: 'Recent payments (with PNR) for the refunds console' })
  payments(@Query('limit') limit?: string) {
    return this.adminService.listPayments(limit ? Number(limit) : 50);
  }

  @Post('payments/:id/refund')
  @ApiOperation({ summary: 'Refund a payment (full or partial) to the passenger wallet' })
  refundPayment(@Param('id') id: string, @Body() body: { amount?: number; reason?: string }) {
    return this.adminService.refundPayment(id, body?.amount, body?.reason);
  }

  @Get('disputes')
  @ApiOperation({ summary: 'Disputes / refund-request / fraud queue' })
  disputes(@Query('status') status?: string) {
    return this.disputeService.listAll(status);
  }

  @Patch('disputes/:id/resolve')
  @ApiOperation({ summary: 'Resolve or reject a dispute' })
  resolveDispute(@Param('id') id: string, @Body() body: { status: string; resolution?: string }) {
    return this.disputeService.resolve(id, body.status, body.resolution);
  }

  @Get('fraud-signals')
  @ApiOperation({ summary: 'Users with suspicious activity (many cancellations)' })
  fraudSignals() {
    return this.adminService.getFraudSignals();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide user stats' })
  getStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Platform revenue and booking stats' })
  getRevenue() {
    return this.adminService.getRevenueStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users with filters' })
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminService.listUsers({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      role,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  updateRole(@Param('id') id: string, @Body() body: { role: UserRole }) {
    return this.adminService.updateUserRole(id, body.role);
  }

  @Post('users/:id/activate')
  @ApiOperation({ summary: 'Activate a user account' })
  activate(@Param('id') id: string) {
    return this.adminService.toggleUserActive(id, true);
  }

  @Post('users/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a user account' })
  deactivate(@Param('id') id: string) {
    return this.adminService.toggleUserActive(id, false);
  }

  @Get('operators')
  @ApiOperation({ summary: 'List all operators (COMPANY_ADMIN role)' })
  getOperators() {
    return this.adminService.getOperators();
  }

  @Post('operators/:id/approve')
  @ApiOperation({ summary: 'Approve an operator (set role to COMPANY_ADMIN)' })
  approveOperator(@Param('id') id: string) {
    return this.adminService.updateUserRole(id, UserRole.COMPANY_ADMIN);
  }
}
