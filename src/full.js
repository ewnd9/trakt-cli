import _ from 'lodash';
import { formatEpisode as fmt, formatSeries } from 'show-episode-format';
import chalk from 'chalk';
import Configstore from 'configstore';
import hasha from 'hasha';
import ora from 'ora';
import moment from 'moment';

const WATCHED = 'WATCHED';
const AIRED = 'AIRED';
const UNAIRED = 'UNAIRED';

const conf = new Configstore('trakt-cli');
const print = console.log.bind(console);

export default (trakt, query, flags) => {
  const spinner = ora('Loading history');
  spinner.start();

  return trakt
    .getWatched('shows')
    .then(shows => {
      const result = [];
      let chain = Promise.resolve();

      shows.map((show, index) => {
        const imdb = show.show.ids.imdb;
        const slug = show.show.ids.slug;

        const key = 'showInfo.' + imdb;
        const showInfo = conf.get(key);

        const dataHash = hasha(JSON.stringify(show));

        chain = chain.then(() => {
          const fromCache = showInfo && showInfo.hash === dataHash;

          const dataPromise = (fromCache ?
            Promise.resolve(showInfo.report) :
            fetchShowInfo(show).then(report => {
              conf.set(key, {
                hash: dataHash,
                report: report
              });

              return report;
            })
          );

          return dataPromise
            .then(generateShowReport)
            .then(report => {
              result.push(report);
              spinner.text = `${index + 1} / ${shows.length} (${slug}) ${fromCache ? 'from-cache' : ''}`;
            });
        });

        return chain;
      });

      chain.then(() => {
        spinner.stop();
        printReport(_.groupBy(result, 'type'));
      });
    })
    .catch(err => print(err.stack));

  function generateShowReport({ show, status, fullSeasons, episodesSeasons, watchedEpisodes }) {
    const allEpisodes = flatEpisodes(episodesSeasons).map(ep => {
      ep.aired = ep.number <= fullSeasons.find(s => s.number == ep.season).aired_episodes;
      ep.watched = !!watchedEpisodes.find(_ep => _ep.season == ep.season && _ep.number == ep.number);

      return ep;
    });

    const groups = _.groupBy(allEpisodes, episode => {
      if (episode.watched) {
        return WATCHED;
      } else if (episode.aired) {
        return AIRED;
      } else {
        return UNAIRED;
      }
    });

    const groupsNames = Object.keys(groups);

    const result = {
      title: show.show.title,
      status: status,
      report: groups,
      fullSeasons: fullSeasons
    };

    if (groupsNames.length === 1 && groupsNames[0] === WATCHED) {
      result.type = WATCHED;
    } else if (groupsNames.indexOf(AIRED) > -1) {
      result.type = AIRED;
    } else {
      result.type = UNAIRED;
    }

    return result;
  };

  function flatEpisodes(seasons) {
    return _.flatten(seasons.map(s => s.episodes.map(ep => {
      ep.season = s.number;
      return ep;
    }))).filter(ep => ep.season > 0);
  };

  function fetchShowInfo(show) {
    const showSlug = show.show.ids.slug;

    const result = {
      show,
      watchedEpisodes: flatEpisodes(show.seasons)
    };

    return trakt.request(`/shows/${showSlug}?extended=full`)
      .then(show => {
        result.status = show.status;
        return trakt.request(`/shows/${showSlug}/seasons?extended=full`);
      })
      .then(fullSeasons => {
        result.fullSeasons = fullSeasons;
        return trakt.request(`/shows/${showSlug}/seasons?extended=episodes`);
      })
      .then(episodesSeasons => {
        result.episodesSeasons = episodesSeasons;
        return result;
      });
  };

  function printReport(report) {
    print();

    Object.keys(report).forEach(reportType => {
      const shows = report[reportType];

      print(chalk.underline(reportType.toLowerCase()) + '\n');

      if (reportType === WATCHED) {
        shows.forEach(show => {
          print(`${show.title} (${show.status})`);
        })
      } else {
        shows.forEach(show => {
          const fullSeasons = show.fullSeasons;

          const getSeason = number => fullSeasons.find(s => s.number === number);
          const isCompleteSeason = series => series.length === getSeason(series[0].season).episode_count;

          function f(series, showAirDate) {
            const withFirstEpisodeDate = str => {
              if (showAirDate && series[0].number === 1) {
                const date = moment(getSeason(series[0].season).first_aired);
                return str + ' ' + (date.isValid() ? date.format('MM.DD.YYYY') : 'TBA');
              } else {
                return str;
              }
            };

            if (series.length === 0) {
              return 'no episodes';
            } else if (series.length === 1) {
              return withFirstEpisodeDate(fmt(series[0]));
            } else if (isCompleteSeason(series)) {
              return withFirstEpisodeDate(`${series[0].season} season (${series.length} episodes)`);
            } else {
              return withFirstEpisodeDate(`${fmt(series[0])}-${fmt(series[series.length - 1])}`);
            }
          };

          print(`${show.title} (${show.status})`);

          const groups = show.report;
          const groupsNames = Object.keys(groups);

          print(groupsNames
            .map(groupName => {
              const series = formatSeries(groups[groupName]);
              const str = series.map(series => f(series, groupName === UNAIRED)).join(', ');

              if (groupName === WATCHED) {
                return str;
              } else if (groupName === AIRED) {
                return chalk.green(str);
              } else if (groupName === UNAIRED) {
                return chalk.red(str);
              }
            })
            .filter(_ => !!_)
            .join(', ')
          );
          print();
        });
      }
    })
  }
};
