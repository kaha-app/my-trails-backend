import { IsNumber, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartRecordingDto {
  @ApiProperty({ example: 123, description: 'Trail ID' })
  @IsNumber()
  trailId: number;

  @ApiProperty({ example: 456, description: 'User ID' })
  @IsNumber()
  userId: number;

  @ApiProperty({
    example: '2026-08-19T10:30:00Z',
    description: 'ISO 8601 start timestamp',
  })
  @IsISO8601()
  startTime: string;
}
