// Custom JSON replacer/reviver for BigInt support
// Used to serialize/deserialize transactions and invoices

export function replacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return { __bigint: value.toString() };
  }
  return value;
}

export function reviver(_key: string, value: unknown): unknown {
  if (
    typeof value === "object" &&
    value !== null &&
    "__bigint" in value &&
    typeof (value as Record<string, unknown>).__bigint === "string"
  ) {
    return BigInt((value as Record<string, string>).__bigint);
  }
  return value;
}

/**
 * BigInt-safe JSON.stringify
 */
export function stringify(value: unknown): string {
  return JSON.stringify(value, replacer);
}
