export * from './bank-adapter.interface';
export * from './icici-cib.adapter';
export * from './hdfc-enet.adapter';
export * from './sbi-cmp.adapter';

import { BankPayoutAdapter } from './bank-adapter.interface';
import { IciciCibAdapter } from './icici-cib.adapter';
import { HdfcEnetAdapter } from './hdfc-enet.adapter';
import { SbiCmpAdapter } from './sbi-cmp.adapter';

const adapters: Record<string, BankPayoutAdapter> = {
  ICICI: new IciciCibAdapter(),
  HDFC: new HdfcEnetAdapter(),
  SBI: new SbiCmpAdapter(),
};

export function getBankAdapter(bankCode: string): BankPayoutAdapter {
  const normalized = (bankCode || '').trim().toUpperCase();
  const adapter = adapters[normalized];
  if (!adapter) {
    throw new Error(`Unsupported bank code "${bankCode}". Supported bank adapters: ${Object.keys(adapters).join(', ')}`);
  }
  return adapter;
}

export function getSupportedBanks() {
  return Object.values(adapters).map((a) => ({
    bankCode: a.bankCode,
    bankName: a.bankName,
    formatType: a.formatType,
    fileExtension: a.fileExtension,
  }));
}
