import { isBuying, isOwned, isToBuy } from './utils';

export function computeStats(blurays) {
  const byOwner = {
    Mathieu: 0,
    Quentin: 0,
    Commun: 0,
  };

  const stats = {
    total: blurays.length,
    owned: 0,
    watched: 0,
    unwatched: 0,
    toBuy: 0,
    buying: 0,
    threeD: 0,
    watchedPercent: 0,
    buyPercent: 0,
    byOwner,
  };

  for (const bluray of blurays) {
    const owner = bluray.owner || 'Commun';
    if (byOwner[owner] !== undefined) {
      byOwner[owner] += 1;
    }

    if (isOwned(bluray)) {
      stats.owned += 1;
      if (bluray.watched === true) {
        stats.watched += 1;
      } else {
        stats.unwatched += 1;
      }
      if (bluray.is3D === true) {
        stats.threeD += 1;
      }
    }

    if (isToBuy(bluray)) {
      stats.toBuy += 1;
    }

    if (isBuying(bluray)) {
      stats.buying += 1;
    }
  }

  stats.watchedPercent = stats.owned ? Math.round((stats.watched / stats.owned) * 100) : 0;
  stats.buyPercent = stats.total ? Math.round((stats.toBuy / stats.total) * 100) : 0;
  return stats;
}
