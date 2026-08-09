import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FavouritesService } from './favourites.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@ApiTags('Favourites')
@Controller('favourites')
export class FavouritesController {
  constructor(private favouritesService: FavouritesService) {}

  @Post('trails/:trailId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add trail to user favorites' })
  @ApiResponse({ status: 201, description: 'Added to favorites' })
  @ApiResponse({ status: 404, description: 'Trail not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addToFavourites(
    @Param('trailId') trailId: string,
    @Request() req: any,
  ) {
    return this.favouritesService.addToFavourites(BigInt(trailId), req.user.id);
  }

  @Delete('trails/:trailId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove trail from user favorites' })
  @ApiResponse({ status: 204, description: 'Removed from favorites' })
  @ApiResponse({ status: 404, description: 'Trail not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeFromFavourites(
    @Param('trailId') trailId: string,
    @Request() req: any,
  ) {
    return this.favouritesService.removeFromFavourites(BigInt(trailId), req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user favorite trails' })
  @ApiResponse({ status: 200, description: 'User favorites retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserFavourites(
    @Request() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip) : 0;
    const takeNum = take ? parseInt(take) : 10;
    return this.favouritesService.getUserFavourites(req.user.id, skipNum, takeNum);
  }

  @Get('trails/:trailId/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Check if trail is in user favorites' })
  @ApiResponse({ status: 200, description: 'Returns isFavourite boolean' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async isFavourite(
    @Param('trailId') trailId: string,
    @Request() req: any,
  ) {
    return this.favouritesService.isFavourite(BigInt(trailId), req.user.id);
  }
}
