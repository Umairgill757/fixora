import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('An account with this email already exists.');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        phone: dto.phone,
        role: (dto.role ?? 'CUSTOMER') as Role,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return { user, ...this.signTokens(user.id, user.role) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) throw new UnauthorizedException('Invalid email or password.');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid email or password.');

    const { passwordHash: _ph, ...safe } = user;
    return { user: safe, ...this.signTokens(user.id, user.role) };
  }

  private signTokens(sub: string, role: Role) {
    const payload = { sub, role };
    return {
      accessToken: this.jwt.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwt.sign(payload, { expiresIn: '7d' }),
    };
  }

  /** Exchange a valid refresh token for a fresh pair (rotation). */
  refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<{ sub: string; role: Role }>(refreshToken);
      return this.signTokens(payload.sub, payload.role);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }
}
