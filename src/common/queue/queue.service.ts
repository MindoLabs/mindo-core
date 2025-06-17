import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common'
import { Job, Queue, QueueEvents, Worker } from 'bullmq'
import Redis, { RedisOptions } from 'ioredis'
import config from 'src/config'

export interface JobInput {
  serviceName: string
  job: any
  additionalInfo?: any
  delay?: number
}

export interface QueueJobData {
  data: JobInput
  service: string
}

export interface IWorker {
  addToQueue: (data: JobInput) => any
}

export interface IQueueService {
  getName: () => string
  execute: (data: JobInput) => any
  onFailed?: (data: JobInput, error: Error) => Promise<void>
  onCompleted?: (data: JobInput) => Promise<void>
}

@Injectable()
export class QueueService implements OnApplicationShutdown {
  private queue: Queue<QueueJobData>
  private worker: Worker<QueueJobData>
  private static allServices: Record<string, IQueueService> = {}
  private readonly logger = new Logger()

  constructor() {
    this.logger.log('initializing queue service')
    this.initialize()
  }

  private getQueueName(): string {
    return config.redis.queue
  }

  private initialize() {
    try {
      const { host, port, cluster } = config.redis
      const topicName = this.getQueueName()

      this.logger.log(
        `[connecting redis] host: ${host}, port: ${port}, topicName: ${topicName}`
      )

      const redisOptions: RedisOptions = {
        port,
        host,
        maxRetriesPerRequest: null,
      }
      if (cluster) {
        redisOptions.tls = {
          rejectUnauthorized: false,
        }
      }

      const redis = new Redis(redisOptions)
      this.queue = new Queue(topicName, { connection: redis })
      const queueEvents = new QueueEvents(topicName, { connection: redis })

      if (config.worker) {
        queueEvents.on('failed', ({ jobId, failedReason }) =>
          this.logger.error(`${jobId} failed due to ${failedReason}`)
        )

        this.queue.on('error', (ex) => this.logger.error(ex))

        this.worker = new Worker(
          this.getQueueName(),
          async (job) => await this.eventTick(job),
          {
            connection: redis,
            autorun: true,
            concurrency: 20, // equal to number of db threads
          }
        )

        this.worker.on('completed', (job) => this.eventCompleted(job))
        this.worker.on('failed', (job, error) => {
          if (job) {
            this.eventFailed(job, error)
          } else {
            this.logger.error('[EventFailed]: job is undefined', error)
          }
        })
      }
    } catch (ex) {
      this.logger.log(ex)
    }
  }

  private async eventTick(job: Job<QueueJobData>) {
    this.logger.log(`[EventTick]:${JSON.stringify(job.data)}`)
    const { data, service } = job.data || {}

    if (service && QueueService.allServices[service]) {
      await QueueService.allServices[service]?.execute?.(data)
    } else {
      throw new Error(`service not found for ${service}`)
    }
  }

  private async eventCompleted(job: Job<QueueJobData>) {
    this.logger.log(`[EventCompleted]:${JSON.stringify(job?.data)}`)
    const { data, service } = job.data || {}

    if (service && QueueService.allServices[service]) {
      await QueueService.allServices[service]?.onCompleted?.(data)
    }
  }

  private async eventFailed(job: Job<QueueJobData>, error: Error) {
    this.logger.log(`[EventFailed]:${JSON.stringify(job?.data)}`)
    this.logger.error(error)

    const { data, service } = job.data || {}
    if (service && QueueService.allServices[service]) {
      await QueueService.allServices[service]?.onFailed?.(data, error)
    }
  }

  subscribe(service: IQueueService) {
    QueueService.allServices[service.getName()] = service
  }

  getInstance(service: IQueueService): IWorker {
    this.subscribe(service)
    return {
      addToQueue: (data: JobInput) => {
        return this.addToQueue(data, data.serviceName || service.getName())
      },
    }
  }

  async addToQueue(data: JobInput, serviceName: string) {
    try {
      this.logger.log(`adding job to queue`)
      await this.queue?.add(
        `${this.getQueueName()}-job`,
        {
          data,
          service: serviceName,
        },
        {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 1,
          delay: data?.delay,
          backoff: {
            type: 'fixed',
            delay: 3000,
          },
        }
      )
      this.logger.log(`added to queue ${JSON.stringify(data)}`)
    } catch (error) {
      this.logger.error(error)
      const mockJob = {
        data: {
          data,
          service: serviceName,
        },
      } as Job<QueueJobData>
      this.eventFailed(mockJob, error)
    }
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(signal)
    await this.worker?.close()
  }
}
