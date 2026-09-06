import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { jwtConfig } from '../config/jwt.config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  private generateTokens(userId: bigint, email: string, role: string) {
    const payload = {
      sub: userId.toString(),
      email,
      role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '1h',
      secret: jwtConfig.secret,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: jwtConfig.refreshSecret,
    });

    return { accessToken, refreshToken };
  }

  async signup(signupDto: SignupDto) {
    const { password, confirmPassword, fullName, email, phone } = signupDto;

    // Validate passwords match
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Create user via UsersService (which handles password hashing)
    const user = await this.usersService.create({
      fullName,
      email,
      phone,
      password,
    });

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user.id, user.email, user.role);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id.toString(),
        userId: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user.id, user.email, user.role);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id.toString(),
        userId: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: jwtConfig.refreshSecret,
      });

      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(
        BigInt(payload.sub),
        payload.email,
        payload.role,
      );

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout() {
    // JWT is stateless, so logout is handled on client side by removing token
    // We can optionally add token blacklisting here if needed
    return {
      message: 'Logged out successfully',
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async changePassword(userId: bigint, oldPassword: string, newPassword: string, confirmPassword: string) {
    // Validate new password matches confirm password
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New password and confirm password do not match');
    }

    // Validate new password is different from old password
    if (oldPassword === newPassword) {
      throw new BadRequestException('New password must be different from old password');
    }

    // Get user by ID (including password hash)
    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('User not found');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Old password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await this.usersService.updatePassword(userId, newPasswordHash);

    return {
      message: 'Password changed successfully',
    };
  }
}
