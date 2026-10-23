/** Only customer-facing local destinations may be carried through account links. */
export function accountReturn(value: string | null | undefined): string | null {
  return value && /^\/(shop|portal)\/[A-Za-z0-9_-]+$/.test(value)
    ? value
    : null;
}
