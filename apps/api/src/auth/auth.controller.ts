import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public, Scope } from '../common/decorators';
import type { RequestScope } from '../common/scope/request-scope';
import { AuthService, type RequestMeta } from './auth.service';
import { ChangePasswordDto, LoginDto, LogoutDto, RefreshDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Tizimga kirish' })
  login(@Body() body: LoginDto, @Req() request: Request) {
    return this.authService.login(body, requestMeta(request, body.deviceId));
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Access tokenni yangilash' })
  refresh(@Body() body: RefreshDto, @Req() request: Request) {
    return this.authService.refresh(body.refreshToken, requestMeta(request));
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Tizimdan chiqish' })
  logout(@Body() body: LogoutDto, @Scope() scope: RequestScope) {
    return this.authService.logout(body?.refreshToken, scope);
  }

  @Post('logout-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Barcha qurilmalardan chiqish' })
  logoutAll(@Scope() scope: RequestScope) {
    return this.authService.logoutAll(scope);
  }

  @Get('me')
  @ApiOperation({ summary: "Joriy foydalanuvchi ma'lumotlari va huquqlari" })
  me(@Scope() scope: RequestScope) {
    return this.authService.me(scope);
  }

  @Post('change-password')
  @HttpCode(200)
  @ApiOperation({ summary: "Parolni o'zgartirish" })
  changePassword(@Body() body: ChangePasswordDto, @Scope() scope: RequestScope) {
    return this.authService.changePassword(scope, body);
  }
}

function requestMeta(request: Request, deviceId?: string): RequestMeta {
  return {
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    deviceId,
  };
}
