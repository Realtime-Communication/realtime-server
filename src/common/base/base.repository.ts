import { Injectable } from '@nestjs/common';

type PrismaDelegate<T> = T extends {
  findUnique: (args: infer FindUniqueArgs) => infer FindUniqueReturn;
  findUniqueOrThrow: (
    args: infer FindUniqueOrThrowArgs,
  ) => infer FindUniqueOrThrowReturn;
  findMany: (args: infer FindManyArgs) => infer FindManyReturn;
  create: (args: infer CreateArgs) => infer CreateReturn;
  update: (args: infer UpdateArgs) => infer UpdateReturn;
  delete: (args: infer DeleteArgs) => infer DeleteReturn;
}
  ? {
      findUnique: (args: FindUniqueArgs) => FindUniqueReturn;
      findUniqueOrThrow: (
        args: FindUniqueOrThrowArgs,
      ) => FindUniqueOrThrowReturn;
      findMany: (args: FindManyArgs) => FindManyReturn;
      create: (args: CreateArgs) => CreateReturn;
      update: (args: UpdateArgs) => UpdateReturn;
      delete: (args: DeleteArgs) => DeleteReturn;
    }
  : never;

@Injectable()
export abstract class CrudRepository<T> {
  constructor(protected readonly prismaDelegate: PrismaDelegate<T>) {}

  async create(args: Parameters<PrismaDelegate<T>['create']>[0]) {
    return await this.prismaDelegate.create(args);
  }

  async findMany(args?: Parameters<PrismaDelegate<T>['findMany']>[0]) {
    return await this.prismaDelegate.findMany(args);
  }

  async findUnique(args: Parameters<PrismaDelegate<T>['findUnique']>[0]) {
    return await this.prismaDelegate.findUnique(args);
  }

  async findUniqueOrThrow(
    args: Parameters<PrismaDelegate<T>['findUniqueOrThrow']>[0],
  ) {
    return await this.prismaDelegate.findUniqueOrThrow(args);
  }

  async update(args: Parameters<PrismaDelegate<T>['update']>[0]) {
    return await this.prismaDelegate.update(args);
  }

  async delete(args: Parameters<PrismaDelegate<T>['delete']>[0]) {
    return await this.prismaDelegate.delete(args);
  }
}
