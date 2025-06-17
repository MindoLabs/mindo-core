import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import typeOrmConfig from './db/typeorm.config'
import { CommonModule } from './common/common.module'

@Module({
  imports: [TypeOrmModule.forRoot(typeOrmConfig), CommonModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
