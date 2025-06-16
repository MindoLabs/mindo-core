import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env' });

export default {
  env: process.env.ENVIRONMENT,
  port: process.env.SERVER_PORT,
  jwtSecret: process.env.JWT_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  youtubeApiKey: process.env.YOUTUBE_API_KEY,
  worker: process.env.ENABLE_WORKER?.toUpperCase() === 'TRUE',
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || '5432',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    pool: parseInt(process.env.DB_POOL || '10'),
  },
  redis: {
    queue: `${process.env.ENVIRONMENT}-worker`,
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    cache: process.env.REDIS_CACHE?.toUpperCase() === 'TRUE',
  },
};
