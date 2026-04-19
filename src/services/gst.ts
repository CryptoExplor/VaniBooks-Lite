// All calculations use BigInt paise to avoid floating point errors.

export function rupeesToPaise(rupees: number): bigint {
  return BigInt(Math.round(rupees * 100));
}

export function paiseToRupees(paise: bigint): string {
  const whole = paise / 100n;
  const frac = paise % 100n;
  return `₹${whole}.${String(frac).padStart(2, "0")}`;
}

export function calculateGst(amountPaise: bigint, ratePct: number): bigint {
  // ratePct is integer e.g. 18
  return (amountPaise * BigInt(ratePct)) / 100n;
}

export function totalWithGst(amountPaise: bigint, ratePct: number): bigint {
  return amountPaise + calculateGst(amountPaise, ratePct);
}
