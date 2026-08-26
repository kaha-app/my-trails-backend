import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum PauseAction {
  PAUSE = 'pause',
  RESUME = 'resume',
}

export class PauseRecordingDto {
  @ApiProperty({
    enum: ['pause', 'resume'],
    example: 'pause',
    description: 'Action to perform',
  })
  @IsEnum(PauseAction)
  action: PauseAction;
}
