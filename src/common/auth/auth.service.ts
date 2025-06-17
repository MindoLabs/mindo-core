import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { CacheTypes, TokenTypesEnum } from '../constant/common.constant'
import { CacheService } from '../cache/cache.service'

interface DecodedToken {
  username: string
  user: string
  sub: string
  role: string
  internal: boolean
  token_use: TokenTypesEnum
}
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService
  ) {}

  async expireToken(userId: string) {
    await this.cacheService.set(
      `${CacheTypes.TokenExpired}${userId}`,
      Date.now()
    )
  }

  async validateToken(
    token: string,
    type: TokenTypesEnum
  ): Promise<DecodedToken | null> {
    try {
      const decoded = this.jwtService.verify(token)
      if (decoded && decoded.token_use === type) {
        const { iat, user } = decoded
        const expiredTime = await this.cacheService.get(
          `${CacheTypes.TokenExpired}${user}`
        )
        if (expiredTime && iat * 1000 < expiredTime) {
          return null
        }
        return decoded
      } else return null
    } catch (error) {
      return null
    }
  }
}
