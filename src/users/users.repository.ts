import { Injectable } from "@nestjs/common";
import { PrismaRepository } from "src/common/base/base.repository";

@Injectable()
export class UserRepository extends PrismaRepository<'users'> {}
