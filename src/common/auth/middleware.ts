import { Injectable, NestMiddleware } from '@nestjs/common'
import { FastifyRequest, FastifyReply } from 'fastify'
import { Context } from './context/context.service'

@Injectable()
export class ApplicationMiddleware implements NestMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: (err?: Error) => void) {
    Context.start(() => next())
  }
}
