import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'
export const AllPublicMethods = {}

export const Public = () => {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const name = target?.constructor.name?.toLowerCase()
    AllPublicMethods[name] = AllPublicMethods[name] || []

    const methodName = descriptor?.value?.name?.toLowerCase()
    AllPublicMethods[name].push(methodName)
    
    SetMetadata(IS_PUBLIC_KEY, true)(target, propertyKey, descriptor)
  }
}
