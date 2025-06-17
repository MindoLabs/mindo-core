import { Injectable } from '@nestjs/common'
import { AsyncLocalStorage } from 'async_hooks'
import { v4 as uuid } from 'uuid'

export interface IUser {
  id: string
  username?: string
  role: string
  internal: boolean
}

const userKey = '_user'

type asyncStorageType = Map<string, any> | undefined

@Injectable()
export class Context {
  private static readonly asyncLocalStorage =
    new AsyncLocalStorage<asyncStorageType>()

  static start(callback: () => void) {
    const contextStore = new Map<string, any>()
    contextStore.set('requestId', uuid())
    Context.asyncLocalStorage.run(contextStore, callback)
  }

  get User(): IUser {
    return this.get(userKey)
  }

  static get User(): IUser {
    const context: asyncStorageType = Context.asyncLocalStorage.getStore()
    return context && context[userKey]
  }

  set User(user) {
    this.save(userKey, user)
  }

  static set User(user) {
    const context: asyncStorageType = Context.asyncLocalStorage.getStore()
    if (context) {
      context[userKey] = user
    }
  }

  save(key: string, value: any) {
    const context: asyncStorageType = Context.asyncLocalStorage.getStore()
    if (context) {
      context[key] = value
    }
  }

  get(key: string) {
    const context: asyncStorageType = Context.asyncLocalStorage.getStore()
    return context && context[key]
  }
}
