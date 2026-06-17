import { Controller, Post, Body, Get, Put, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import {
  RegisterDto, LoginDto, SendOtpDto, VerifyOtpDto,
  RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto,
} from '../dto/register.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with phone + password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get new access token using refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request OTP for password reset' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.phone);
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset password using OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (logged-in user)' })
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, dto);
  }

  @Post('otp/send')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send OTP to phone' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify OTP and get tokens' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  me(@Request() req) {
    return req.user;
  }
}
