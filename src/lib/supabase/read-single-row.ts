import "server-only";

type SingleRowResult<T> = { data: T | null; error: { message: string } | null };

/**
 * One row, with a failed read told apart from a missing one.
 *
 * `maybeSingle()` reports both as "no data": a row that is not there arrives as
 * `data: null, error: null`, and a read that never completed arrives as
 * `data: null` with an error beside it. A detail page that checks only the data
 * answers "this listing does not exist" when the truth is that we could not
 * reach the database — the reader sees a 404 and believes the item is gone.
 *
 * A single-row read is cheap, so a dropped one is tried once more before the
 * page gives up; what is left after that is reported as the failure it is.
 */
export async function readSingleRow<T>(read: () => PromiseLike<SingleRowResult<T>>, subject: string): Promise<T | null> {
  const first = await read();
  if (!first.error) return first.data;

  const retry = await read();
  if (!retry.error) return retry.data;
  throw new Error(`Could not read ${subject}: ${retry.error.message}`);
}
