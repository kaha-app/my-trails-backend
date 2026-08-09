import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address (unique)' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1234567890', description: 'International phone number', required: false })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone must be a valid international format',
  })
  phone?: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Password (min 8 chars, must contain uppercase, lowercase, number, and special character)' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Confirm password (must match password)' })
  @IsString()
  confirmPassword: string;
}
