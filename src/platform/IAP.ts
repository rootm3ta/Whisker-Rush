/** In-app purchases. Web uses a mock store; native uses StoreKit 2 / Play Billing. */
export interface IapProduct {
  sku: string;
  /** Localised price from the store (falls back to USD in the catalog). */
  price: string;
}

export type PurchaseResult = 'ok' | 'cancelled' | 'failed';

export interface IIAP {
  init(skus: readonly string[]): Promise<void>;
  products(): IapProduct[];
  /** Completed, cancelled by the player, or failed (network, store error). Never throws. */
  purchase(sku: string, consumable: boolean, label: string): Promise<PurchaseResult>;
  /** SKUs of non-consumables the store says the player owns. */
  restore(): Promise<string[]>;
}
