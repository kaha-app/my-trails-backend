import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, Matches, MinLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ 
    example: 'John Doe Updated', 
    description: 'Full name (optional)',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @ApiProperty({ 
    example: '+9876543210', 
    description: 'International phone number (optional)',
    required: false 
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone must be a valid international format',
  })
  phone?: string;

  @ApiProperty({ 
    example: 'https://example.com/new-avatar.jpg', 
    description: 'Avatar URL (optional)',
    required: false 
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ 
    example: 'admin', 
    description: 'User role (admin or user)',
    required: false,
    enum: ['admin', 'user']
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
