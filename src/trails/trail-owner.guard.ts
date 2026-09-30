import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrailOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (request.user?.role === 'admin') return true;
    const trail = await this.prisma.trail.findUnique({
      where: { id: BigInt(request.params.id) },
      select: { ownerUserId: true },
    });
    if (!trail) throw new NotFoundException('Trail not found');
    if (trail.ownerUserId !== request.user?.id)
      throw new ForbiddenException('You cannot modify this trail');
    return true;
  }
}
