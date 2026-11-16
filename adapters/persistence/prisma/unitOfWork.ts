/**
 * The UnitOfWork port backed by a Prisma interactive transaction: the work
 * gets repositories bound to the transaction client, and Prisma rolls back
 * every write if the work throws.
 */
import type { PrismaClient } from "@/prisma/generated/prisma";
import type { Repositories, UnitOfWork } from "@/core/ports/repositories";
import { prismaRepositories } from "./repositories";

export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly db: Pick<PrismaClient, "$transaction">) {}

  run<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    return this.db.$transaction((tx) => work(prismaRepositories(tx)));
  }
}
