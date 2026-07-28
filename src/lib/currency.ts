// Helper utility for global currency formatting based on Super Admin system settings

export type SystemCurrencySettings = {
  defaultCurrency: string;
  currencySymbol: string;
  decimalPlaces: number;
  symbolPosition: "before" | "after";
  decimalSeparator: "." | ",";
  thousandsSeparator: "," | "." | " ";
  showDecimals: boolean;
  addSpaceBetweenSymbol: boolean;
};

export const DEFAULT_CURRENCY_SETTINGS: SystemCurrencySettings = {
  defaultCurrency: "INR",
  currencySymbol: "₹",
  decimalPlaces: 2,
  symbolPosition: "before",
  decimalSeparator: ".",
  thousandsSeparator: ",",
  showDecimals: true,
  addSpaceBetweenSymbol: true,
};

export function formatSystemAmount(
  amount: number,
  customSettings?: Partial<SystemCurrencySettings>
): string {
  const cfg = { ...DEFAULT_CURRENCY_SETTINGS, ...customSettings };

  const num = Math.abs(amount);
  const decimals = cfg.showDecimals ? cfg.decimalPlaces : 0;
  
  // Format integer and fractional parts
  const fixed = num.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");

  // Apply thousands separator
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, cfg.thousandsSeparator);

  // Combine with decimal separator
  const formattedNum = decPart ? `${formattedInt}${cfg.decimalSeparator}${decPart}` : formattedInt;

  // Space logic
  const space = cfg.addSpaceBetweenSymbol ? " " : "";

  // Combine symbol position
  let result = "";
  if (cfg.symbolPosition === "before") {
    result = `${cfg.currencySymbol}${space}${formattedNum}`;
  } else {
    result = `${formattedNum}${space}${cfg.currencySymbol}`;
  }

  return amount < 0 ? `-${result}` : result;
}
