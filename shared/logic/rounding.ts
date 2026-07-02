export interface MemberWithIncome {
  id: string;
  income: number;
}

export interface RoundedShare {
  id: string;
  share: number; // 0.00 to 1.00
  percentage: number; // 0.00 to 100.00
}

// Internal weight precision: weights (income, precise shares) are scaled to
// integers before allocation so the largest-remainder math is exact integer
// arithmetic (no float drift). 1e9 covers money cents and sub-unit shares.
const WEIGHT_SCALE = 1_000_000_000n;

/**
 * Number of decimal places implied by a power-of-ten quantum.
 * 0.1 -> 1, 0.01 -> 2.
 */
function quantumDecimals(scale: number): number {
  return String(scale).length - 1;
}

/**
 * Shared largest-remainder (Hamilton) allocator.
 *
 * Distributes `total` across members in proportion to `weights`, snapped to a
 * `quantum` grid, so the returned values sum to EXACTLY `total` (no leak).
 *
 * Allocation runs on scaled integers — never floats — because 0.1 / 0.01 are
 * not float-representable and float math breaks the exact-sum invariant.
 *
 * Algorithm:
 *   raw_i   = weight_i / Σweights × total
 *   floor each to quantum
 *   deficit = (total − Σfloored) / quantum   (integer increment count)
 *   sort by fractional part (raw − floored) descending
 *   add one quantum to the top `deficit` members
 *
 * Tiebreak (equal fractional parts, e.g. equal weights): highest raw weight
 * wins; final fallback = `tiebreak[i]` ascending, else stable member order.
 *
 * @param weights  per-member non-negative weights (income, precise share, …)
 * @param total    grid total to distribute (100 for %, budget for money)
 * @param quantum  grid step (0.1 for 1dp %, 0.01 for cents)
 * @param tiebreak optional parallel stable-order keys (id / createdAt)
 */
export function largestRemainderAllocate(
  weights: number[],
  total: number,
  quantum: number,
  tiebreak?: readonly (string | number)[],
): number[] {
  const n = weights.length;
  if (n === 0) return [];

  const scale = Math.round(1 / quantum);
  const totalUnits = Math.round(total * scale);

  // Scale weights to integers. Callers guarantee total weight > 0; if every
  // weight is 0 we fall back to an equal split so the invariant still holds.
  let wInt = weights.map((w) =>
    BigInt(Math.round(Math.max(0, w) * Number(WEIGHT_SCALE))),
  );
  let sumW = wInt.reduce((a, b) => a + b, 0n);
  if (sumW === 0n) {
    wInt = weights.map(() => 1n);
    sumW = BigInt(n);
  }

  const totalUnitsBig = BigInt(totalUnits);

  const floored = new Array<number>(n);
  const remainder = new Array<bigint>(n);
  let allocated = 0;
  for (let i = 0; i < n; i++) {
    const product = wInt[i] * totalUnitsBig;
    const q = product / sumW; // integer division → floored units
    floored[i] = Number(q);
    remainder[i] = product % sumW; // exact integer fractional part
    allocated += floored[i];
  }

  const deficit = totalUnits - allocated;

  if (deficit > 0) {
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => {
      // 1) larger remainder first
      if (remainder[a] !== remainder[b])
        return remainder[a] > remainder[b] ? -1 : 1;
      // 2) higher raw weight first
      if (wInt[a] !== wInt[b]) return wInt[a] > wInt[b] ? -1 : 1;
      // 3) stable: explicit tiebreak key, else original order
      if (tiebreak) {
        const ka = tiebreak[a];
        const kb = tiebreak[b];
        if (ka < kb) return -1;
        if (ka > kb) return 1;
      }
      return a - b;
    });
    for (let k = 0; k < deficit; k++) {
      floored[order[k]] += 1;
    }
  }

  const decimals = quantumDecimals(scale);
  return floored.map((units) => Number((units / scale).toFixed(decimals)));
}

/**
 * Calculates proportional money `share` (0..1) and display `percentage` (0..100).
 *
 * Two independent passes (see docs/design/allocation-rounding.md, issue #128):
 *
 *  - `share` (2dp, sums to 1.00): integer-cent floor with the rounding deficit
 *    absorbed by the highest earner (first one if tied). This drives quota math
 *    downstream, so its absorption rule is kept stable.
 *  - `percentage` (1dp, sums to EXACTLY 100.0): routed through the shared
 *    largest-remainder allocator (weights = income, total = 100, quantum = 0.1,
 *    tiebreak = member id). The leftover 0.1 goes to the largest *remainder*
 *    (which may or may not be the highest earner), making the displayed
 *    percentages deterministic and always summed to 100.0.
 *
 * All arithmetic is integer-scaled — no float rounding scars.
 */
export function calculateRoundedShares(
  members: MemberWithIncome[],
): RoundedShare[] {
  if (members.length === 0) return [];

  const count = members.length;
  const totalIncome = members.reduce((sum, m) => sum + m.income, 0);

  // share is in cents (sum 100).
  const shareUnits = new Array<number>(count);
  let absorbIndex = 0;

  if (totalIncome === 0) {
    // Equal split; first member absorbs the deficit.
    const baseShare = Math.floor(100 / count);
    for (let i = 0; i < count; i++) {
      shareUnits[i] = baseShare;
    }
  } else {
    let maxIncome = -1;
    for (let i = 0; i < count; i++) {
      const income = members[i].income;
      if (income > maxIncome) {
        maxIncome = income;
        absorbIndex = i;
      }
      shareUnits[i] = Math.floor((income * 100) / totalIncome);
    }
  }

  shareUnits[absorbIndex] += 100 - shareUnits.reduce((a, b) => a + b, 0);

  // Percentage: 1dp, deterministic, exact-sum-to-100.0 via largest remainder.
  const percentages = largestRemainderAllocate(
    members.map((m) => m.income),
    100,
    0.1,
    members.map((m) => m.id),
  );

  return members.map((m, i) => ({
    id: m.id,
    share: Number((shareUnits[i] / 100).toFixed(2)),
    percentage: percentages[i],
  }));
}
