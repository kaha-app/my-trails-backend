import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (
      request.user?.role === 'admin' ||
      String(request.user?.id) === request.params.id
    )
      return true;
    throw new ForbiddenException('You cannot access another user');
  }
}
