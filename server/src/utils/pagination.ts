export interface PageInput {
  page: number;
  limit: number;
}
export interface PaginationMeta extends PageInput {
  total: number;
  pages: number;
}

function assertPage({ page, limit }: PageInput) {
  if (!Number.isSafeInteger(page) || page < 1) throw new RangeError('page must be an integer >= 1');
  if (!Number.isSafeInteger(limit) || limit < 1)
    throw new RangeError('limit must be an integer >= 1');
}

/** `pages` is 0 when `total` is 0. */
export function buildPaginationMeta({
  page,
  limit,
  total,
}: PageInput & { total: number }): PaginationMeta {
  assertPage({ page, limit });
  if (!Number.isSafeInteger(total) || total < 0)
    throw new RangeError('total must be an integer >= 0');
  return { page, limit, total, pages: Math.ceil(total / limit) };
}

export function skipFor({ page, limit }: PageInput): number {
  assertPage({ page, limit });
  return (page - 1) * limit;
}
