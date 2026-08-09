import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadAvatarDto {
  @ApiProperty({ 
    type: 'string', 
    format: 'binary',
    description: 'User avatar image file (JPEG, PNG, GIF, WebP - max 5MB)' 
  })
  file: Express.Multer.File;

  @ApiProperty({ 
    example: 'John Doe', 
    description: 'Full name of the user' 
  })
  @IsString()
  @MinLength(2)
  fullName?: string;

  @ApiProperty({ 
    example: '+1234567890', 
    description: 'International phone number',
    required: false
  })
  phone?: string;
}

export class UploadTrailMediaDto {
  @ApiProperty({ 
    type: 'string', 
    format: 'binary',
    description: 'Trail media file (JPEG, PNG, GIF, WebP - max 5MB)' 
  })
  file: Express.Multer.File;

  @ApiProperty({ 
    example: 'cover',
    enum: ['cover', 'route', 'gallery', 'video'],
    description: 'Type of trail media' 
  })
  type: string;

  @ApiProperty({ 
    example: 'Mountain Peak View',
    description: 'Alt text for accessibility',
    required: false
  })
  altText?: string;
}
