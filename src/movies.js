import moment from 'moment';
import { orderBy } from 'lodash';
import { green } from 'chalk';
import { formatMoment } from './utils/format-date';

const print = console.log.bind(console);

export default (trakt, query, { limit = 10 }) => {
  return trakt
    .getWatched('movies')
    .then(stats => {
      const ordered = orderBy(stats, ['last_watched_at'], ['desc']);

      print();
      ordered
        .slice(0, limit)
        .forEach(({ movie, last_watched_at }) => {
          const date = moment(last_watched_at);

          print(`${green(movie.title)} (${movie.year})`);
          print(`${formatMoment(date)} (${date.fromNow()})`);
          print(`http://imdb.com/title/${movie.ids.imdb}`);
          print();
        });

      print(`total count: ${ordered.length}`);
      print();
    });
};
