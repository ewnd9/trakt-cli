import { WATCHED, AIRED, UNAIRED } from 'trakt-utils/dist/shows/fetch-shows';
import { groupBy } from 'lodash';

export default episodes => groupBy(episodes, episode => {
  if (episode.watched) {
    return WATCHED;
  } else if (episode.aired) {
    return AIRED;
  } else {
    return UNAIRED;
  }
});
