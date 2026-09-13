// HTML date inputs give "YYYY-MM-DD"; the API expects a full ISO datetime string.
export function toIsoDob(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}
