import { Injectable, Logger } from '@nestjs/common'
import { IQueueService, IWorker, JobInput, QueueService } from './queue.service'

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
  async exampleJob(data: any) {
    const job = {
      data,
      jobType: 'JobTypeExample',
    }
    await this.baseWorker.addToQueue({
      job,
      serviceName: 'SericeNameExample',
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
