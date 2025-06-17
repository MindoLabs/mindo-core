import { Injectable, Logger } from '@nestjs/common'
import {
  IQueueService,
  JobInput,
  QueueService,
} from './common/queue/queue.service'
import { JobTypes } from './common/constant/common.constant'
import { JobService } from './common/queue/jobs.service'

@Injectable()
export class AppService implements IQueueService {
  private readonly logger = new Logger()

  constructor(
    private readonly jobService: JobService,
    private readonly queueService: QueueService
  ) {
    this.queueService.subscribe(this)
  }

  async getHello() {
    this.logger.log('[AppService.getHello]')
    await this.jobService.exampleJob('My Input')
    console.log('task added')
    return {
      data: 'done',
    }
  }

  getName() {
    return AppService.name
  }

  async execute(data: JobInput) {
    this.logger.log(`[AppService.execute]`)

    try {
      const { job } = data
      const { jobType, input } = job

      if (jobType === JobTypes.ExampleJob) {
        await new Promise((resolve) => setTimeout(resolve, 5000))
        this.logger.log(input)
      }
    } catch (ex) {
      this.logger.error(ex)
      this.logger.error(`Error in executing job ${JSON.stringify(data)}`)
    }
  }
}
