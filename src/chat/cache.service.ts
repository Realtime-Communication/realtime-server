import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class CacheManager {
  constructor(
    @Inject(CACHE_MANAGER) 
    private readonly cache: Cache
  ){}

  // add socketId with userId in cache
  async addUserId(userId: string, socketId: string): Promise<void> {
    await this.cache.set(userId, socketId);
  }

  // get socketId using userId
  async getSocketId(userId: string): Promise<string | null> {
    return await this.cache.get(userId);
  }

  async removeUserId(userId: string): Promise<string> {
    await this.cache.del(userId);
    return userId;
  }

  async size(): Promise<string | number> {
    return (await this.cache.store.keys()).length;
  }

  async clearStore(): Promise<string | void> {
    await this.cache.store.reset();
  }
}
