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
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { TrailsService } from './trails.service';
import { CreateTrailDto } from './dto/create-trail.dto';
import { UpdateTrailDto } from './dto/update-trail.dto';
import { TrailDetailDto } from './dto/trail-detail.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@ApiTags('Trails')
@Controller('trails')
export class TrailsController {
  constructor(private trailsService: TrailsService) {}

  @Post('upload-gpx')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'gpxFile', maxCount: 1 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload GPX file (first step before trail creation)' })
  @ApiResponse({ status: 201, description: 'GPX file uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file format or no file provided' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        gpxFile: { type: 'string', format: 'binary', description: 'GPX route file' },
      },
      required: ['gpxFile'],
    },
  })
  async uploadGpx(
    @UploadedFiles() files: { gpxFile?: Express.Multer.File[] }
  ) {
    return this.trailsService.uploadGpx(files);
  }

  @Post(':id/cover-photo')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'coverPhoto', maxCount: 1 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload cover photo for trail' })
  @ApiResponse({ status: 201, description: 'Cover photo uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file format or no file provided' })
  @ApiResponse({ status: 404, description: 'Trail not found' })
  @ApiResponse({ status: 413, description: 'Photo exceeds 10MB' })
  @ApiResponse({ status: 415, description: 'Invalid photo format' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        coverPhoto: { type: 'string', format: 'binary', description: 'Cover photo file (JPEG, PNG, WEBP - max 10MB)' },
      },
      required: ['coverPhoto'],
    },
  })
  async uploadCoverPhoto(
    @Param('id') id: string,
    @UploadedFiles() files: { coverPhoto?: Express.Multer.File[] }
  ) {
    return this.trailsService.uploadCoverPhoto(BigInt(id), files);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new trail with basic info' })
  @ApiResponse({ status: 201, description: 'Trail created successfully' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
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
  @ApiResponse({ status: 200, description: 'Trail retrieved successfully', type: TrailDetailDto })
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
  @ApiOperation({ summary: 'Toggle trail status between active and draft' })
  @ApiResponse({ status: 200, description: 'Trail status updated successfully' })
  @ApiResponse({ status: 404, description: 'Trail not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async publish(@Param('id') id: string) {
    return this.trailsService.togglePublish(BigInt(id));
  }

  @Post(':id/phases')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add itinerary phase to trail' })
  @ApiResponse({ status: 201, description: 'Phase added successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phaseNumber: { type: 'number', example: 1 },
        title: { type: 'string', example: 'Hotel to Peak' },
        durationLabel: { type: 'string', example: '3 hours' },
        durationMinutes: { type: 'number', example: 180 },
        altitudeM: { type: 'number', example: 2500 },
        sortOrder: { type: 'number', example: 0 },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              detail: { type: 'string', example: 'Hike through forest' },
              sortOrder: { type: 'number', example: 0 },
            },
          },
        },
      },
      required: ['phaseNumber', 'title'],
    },
  })
  async addPhase(
    @Param('id') id: string,
    @Body() phaseData: any
  ) {
    return this.trailsService.addItineraryPhase(BigInt(id), phaseData);
  }

  @Post(':id/highlights')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add highlight to trail' })
  @ApiResponse({ status: 201, description: 'Highlight added successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', example: 'Amazing mountain views' },
        sortOrder: { type: 'number', example: 0 },
      },
      required: ['text'],
    },
  })
  async addHighlight(
    @Param('id') id: string,
    @Body() data: any
  ) {
    return this.trailsService.addHighlight(BigInt(id), data);
  }

  @Post(':id/points-of-interest')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'images', maxCount: 10 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add point of interest to trail' })
  @ApiResponse({ status: 201, description: 'POI added successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Tea House' },
        description: { type: 'string', example: 'A cozy tea house' },
        distanceKm: { type: 'number', example: 2.5 },
        icon: { type: 'string', example: 'cafe' },
        altitudeM: { type: 'number', example: 2100 },
        latitude: { type: 'number', example: 27.65 },
        longitude: { type: 'number', example: 85.35 },
        facilities: { type: 'array', items: { type: 'string' }, example: ['Water', 'Toilet'] },
        sortOrder: { type: 'number', example: 0 },
        images: { type: 'array', items: { type: 'string', format: 'binary' }, description: 'Image files to upload' },
      },
      required: ['name'],
    },
  })
  async addPointOfInterest(
    @Param('id') id: string,
    @Body() data: any,
    @UploadedFiles() files: { images?: Express.Multer.File[] }
  ) {
    return this.trailsService.addPointOfInterest(BigInt(id), data, files);
  }

  @Post(':id/cost-items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add cost item to trail' })
  @ApiResponse({ status: 201, description: 'Cost item added successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['included', 'excluded'], example: 'included' },
        text: { type: 'string', example: 'Breakfast' },
        sortOrder: { type: 'number', example: 0 },
      },
      required: ['type', 'text'],
    },
  })
  async addCostItem(
    @Param('id') id: string,
    @Body() data: any
  ) {
    return this.trailsService.addCostItem(BigInt(id), data);
  }

  @Post(':id/safety-items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add safety item to trail' })
  @ApiResponse({ status: 201, description: 'Safety item added successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['precaution', 'required_gear'], example: 'precaution' },
        text: { type: 'string', example: 'Bring plenty of water' },
        sortOrder: { type: 'number', example: 0 },
      },
      required: ['type', 'text'],
    },
  })
  async addSafetyItem(
    @Param('id') id: string,
    @Body() data: any
  ) {
    return this.trailsService.addSafetyItem(BigInt(id), data);
  }

  @Post(':id/seasons')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add recommended season to trail' })
  @ApiResponse({ status: 201, description: 'Season added successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        season: { type: 'string', example: 'June' },
        sortOrder: { type: 'number', example: 0 },
      },
      required: ['season'],
    },
  })
  async addSeason(
    @Param('id') id: string,
    @Body() data: any
  ) {
    return this.trailsService.addSeason(BigInt(id), data);
  }

  @Post(':id/avoided-months')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add avoided month to trail' })
  @ApiResponse({ status: 201, description: 'Month added successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        monthLabel: { type: 'string', example: 'June' },
        monthNumber: { type: 'number', example: 6 },
        reason: { type: 'string', example: 'Heavy monsoon rains' },
        sortOrder: { type: 'number', example: 0 },
      },
      required: ['monthLabel'],
    },
  })
  async addAvoidedMonth(
    @Param('id') id: string,
    @Body() data: any
  ) {
    return this.trailsService.addAvoidedMonth(BigInt(id), data);
  }

  @Post(':id/transportation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add or update transportation options for trail' })
  @ApiResponse({ status: 201, description: 'Transportation added successfully' })
  @ApiResponse({ status: 404, description: 'Trail not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        privateOption: { type: 'string', example: 'Taxi or private vehicle from hotel (30-40 minutes)' },
        publicOption: { type: 'string', example: 'Local bus from city center (40 minutes)' },
        returnOption: { type: 'string', example: 'Local bus back to city (every 30 minutes)' },
      },
    },
  })
  async addTransportation(
    @Param('id') id: string,
    @Body() data: any
  ) {
    return this.trailsService.addTransportation(BigInt(id), data);
  }

  @Post(':id/media')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'images', maxCount: 10 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add media images to trail' })
  @ApiResponse({ status: 201, description: 'Media added successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['cover', 'route', 'gallery', 'video'], example: 'gallery' },
        altText: { type: 'string', example: 'Trail photo' },
        sortOrder: { type: 'number', example: 0 },
        url: { type: 'string', example: 'https://example.com/image.jpg', description: 'Optional URL if not uploading file' },
        images: { type: 'array', items: { type: 'string', format: 'binary' }, description: 'Image files to upload' },
      },
      required: [],
    },
  })
  async addMedia(
    @Param('id') id: string,
    @Body() data: any,
    @UploadedFiles() files: { images?: Express.Multer.File[] }
  ) {
    return this.trailsService.addMedia(BigInt(id), data, files);
  }

  @Post(':id/gpx-route')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'gpxFile', maxCount: 1 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload GPX route file for trail' })
  @ApiResponse({ status: 200, description: 'GPX file uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file format' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        gpxFile: { type: 'string', format: 'binary', description: 'GPX route file' },
      },
      required: ['gpxFile'],
    },
  })
  async uploadGpxRoute(
    @Param('id') id: string,
    @UploadedFiles() files: { gpxFile?: Express.Multer.File[] }
  ) {
    return this.trailsService.uploadGpxRoute(BigInt(id), files);
  }
}
