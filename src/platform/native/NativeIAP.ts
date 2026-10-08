import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import type { IapProduct, IIAP } from '../IAP';

/** StoreKit 2 (iOS) / Play Billing (Android) via @capgo/native-purchases. */
export class NativeIAP implements IIAP {
  private list: IapProduct[] = [];

  async init(skus: readonly string[]): Promise<void> {
    try {
      const { products } = await NativePurchases.getProducts({ productIdentifiers: [...skus], productType: PURCHASE_TYPE.INAPP });
      this.list = products.map((p) => ({ sku: p.identifier, price: p.priceString }));
    } catch {
      this.list = [];
    }
  }

  products(): IapProduct[] {
    return this.list;
  }

  async purchase(sku: string, consumable: boolean): Promise<boolean> {
    try {
      const t = await NativePurchases.purchaseProduct({ productIdentifier: sku, productType: PURCHASE_TYPE.INAPP, quantity: 1, isConsumable: consumable });
      return !!t.transactionId;
    } catch {
      return false;
    }
  }

  async restore(): Promise<string[]> {
    try {
      await NativePurchases.restorePurchases();
      const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
      return purchases.map((p) => p.productIdentifier);
    } catch {
      return [];
    }
  }
}
