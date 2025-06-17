import { DataSource, DataSourceOptions } from 'typeorm'
import { config as dotenvConfig } from 'dotenv'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import config from 'src/config'
dotenvConfig({ path: '.env' })

const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: config.database.host,
  port: Number(config.database.port),
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: false,
  logging: false,
  migrationsTableName: 'migration_history',
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  extra: {
    max: config.database.pool,
  },
  ssl: {
    rejectUnauthorized: false,
  },
}

export default typeOrmConfig

export const connectionSource = new DataSource(
  typeOrmConfig as DataSourceOptions
)
