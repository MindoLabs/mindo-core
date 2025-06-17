# Cache Module with Decorators – Internal Documentation

## Overview

This module implements a method-level caching mechanism using Redis, suitable for NestJS applications. It provides decorators to automatically cache the results of expensive function calls and clear relevant caches when data is modified. The design includes:

- Redis-backed caching
- Automatic key namespacing by environment
- Optional TTL (time-to-live) support
- Singleton pattern to prevent concurrent cache misses from triggering multiple function executions
- Decorators: `@Cache` and `@CacheClear`

## Components

### 1. `CacheService`

A service responsible for all Redis operations.

#### Constructor

Initializes a Redis client using the app configuration (`host`, `port`, `cluster`). If the Redis instance is running in AWS (cluster mode), TLS is used with `rejectUnauthorized: false`.

#### Methods

- `get(key: string): Promise<any>`  
   Retrieves and parses a cached value. Returns `null` if not found.
- `set(key: string, value: any, ttl?: number): Promise<void>`  
   Stores a value under a namespaced key. Optionally accepts a TTL in seconds.
- `del(key: string): Promise<void>`  
   Deletes a key.
- `delPattern(key: string, excludePattern?: string): Promise<void>`  
   Deletes all keys matching a pattern unless they contain the `excludePattern` substring.
- `delCache(key: string): Promise<void>`  
   Determines if the key ends with a wildcard (`*`). If so, deletes by pattern; otherwise deletes a single key.

## Decorators

### `@Cache({ key, ttl?, type? })`

Caches the result of the decorated asynchronous method.

#### Parameters

- `key`: A string or function that returns the cache key based on the method's arguments.
- `ttl`: (Optional) Cache expiration time in seconds.
- `type`: (Optional) String prefix for categorizing or namespacing keys.

#### Behavior

1. Constructs a cache key using `type` + key (with environment namespace).
2. Attempts to retrieve the value from Redis.
3. If a cached value exists, it is returned immediately.
4. If not cached, it uses a **singleton pattern**:

   - Ensures only one execution of the method per key.
   - Other concurrent calls wait for the result via event emitters.

5. After method execution, the result is cached with an optional TTL.

#### Example

```ts
@Cache({ key: (id) => `user:${id}`, ttl: 60 })
async getUser(id: string) {
  return this.userRepository.findById(id)
}
```

### `@CacheClear({ key?, keys?, type? })`

Clears cache entries after the method completes.

#### Parameters

- `key`: A string or function that returns a key.
- `keys`: An array or function returning multiple keys.
- `type`: (Optional) Key namespace prefix.

#### Behavior

1. Invokes the original method.
2. After successful execution:

   - If `key` is provided, deletes a single cache entry or pattern.
   - If `keys` is provided, deletes multiple entries/patterns.

#### Example

```ts
@CacheClear({
  key: (id) => `user:${id}`,
  keys: () => ['user:list', 'user:stats'],
  type: 'app:'
})
async updateUser(id: string, data: any) {
  return this.userRepository.update(id, data)
}
```

## Singleton Mechanism

### `getSingletonData(...)`

Handles multiple concurrent requests for the same uncached data:

1. If no cache key is provided, calls the original method.
2. If a cache key is provided:

   - Checks if an event emitter already exists for the key.
   - If not, creates an emitter and performs the original function.
   - Emits `success` or `error` based on outcome.
   - Concurrent requests wait on the emitter for results.

3. This avoids redundant computation and multiple Redis writes.

## Key Formatting

All keys are prefixed with the current environment (`config.env`) to avoid collisions between environments (e.g., `dev:user:123`, `prod:user:123`).

If `type` is specified in decorator params, it acts as an additional prefix for organization (e.g., `prod:app:user:123`).

## Configuration Flags

- `config.redis.cache`: Global toggle for enabling/disabling caching behavior.
- `config.redis.cluster`: Enables TLS configuration when `true`.

## Summary

This caching system provides:

- Easy integration with any async method via decorators
- Redis-backed storage with optional TTL
- Environment and type-based namespacing
- Automatic cache invalidation hooks via `@CacheClear`
- Singleton execution to eliminate duplicate async calls on cache misses

<br>

# How `@Cache()` and `@CacheClear()` Work?

## 1. `@Cache()` Decorator – How It Works

The `@Cache()` decorator is applied to **asynchronous methods that return data** (like a `findOne()` or `getDetails()` function). Its purpose is to check Redis for a cached result before executing the method, and cache the result afterward if not found.

### 🔄 Flow Breakdown

#### Step 1: Decorator Setup

```ts
@Cache({ key: (id) => `user:${id}`, ttl: 60, type: 'app:' })
async getUser(id: string) {
  return this.userRepo.findById(id)
}
```

- `key`: A function that takes arguments and returns a cache key (e.g., `user:123`).
- `ttl`: Time-to-live in seconds (optional).
- `type`: String prefix for namespacing (optional, e.g., `app:`).

#### Step 2: On Method Call

##### a. Compute Full Cache Key

```ts
const cacheKey = type + key(...args)
```

This becomes:  
`prod:app:user:123`  
(`prod` is added automatically via `config.env` in `CacheService.getKey()`)

##### b. Try Reading from Redis

```ts
const result = await cacheService.get(cacheKey)
```

- If found → JSON is parsed and returned immediately.
- If not found → proceed to run the method using `getSingletonData()`.

##### c. Singleton Execution Control (`getSingletonData`)

Purpose: Prevent **multiple concurrent calls** from executing the same uncached method simultaneously.

- First call:
  - Executes the method
  - Stores an `EventEmitter` in `singletonCalls[cacheKey]`
  - Emits `success`/`error` after resolving
- All other calls:
  - Listen for the emitter’s event (`success` or `error`)
  - Return the result once emitted

This ensures only one call proceeds to the DB/API; others wait.

##### d. Cache the Result

```ts
await cacheService.set(cacheKey, result, ttl)
```

- The result is serialized and stored in Redis.
- TTL is applied if provided.

## 2. `@CacheClear()` Decorator – How It Works

The `@CacheClear()` decorator is applied to **mutation methods** (like `updateUser`, `deletePost`). It deletes related cache entries after the method executes successfully.

### 🔄 Flow Breakdown

#### Step 1: Decorator Setup

```ts
@CacheClear({
  key: (id) => `user:${id}`,
  keys: () => ['user:list', 'user:stats'],
  type: 'app:'
})
async updateUser(id: string, data: any) {
  return this.userRepo.update(id, data)
}
```

- `key`: A function returning one specific cache key or pattern to clear.
- `keys`: A function or array of multiple keys to clear.
- `type`: Optional prefix for grouping.

#### Step 2: On Method Call

##### a. Run the Original Method

```ts
const result = await originalMethod.apply(this, args)
```

##### b. Clear Specific Cache Key (if any)

```ts
await cacheService.delCache(`${type}${key}`)
```

- If key ends in `*` → treats it as a pattern → deletes all matching keys using `keys()`
- If exact key → deletes only that specific key

##### c. Clear Multiple Keys (if any)

```ts
await Promise.all(keys.map(... => cacheService.delCache(...)))
```

- All provided keys (or dynamically returned by a function) are deleted one by one.
- Like the previous step, it supports both pattern (`*`) and exact keys.

### ❗Important Behaviors

- Deletion happens **after** method execution.
- `delCache()` supports both literal keys and wildcard patterns.
- Both `key` and `keys` are optional — either can be used alone or together.

## Combined Use Case Example

```ts
@Cache({ key: (id) => `user:${id}`, ttl: 60, type: 'app:' })
async getUser(id: string) {
  return this.userRepo.findById(id)
}

@CacheClear({ key: (id) => `user:${id}`, type: 'app:' })
async updateUser(id: string, data: any) {
  return this.userRepo.update(id, data)
}
```

### Scenario:

1. `getUser(123)` is called

   - Cache miss → DB hit → result is cached under `prod:app:user:123`

2. `updateUser(123, ...)` is called

   - After DB update → `prod:app:user:123` is deleted

3. Next `getUser(123)` call → cache miss → fresh DB value fetched

## Summary

| Decorator       | Purpose                         | Runs Before/After | Accepts Function Keys? | Deletes? |
| --------------- | ------------------------------- | ----------------- | ---------------------- | -------- |
| `@Cache()`      | Cache results of a method       | Before + After    | Yes                    | No       |
| `@CacheClear()` | Invalidate cache after mutation | After             | Yes                    | Yes      |

Both decorators work with dynamic keys, are environment-aware, and leverage a Redis backend with namespacing and singleton call deduplication.
