import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password, ...userData } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        ...userData,
      },
    });

    // Return user without password
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findAll(skip = 0, take = 10) {
    skip = Number.isInteger(skip) && skip >= 0 ? skip : 0;
    take = Number.isInteger(take) ? Math.min(Math.max(take, 1), 100) : 10;
    const users = await this.prisma.user.findMany({
      skip,
      take,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        tokenVersion: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.user.count();

    return {
      data: users,
      total,
      skip,
      take,
    };
  }

  async findById(id: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: bigint, updateUserDto: UpdateUserDto) {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        tokenVersion: true,
      },
    });

    return updated;
  }

  async remove(id: bigint) {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }

  async updateRole(id: bigint, role: UserRole) {
    return this.prisma.user.update({
      where: { id },
      data: { role, tokenVersion: { increment: 1 } },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
      },
    });
  }

  async updateAvatar(id: bigint, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
      select: { id: true, email: true, fullName: true, avatarUrl: true },
    });
  }

  async updateLastLogin(id: bigint) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async updatePassword(id: bigint, newPasswordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash: newPasswordHash, tokenVersion: { increment: 1 } },
    });
  }

  async revokeTokens(id: bigint) {
    await this.prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  async rotateTokenVersion(id: bigint, expectedVersion: number) {
    const result = await this.prisma.user.updateMany({
      where: { id, tokenVersion: expectedVersion },
      data: { tokenVersion: { increment: 1 } },
    });
    if (result.count !== 1) return null;
    return this.prisma.user.findUnique({
      where: { id },
      select: { tokenVersion: true },
    });
  }

  async findByIdWithPassword(id: bigint) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
