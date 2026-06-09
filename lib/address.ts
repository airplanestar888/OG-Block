export function shortAddress(address: string | null | undefined) {
  if (!address) return null;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
