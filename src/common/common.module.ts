import { Global, Module } from '@nestjs/common'
import { QueueService } from './queue/queue.service'
import { CacheService } from './cache/cache.service'
import { JobService } from './queue/jobs.service'

@Global()
@Module({
  imports: [],
  providers: [QueueService, JobService, CacheService],
  exports: [QueueService, JobService, CacheService],
})
export class CommonModule {}
