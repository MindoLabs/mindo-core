import { Injectable, Logger } from '@nestjs/common'
import Redis, { RedisOptions } from 'ioredis'
import config from 'src/config'

@Injectable()
export class CacheService {
  private readonly redisClient: Redis
  private readonly logger = new Logger()

  constructor() {
    const { port, host, cluster } = config.redis
    this.logger.log(
      `[connecting redis] host: ${host}, port: ${port}, env: ${config.env}`
    )

    const redisOptions: RedisOptions = { port, host }

    if (cluster) {
      // for aws redis connection
      redisOptions.tls = {
        rejectUnauthorized: false,
      }
    }

    this.redisClient = new Redis(redisOptions)
  }

  private getKey(key: string) {
    return `${config.env}:${key}`
  }

  async get(key: string): Promise<any> {
    const data = await this.redisClient.get(this.getKey(key))
    return data ? JSON.parse(data) : null
  }

  async set(key: string, value: any, ttl?: number): Promise<any> {
    if (ttl) {
      await this.redisClient.set(
        this.getKey(key),
        JSON.stringify(value),
        'EX',
        ttl
      )
    } else {
      await this.redisClient.set(this.getKey(key), JSON.stringify(value))
    }
  }

  async del(key: string): Promise<void> {
    await this.redisClient.del(this.getKey(key))
  }

  async delPattern(key: string, excludePattern?: string): Promise<void> {
    const keysToDelete = await this.redisClient.keys(this.getKey(key))

    await Promise.all(
      keysToDelete.map(async (keyToDel) => {
        if (excludePattern && keyToDel.indexOf(excludePattern) >= 0) {
          return
        }
        await this.redisClient.del(keyToDel)
      })
    )
  }

  async delCache(key: string): Promise<void> {
    if (key.endsWith('*')) {
      await this.delPattern(key)
    } else {
      await this.del(key)
    }
  }
}
