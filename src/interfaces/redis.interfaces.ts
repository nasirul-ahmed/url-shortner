export interface ISetCacheInput<T> {
  readonly data: T;
  readonly key: string;

  /**
   * Expire time in seconds
   */

  readonly expire: number;
}
