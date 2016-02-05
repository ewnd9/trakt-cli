import inquirer from 'inquirer-bluebird';
import { formatEpisode as fmt } from 'show-episode-format';

export default (trakt, query) => {
  let show;
  let seasons;

  return inquirer.prompt({
    type: 'list',
    name: 'type',
    message: 'type',
    choices: ['show', 'movie']
  })
  .then(data => trakt.search(query, data.type))
  .then(data => inquirer.prompt({
    type: 'list',
    name: 'result',
    message: 'select',
    choices: data.map(_ => ({ name: `${_.show.title} (${_.show.year})`, value: _.show }))
  }))
  .then(data => {
    show = data.result;
    return trakt.request(`/shows/${show.ids.imdb}/seasons?extended=episodes`);
  })
  .then(data => {
    seasons = data.reverse();
    seasons.forEach(data => {
      const eps = data.episodes;

      const ep0 = eps[0];
      const ep1 = eps[eps.length - 1];

      const epsInterval = `${fmt(ep0)}-${fmt(ep1)}`;
      console.log(`${show.title} ${epsInterval}`); // no dates in trakt api :-(
    });
  });
};
