import { SetMetadata } from '@nestjs/common';
import { Roles } from 'src/common/constant/common.constant';

export const ROLE = 'role';

export const Role = (role: Roles) => SetMetadata(ROLE, role);
