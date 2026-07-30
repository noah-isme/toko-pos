/**
 * Prisma's `upsert` is not atomic across connections: it reads, then writes. Two
 * Playwright workers seeding the same fixed-id row at the same time both miss on
 * the read and both attempt the insert, so the loser gets P2002 and its whole
 * file fails in `beforeAll`. Retrying once is enough, because by then the winner
 * has committed and the read hits.
 *
 * Kept in its own module (no PrismaClient import) so it can be unit tested
 * without opening a database connection.
 */
const UNIQUE_CONSTRAINT = "P2002";

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === UNIQUE_CONSTRAINT
  );
}

export async function upsertTolerantOfRace<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    return operation();
  }
}
