import { DataSource, DataSourceOptions } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import config from 'src/config';
dotenvConfig({ path: '.env' });

const typeOrmConfig = {
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: false,
  logging: false,
  timezone: 'Z',
  migrationsTableName: 'migration_history',
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  extra: {
    max: config.database.pool,
  },
};

export default typeOrmConfig as TypeOrmModuleOptions;

export const connectionSource = new DataSource(
  typeOrmConfig as DataSourceOptions,
);
