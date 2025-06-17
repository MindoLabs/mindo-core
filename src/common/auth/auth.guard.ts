import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common'
import { IS_PUBLIC_KEY } from './public.decorator'
import { Reflector } from '@nestjs/core'
import { Context } from './context/context.service'
import { ROLE } from './role.decorator'
import { Roles, TokenTypesEnum } from 'src/common/constant/common.constant'
import { AuthService } from './auth.service'

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger()
  constructor(
    private reflector: Reflector,
    private authService: AuthService
  ) {}
  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }
    const associatedRole = this.reflector.getAllAndOverride<string>(ROLE, [
      context.getHandler(),
      context.getClass(),
    ])

    // validate JWT token
    const request = context.switchToHttp().getRequest()
    const accessToken = request.headers['authorization']
    if (!accessToken) {
      return false
    }

    let payload
    try {
      payload = await this.authService.validateToken(
        accessToken,
        TokenTypesEnum.ACCESS
      )
      if (!payload) return false
    } catch (ex) {
      this.logger.error('invalid access token')
      return false
    }
    const { user: id, sub, username, role, internal } = payload
    const userId = id || sub
    if (!userId || !payload.user) {
      this.logger.log(
        'AUTHGUARD_ERROR: with payload data not having proper userId',
        JSON.stringify(payload)
      )
    }
    if (associatedRole === Roles.ADMIN && role !== Roles.ADMIN) {
      return false
    }

    Context.User = {
      id: userId,
      username,
      role,
      internal,
    }
    return true
  }
}
