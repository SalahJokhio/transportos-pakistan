import { Controller, Get, Put, Body, Param, Query, UseGuards, Request, Delete, Post, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { UpdateProfileDto } from '../dto/register.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, ValidationUtil } from '@app/common';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get own profile' })
  getProfile(@Request() req) {
    return this.userService.findById(req.user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update own profile' })
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(req.user.id, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'List all users (admin)' })
  listUsers(@Query() query: any) {
    return this.userService.listUsers(query);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get user by ID (admin)' })
  findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Delete(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Deactivate user (super admin)' })
  deactivate(@Param('id') id: string) {
    return this.userService.deactivate(id);
  }

  @Post('validate-cnic')
  @ApiOperation({ summary: 'Validate & parse a Pakistani CNIC number' })
  validateCnic(@Body() body: { cnic: string }) {
    const result = ValidationUtil.parseCNIC(body.cnic);
    if (!result) throw new BadRequestException('Invalid CNIC format. Expected: XXXXX-YYYYYYY-Z');
    return result;
  }
}
