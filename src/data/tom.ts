/** Old Tom's dialogue: grumpy, funny, one eye on your satchel. */
export const TOM_LINES = {
  greet: [
    "Back again? Wipe your paws, this is a respectable crate.",
    "Ah, the calico menace. What'd you drag in today?",
    'One eye, zero patience. Show me the goods.',
    "If it's another bottle cap I'm retiring.",
    "Duke still chasing you? Good. Keeps you lean.",
    'Prices are fair. Fair for me, mostly.',
    "Don't touch the fish. The fish is decor.",
    'Every day is market day if you squint hard enough. I only squint with one.',
  ],
  sell: [
    'Fine. FINE. Take your coins.',
    'Pleasure doing business. Mostly mine.',
    "I'll find a sucker for this. Er, a collector.",
    "Smells like Duke's yard. Adds character.",
    'Into the crate it goes.',
  ],
  sellAll: [
    "Whole satchel? You trying to bankrupt me?",
    'Look at it go. Like water down a drain pipe.',
    "That's the most coins I've counted since Tuesday. Big Tuesday.",
  ],
  hot: [
    "Today's hot stuff is on the board. Don't say I never tell you anything.",
    'Socks are moving fast today. Nobody asks why.',
    'Check the board, kid. Today pays.',
  ],
  cold: ["Cold items stay cold. Hold 'em if you're smart.", "Nobody wants that today. Maybe tomorrow. Maybe never."],
  haggleGood: ['Ugh. Your paws are too quick. Deal.', 'You drive a hard bargain for a cat with a sausage problem.', 'Alright, alright! Robbery, but alright.'],
  haggleBad: ["Ha! Nice try. That's the price.", "You call that haggling? I've seen pigeons do better."],
  empty: ["Empty satchel? Then why's your tail twitching?", 'Come back when you have something shiny.'],
  secret: ["Psst. Under the crate. Don't tell the dogs.", 'Secret stock. Rotates every eight hours, like my moods.', 'Rare stuff. Rare prices. You get it.'],
  set: ["A full set? Now THAT I can use. Here's something special.", 'Complete collection. My one eye is watering.'],
  broke: ["Can't afford it? Run faster.", 'Coins first, dreams second.'],
} as const;
