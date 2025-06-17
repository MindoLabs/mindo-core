import config from 'src/config'
import { CacheService } from './cache.service'
import EventEmitter from 'events'

interface ICache {
  key: ((...args: any[]) => string) | string
  ttl?: number
  type?: string
}

interface ICacheClear {
  key?: ((...args: any[]) => string) | string
  keys?: ((...args: any[]) => string[]) | string[]
  type?: string
}

const singletonCalls: Record<string, EventEmitter> = {}
const eventSuccess = 'success'
const eventError = 'error'

const cacheService = new CacheService()

export function Cache(params: ICache): MethodDecorator {
  return (descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value
    descriptor.value = async function (...args: any[]) {
      const { key, ttl, type = '' } = params
      let cacheKey = key
      if (config.redis.cache) {
        if (typeof key === 'function') {
          cacheKey = key(...args)
        }
        if (cacheKey) {
          const result = await cacheService.get(`${type}${cacheKey}`)
          if (result) {
            return result
          }
        }
      }

      // invoke original method
      const result = await getSingletonData(
        cacheKey as string,
        this,
        originalMethod,
        args
      )

      if (config.redis.cache) {
        if (cacheKey) {
          await cacheService.set(`${type}${cacheKey}`, result, ttl)
        }
      }
      return result
    }
    return descriptor
  }
}

export function CacheClear(params: ICacheClear): MethodDecorator {
  return (descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value
    descriptor.value = async function (...args: any[]) {
      const { key, keys, type = '' } = params

      // invoke original method
      const result = await originalMethod.apply(this, args)
      if (config.redis.cache) {
        let cacheKey = key
        if (typeof key === 'function') {
          cacheKey = key(...args)
        }
        if (cacheKey) {
          await cacheService.delCache(`${type}${cacheKey}`)
        }

        let cacheKeys = keys
        if (typeof keys === 'function') {
          cacheKeys = keys(...args)
        }

        if (Array.isArray(cacheKeys) && cacheKeys.length > 0) {
          await Promise.all(
            cacheKeys.map(async (cacheKey) => {
              if (cacheKey) {
                await cacheService.delCache(`${type}${cacheKey}`)
              }
            })
          )
        }
      }
      return result
    }
    return descriptor
  }
}

async function getSingletonData<T extends (...args: any[]) => Promise<any>>(
  cacheKey: string | undefined,
  instance: ThisParameterType<T>,
  originalMethod: T,
  args: Parameters<T>
): Promise<Awaited<ReturnType<T>>> {
  if (!cacheKey) {
    return await originalMethod.apply(instance, args)
  }

  const sKey = cacheKey.toString()
  const first = singletonCalls[sKey]

  if (!first) {
    const emitter = new EventEmitter()
    singletonCalls[sKey] = emitter

    try {
      const result = await originalMethod.apply(instance, args)
      emitter.emit(eventSuccess, result)
      delete singletonCalls[sKey]
      return result
    } catch (err) {
      emitter.emit(eventError, err)
      delete singletonCalls[sKey]
      throw err
    }
  } else {
    const emitter = singletonCalls[sKey]
    return await new Promise((resolve, reject) => {
      emitter.once(eventSuccess, resolve)
      emitter.once(eventError, reject)
    })
  }
}
