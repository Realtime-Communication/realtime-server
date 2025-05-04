import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export class PrismaRepository<
  K extends Exclude<keyof PrismaClient, symbol | `$${string}`>,
> {
  private readonly model!: K;

  constructor(private readonly prisma: PrismaService) {}

  async aggregate(...args: Parameters<PrismaClient[K]['aggregate']>) {
    return await (this.prisma[this.model].aggregate as any)(...args);
  }

  async count(...args: Parameters<PrismaClient[K]['count']>) {
    return await (this.prisma[this.model].count as any)(...args);
  }

  async create(...args: Parameters<PrismaClient[K]['create']>) {
    return await (this.prisma[this.model].create as any)(...args);
  }

  async createMany(...args: Parameters<PrismaClient[K]['createMany']>) {
    return await (this.prisma[this.model].createMany as any)(...args);
  }

  async delete(...args: Parameters<PrismaClient[K]['delete']>) {
    return await (this.prisma[this.model].delete as any)(...args);
  }

  async findFirst(...args: Parameters<PrismaClient[K]['findFirst']>) {
    return await (this.prisma[this.model].findFirst as any)(...args);
  }

  async findFirstOrThrow(
    ...args: Parameters<PrismaClient[K]['findFirstOrThrow']>
  ) {
    return await (this.prisma[this.model].findFirstOrThrow as any)(...args);
  }

  async findMany(...args: Parameters<PrismaClient[K]['findMany']>) {
    return await (this.prisma[this.model].findMany as any)(...args);
  }

  async findUnique(...args: Parameters<PrismaClient[K]['findUnique']>) {
    return await (this.prisma[this.model].findUnique as any)(...args);
  }

  async findUniqueOrThrow(
    ...args: Parameters<PrismaClient[K]['findUniqueOrThrow']>
  ) {
    return await (this.prisma[this.model].findUniqueOrThrow as any)(...args);
  }

  async update(...args: Parameters<PrismaClient[K]['update']>) {
    return await (this.prisma[this.model].update as any)(...args);
  }

  async updateMany(...args: Parameters<PrismaClient[K]['updateMany']>) {
    return await (this.prisma[this.model].updateMany as any)(...args);
  }

  async upsert(...args: Parameters<PrismaClient[K]['upsert']>) {
    return await (this.prisma[this.model].upsert as any)(...args);
  }
}
