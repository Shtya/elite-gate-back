import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserType } from 'entities/global.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserType[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no role restriction on this route — allow
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

     if (!user) {
      throw new ForbiddenException('Access denied: user not found in request.');
    }

    if (!user.userType) {
      throw new ForbiddenException('Access denied: missing user role information.');
    }

    const hasRole = requiredRoles.includes(user.userType);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: your role "${user.userType}" is not authorized for this route. Required: [${requiredRoles.join(', ')}].`,
      );
    }

    return true;
  }
}
