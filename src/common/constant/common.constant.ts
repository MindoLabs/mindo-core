export const ENV = {
  dev: 'dev',
  qa: 'qa',
  uat: 'uat',
  prod: 'prod',
}

export enum Roles {
  USER = 'User',
  ADMIN = 'Admin',
}

export enum JobTypes {
  ExampleJob = 'ExampleJob',
}

export enum TokenTypesEnum {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

export const tokenExpiry = {
  access: '7d',
  refresh: '365d',
}

export const CacheTypes = {
  TokenExpired: 'tokenExpired:',
  S3File: `s3File:`,
  Asterisk: '*',
}
