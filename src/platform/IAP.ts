/** In-app purchases. Web uses a mock store; native uses StoreKit 2 / Play Billing. */
export interface IapProduct {
  sku: string;
  /** Localised price from the store (falls back to USD in the catalog). */
  price: string;
}

export interface IIAP {
  init(skus: readonly string[]): Promise<void>;
  products(): IapProduct[];
  /** Resolves true when the purchase completed. */
  purchase(sku: string, consumable: boolean, label: string): Promise<boolean>;
  /** SKUs of non-consumables the store says the player owns. */
  restore(): Promise<string[]>;
}
