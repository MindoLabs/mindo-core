import { Injectable, Logger } from '@nestjs/common'
import { IQueueService, IWorker, JobInput, QueueService } from './queue.service'
import { JobTypes } from '../constant/common.constant'
import { AppService } from 'src/app.service'

@Injectable()
export class JobService implements IQueueService {
  private readonly logger = new Logger()
  private readonly baseWorker: IWorker

  constructor(private readonly queueService: QueueService) {
    this.baseWorker = this.queueService.getInstance(this)
  }

  getName() {
    return JobService.name
  }

  // implement jobs here
  async exampleJob(input: string) {
    this.logger.log('[JobService.exampleJob]')

    const job = {
      input,
      jobType: JobTypes.ExampleJob,
    }
    await this.baseWorker.addToQueue({
      job,
      serviceName: AppService.name,
    })
  }

  async execute(data: JobInput) {
    try {
      const { job } = data
      const { jobType } = job || {}
      this.logger.log(`executing ${jobType} on job service`)
    } catch (error) {
      this.logger.error(`error executing job ${JSON.stringify(data)}`)
      this.logger.error(error)
    }
  }
}
