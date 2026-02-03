import { Prisma } from '@prisma/client';

export function isPrismaKnownError(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError;
}

export function prismaErrorToHttp(e: Prisma.PrismaClientKnownRequestError): { status: number; message: string } {
  // https://www.prisma.io/docs/orm/reference/error-reference
  switch (e.code) {
    case 'P2002': {
      const fields = (e.meta?.target as string[] | undefined)?.join(', ') ?? 'unique field';
      return { status: 409, message: `Unique constraint failed on: ${fields}` };
    }
    case 'P2025':
      return { status: 404, message: 'Not found' };
    default:
      return { status: 400, message: 'Database error' };
  }
}
