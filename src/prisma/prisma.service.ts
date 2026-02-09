import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const pg = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pg);
    super({ adapter });
  }
  // onModuleInit/onModuleDestroy unchanged
}
