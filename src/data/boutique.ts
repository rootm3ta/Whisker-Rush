import type { ProductId } from './monetization';
import type { Reward } from './economy';

/**
 * Pearl's Treat Boutique (the shop). Pearl is a fluffy white Persian with a pearl necklace and a
 * tiny brass cash register. All copy is original; never use emoji.
 */
export const BOUTIQUE = {
  title: "Pearl's Treat Boutique",
  palette: { cream: '#fff7ec', blush: '#f6c9c4', blushDeep: '#e89a96', gold: '#d9a441', goldDeep: '#a87a22', ink: '#2a201c', rose: '#c25a6a' },
  /** Pearl's rotating lines while you browse. */
  idleLines: [
    'Welcome, darling. Mind the whiskers.',
    'Everything here is hand-picked. By me. With great taste.',
    'Fish Bones? I keep them polished.',
    'Oh, do come in. The tuna-scented candles are not for sale.',
    'A cat of your calibre deserves nice things.',
    'I once sold a hat to a duchess. Well, her cat.',
    'Browse as long as you like. I adore an audience.',
    'That Duke fellow is banned from the boutique. Permanently.',
    'Pearls before swine? Never. Pearls before cats? Always.',
    'Do try the Coin Doubler. It is simply decadent.',
    'Take your time. I shall groom in the meanwhile.',
    'Fresh stock every week. I insist on it.',
    'My register is brass. Real brass. I checked.',
    'Is that a new outfit? Very daring. I approve.',
    'You run, I curate. A perfect partnership.',
    'I do not do discounts, darling. I do good value.',
    'Old Tom sells junk. Charming junk, but junk.',
    'Every purchase supports a very small, very fluffy business.',
    'Psst. The bigger crates are better value. Just saying.',
    'Shhh. Do not tell the dogs about the tip jar.',
    'A little treat for a long run. You have earned it.',
    'My grandmother ran this shop. She was also fabulous.',
  ],
  /** Reactions. */
  browseLines: ['Ooh, good eye.', 'That one is a favourite.', 'Exquisite choice.', 'Mmm, very you.', 'Tempting, is it not?'],
  buyLines: ['Cha-ching! Splendid!', 'Marvellous! Wear it well.', 'Sold, to the cat with impeccable taste!', 'Wonderful! Come back soon, darling.'],
  cancelLines: ['No rush, darling. It will wait for you.', 'Changed your mind? Very wise to think it over.', 'Perfectly fine. Window shopping is an art.'],
  failLines: ['Oh dear, the till hiccupped. Nothing was charged.', 'The store did not answer, darling. Try again in a moment.'],
  giftLines: ['A little something, on the house.', 'For my favourite customer. Do not tell the others.', 'Free gifts keep the fur glossy.'],
  /** Seconds between idle lines. */
  lineEverySec: 7,
  /** Daily free gift: cycles by local day. The ad gift is a smaller second one. */
  dailyGifts: [{ coins: 250 }, { fishBones: 2 }, { roomba: 1 }, { coins: 400 }, { zoomies: 1 }, { fishBones: 3 }, { crate: 1 }] as Reward[],
  adGift: { coins: 150 } as Reward,
  /** Fish Bones grid (S tier is no longer sold). */
  fishTiers: [
    { id: 'fishM', art: 'pouch', bonus: '+12%', ribbon: 'Most popular' },
    { id: 'fishL', art: 'bucket', bonus: '+25%', ribbon: '' },
    { id: 'fishXL', art: 'crate', bonus: '+37%', ribbon: 'Best value' },
  ] as { id: ProductId; art: 'pouch' | 'bucket' | 'crate'; bonus: string; ribbon: string }[],
  /**
   * Genuine reference prices for a strike-through. Only set when the same contents are sold
   * separately for that much; none are today, so no fake "was" prices appear.
   */
  wasUsd: {} as Partial<Record<ProductId, number>>,
  /** Bundles in the carousel (the weekly one is also the hero when the Starter Pack is gone). */
  carousel: ['bundleNoir', 'bundleSushi'] as ProductId[],
} as const;
