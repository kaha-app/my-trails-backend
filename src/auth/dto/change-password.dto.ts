import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'oldPassword123',
    description: 'Current password',
    minLength: 6,
    maxLength: 50,
  })
  @IsString()
  @MinLength(6, { message: 'Old password must be at least 6 characters' })
  @MaxLength(50, { message: 'Old password cannot exceed 50 characters' })
  oldPassword: string;

  @ApiProperty({
    example: 'newPassword456',
    description: 'New password (must be different from old password)',
    minLength: 6,
    maxLength: 50,
  })
  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @MaxLength(50, { message: 'New password cannot exceed 50 characters' })
  newPassword: string;

  @ApiProperty({
    example: 'newPassword456',
    description: 'Confirm new password (must match newPassword)',
    minLength: 6,
    maxLength: 50,
  })
  @IsString()
  @MinLength(6, { message: 'Confirm password must be at least 6 characters' })
  @MaxLength(50, { message: 'Confirm password cannot exceed 50 characters' })
  confirmPassword: string;
}
