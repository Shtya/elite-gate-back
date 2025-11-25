import { SetMetadata } from '@nestjs/common';
import { UserType } from 'entities/global.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserType[]) => SetMetadata(ROLES_KEY, roles);