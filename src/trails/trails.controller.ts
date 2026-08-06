import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TrailsService } from './trails.service';
import { CreateTrailDto } from './dto/create-trail.dto';
import { UpdateTrailDto } from './dto/update-trail.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@ApiTags('Trails')
@Controller('trails')
export class TrailsController {
  constructor(private trailsService: TrailsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new trail' })
  @ApiResponse({ status: 201, description: 'Trail created successfully' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createTrailDto: CreateTrailDto) {
    return this.trailsService.create(createTrailDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all trails with optional filters' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by trail status' })
  @ApiQuery({ name: 'difficulty', required: false, description: 'Filter by difficulty level' })
  @ApiQuery({ name: 'activity', required: false, description: 'Filter by activity type' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or description' })
  @ApiResponse({ status: 200, description: 'Trails retrieved successfully' })
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('status') status?: string,
    @Query('difficulty') difficulty?: string,
    @Query('activity') activity?: string,
    @Query('search') search?: string,
  ) {
    const skipNum = skip ? parseInt(skip) : 0;
    const takeNum = take ? parseInt(take) : 10;

    const filters = {
      ...(status && { status }),
      ...(difficulty && { difficulty }),
      ...(activity && { activity }),
      ...(search && { search }),
    };

    return this.trailsService.findAll(skipNum, takeNum, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trail by ID with full details' })
  @ApiResponse({ status: 200, description: 'Trail retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Trail not found' })
  async findOne(@Param('id') id: string) {
    return this.trailsService.findById(BigInt(id));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update trail' })
  @ApiResponse({ status: 200, description: 'Trail updated successfully' })
  @ApiResponse({ status: 404, description: 'Trail not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id') id: string,
    @Body() updateTrailDto: UpdateTrailDto,
  ) {
    return this.trailsService.update(BigInt(id), updateTrailDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete trail' })
  @ApiResponse({ status: 204, description: 'Trail deleted successfully' })
  @ApiResponse({ status: 404, description: 'Trail not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string) {
    return this.trailsService.remove(BigInt(id));
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Publish a trail (change status to active)' })
  @ApiResponse({ status: 200, description: 'Trail published successfully' })
  @ApiResponse({ status: 404, description: 'Trail not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async publish(@Param('id') id: string) {
    return this.trailsService.publish(BigInt(id));
  }

  @Post(':id/favourites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add trail to user favorites' })
  @ApiResponse({ status: 201, description: 'Added to favorites' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addToFavourites(
    @Param('id') trailId: string,
    @Request() req: any,
  ) {
    return this.trailsService.addToFavourites(BigInt(trailId), req.user.id);
  }

  @Delete(':id/favourites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove trail from user favorites' })
  @ApiResponse({ status: 204, description: 'Removed from favorites' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeFromFavourites(
    @Param('id') trailId: string,
    @Request() req: any,
  ) {
    return this.trailsService.removeFromFavourites(BigInt(trailId), req.user.id);
  }
}
