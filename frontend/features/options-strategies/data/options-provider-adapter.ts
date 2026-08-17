import type { OptionContract } from "../domain/types"

export type OptionsProviderResult =
  | { mode: "manual"; reason: string; contracts: OptionContract[] }
  | { mode: "live"; contracts: OptionContract[]; timestamp: string }

export function getOptionsProviderStatus(): OptionsProviderResult {
  return {
    mode: "manual",
    reason: "The current market-data adapter does not expose reliable NSE option-chain contracts, bid/ask quotes, timestamps or lot sizes.",
    contracts: [],
  }
}
