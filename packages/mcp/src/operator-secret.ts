// Shared operator-secret gate for state-changing actions (approve / reject /
// execute). The MCP bearer key lets a caller reach the MCP at all; this second
// factor additionally authorizes mutations. Used by both the operator-gated MCP
// tools and the web Ops server actions. SDK-free so it bundles into either build.

import { timingSafeEqual } from "node:crypto";

// Constant-time compare against process.env.OPERATOR_SECRET. Fails closed when
// the secret is unset or the provided value is missing/empty.
export const assertOperatorSecret = (provided: string | null | undefined): boolean => {
  const expected = process.env.OPERATOR_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};
