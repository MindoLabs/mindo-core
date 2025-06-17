import { MiddlewareConsumer, Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import typeOrmConfig from './db/typeorm.config'
import { CommonModule } from './common/common.module'
import { ApplicationMiddleware } from './common/auth/middleware'
import { APP_GUARD } from '@nestjs/core'
import { AuthGuard } from './common/auth/auth.guard'

@Module({
  imports: [TypeOrmModule.forRoot(typeOrmConfig), CommonModule],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    AppService,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApplicationMiddleware).forRoutes('*')
  }
}
