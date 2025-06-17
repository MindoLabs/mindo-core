import { Global, Module } from '@nestjs/common'
import { QueueService } from './queue/queue.service'
import { CacheService } from './cache/cache.service'
import { JobService } from './queue/jobs.service'
import { JwtModule } from '@nestjs/jwt'
import config from 'src/config'

@Global()
@Module({
  imports: [JwtModule.register({ secret: config.jwtSecret, global: true })],
  providers: [QueueService, JobService, CacheService],
  exports: [QueueService, JobService, CacheService],
})
export class CommonModule {}
