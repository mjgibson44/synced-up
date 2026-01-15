import { Spectrum } from 'shared';

export const SPECTRUM_PAIRS: Spectrum[] = [
  // Food & Taste
  { id: 1, left: "Appetizing food", right: "Unappetizing food" },
  { id: 2, left: "Underrated cuisine", right: "Overrated cuisine" },
  { id: 3, left: "Breakfast food", right: "Dinner food" },
  { id: 4, left: "Healthy snack", right: "Unhealthy snack" },
  { id: 5, left: "Comfort food", right: "Fancy food" },

  // Entertainment
  { id: 6, left: "Underrated movie", right: "Overrated movie" },
  { id: 7, left: "Feel-good movie", right: "Depressing movie" },
  { id: 8, left: "Good first date movie", right: "Bad first date movie" },
  { id: 9, left: "Binge-worthy show", right: "One-episode-and-done show" },
  { id: 10, left: "Classic song", right: "Forgettable song" },

  // Life & Society
  { id: 11, left: "Necessary invention", right: "Unnecessary invention" },
  { id: 12, left: "Important life skill", right: "Useless life skill" },
  { id: 13, left: "Dream job", right: "Nightmare job" },
  { id: 14, left: "Relaxing activity", right: "Stressful activity" },
  { id: 15, left: "Worth waking up early for", right: "Not worth waking up early for" },

  // Abstract Concepts
  { id: 16, left: "Hot", right: "Cold" },
  { id: 17, left: "Soft", right: "Hard" },
  { id: 18, left: "Fast", right: "Slow" },
  { id: 19, left: "Loud", right: "Quiet" },
  { id: 20, left: "Simple", right: "Complex" },

  // Subjective Qualities
  { id: 21, left: "Cool animal", right: "Uncool animal" },
  { id: 22, left: "Romantic gesture", right: "Unromantic gesture" },
  { id: 23, left: "Good superpower", right: "Useless superpower" },
  { id: 24, left: "Acceptable lie", right: "Unacceptable lie" },
  { id: 25, left: "Impressive talent", right: "Unimpressive talent" },

  // Time & Age
  { id: 26, left: "Thing from the past", right: "Thing from the future" },
  { id: 27, left: "Thing for young people", right: "Thing for old people" },
  { id: 28, left: "Timeless", right: "Dated" },

  // Danger & Risk
  { id: 29, left: "Dangerous activity", right: "Safe activity" },
  { id: 30, left: "Worth the risk", right: "Not worth the risk" },

  // Social
  { id: 31, left: "Good conversation topic", right: "Awkward conversation topic" },
  { id: 32, left: "Impressive party trick", right: "Lame party trick" },
  { id: 33, left: "Good gift", right: "Bad gift" },
  { id: 34, left: "Good excuse", right: "Bad excuse" },

  // Weird & Normal
  { id: 35, left: "Normal thing to do", right: "Weird thing to do" },
  { id: 36, left: "Common fear", right: "Uncommon fear" },
  { id: 37, left: "Guilty pleasure", right: "Not a guilty pleasure" },
];

export function getRandomSpectrum(excludeIds?: Set<number>): Spectrum {
  const available = excludeIds
    ? SPECTRUM_PAIRS.filter((s) => !excludeIds.has(s.id))
    : SPECTRUM_PAIRS;

  if (available.length === 0) {
    // If all spectrums are used, just pick any random one
    const index = Math.floor(Math.random() * SPECTRUM_PAIRS.length);
    return SPECTRUM_PAIRS[index];
  }

  const index = Math.floor(Math.random() * available.length);
  return available[index];
}

export function getUniqueSpectrums(count: number): Spectrum[] {
  // Shuffle all spectrums and take the first 'count'
  const shuffled = [...SPECTRUM_PAIRS].sort(() => Math.random() - 0.5);

  // If we need more than available, repeat with a new shuffle
  const result: Spectrum[] = [];
  while (result.length < count) {
    const remaining = count - result.length;
    const batch = shuffled.slice(0, Math.min(remaining, shuffled.length));
    result.push(...batch);

    // Reshuffle for next batch if needed
    shuffled.sort(() => Math.random() - 0.5);
  }

  return result;
}
