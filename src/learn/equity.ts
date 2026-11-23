import { evaluateCardsFast } from '../../server/gtoRanges';

export function simulate(hero: number[], board: number[], opponents: number) {
  const known = new Set([...hero, ...board]);
  const deck = Array.from({length: 52}, (_, i) => i).filter(id => !known.has(id));
  const hand = new Int32Array(7);
  hand.set(board, 2);
  const missing = 5 - board.length;
  const samples = 10000;
  let wins = 0, ties = 0;
  for (let sample = 0; sample < samples; sample++) {
    for (let i = 0; i < missing + 2 * opponents; i++) {
      const j = i + Math.floor(Math.random() * (deck.length - i));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    for (let i = 0; i < missing; i++) hand[2 + board.length + i] = deck[i];
    hand.set(hero);
    const score = evaluateCardsFast(hand, 7);
    let best = -1;
    for (let p = 0; p < opponents; p++) {
      hand[0] = deck[missing + 2 * p];
      hand[1] = deck[missing + 2 * p + 1];
      best = Math.max(best, evaluateCardsFast(hand, 7));
    }
    if (score > best) wins++;
    if (score === best) ties++;
  }
  return [wins, ties, samples - wins - ties].map(count => (100 * count / samples).toFixed(1));
}
