import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '@app/common';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
