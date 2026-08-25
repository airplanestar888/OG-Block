import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Bulk read helpers for display paths.
 *
 * Two silent failure modes bite whale wallets here:
 *   - Supabase caps any select at 1000 rows unless paginated.
 *   - PostgREST .in() filters die at fetch level past a few hundred values,
 *     returning data=null with an error the call site must not ignore.
 * All holdings/registry reads outside the scoring engine go through these.
 */

export type HoldingRow = {
  contract_address: string;
  token_id: string;
  metadata_json: unknown;
};

const ROW_PAGE_SIZE = 1000;

/** Every nft_holdings row of a user, newest first, past the 1000-row cap. */
export async function fetchAllUserHoldings(
  userId: string,
  columns = "contract_address,token_id,metadata_json"
): Promise<HoldingRow[]> {
  const supabase = getSupabaseAdmin();
  const all: HoldingRow[] = [];
  for (let offset = 0; ; offset += ROW_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("nft_holdings")
      .select(columns)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + ROW_PAGE_SIZE - 1);
    if (error) throw error;
    const rows = ((data || []) as unknown) as HoldingRow[];
    all.push(...rows);
    if (rows.length < ROW_PAGE_SIZE) break;
  }
  return all;
}
