import chalk from 'chalk';
import moment from 'moment';

import { groupBy } from 'lodash';
import { formatEpisode as fmt, formatSeries } from 'show-episode-format';
import { WATCHED, AIRED, UNAIRED } from 'trakt-utils/dist/shows/fetch-shows';
import groupEpisodes from './group-episodes';

const print = console.log.bind(console);

export default function printReport(shows) {
  const report = groupBy(shows.map(generateShowReport), 'type');

  print();

  [AIRED, UNAIRED, WATCHED]
    .forEach(reportType => {
      const shows = report[reportType];

      if (!shows) {
        return;
      }

      print(chalk.underline(reportType.toLowerCase()) + '\n');

      if (reportType === WATCHED) {
        shows.forEach(show => print(`${show.title} (${show.status})`));
        print();
      } else {
        shows.forEach(show => printShow(show));
      }
    });
}

function printShow(show) {
  const getSeason = number => show.seasons.find(s => s.number === number);
  const isCompleteSeason = series => series.length === getSeason(series[0].season).episodesCount;

  function f(series, showAirDate) {
    const withFirstEpisodeDate = str => {
      if (showAirDate && series[0].number === 1) {
        const date = moment(getSeason(series[0].season).firstAired);
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
  }

  print(`${show.title} (${show.status})`);

  const groups = show.report;

  const formatted = Object
    .keys(groups)
    .map(groupName => {
      const group = groups[groupName];

      if (!group) {
        return;
      }

      const series = formatSeries(group);
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
    .join(', ');

  print(formatted);
  print();
}

function generateShowReport(show) {
  const groups = groupEpisodes(show.episodes);
  show.report = groups;

  const groupsNames = Object.keys(groups);

  if (groupsNames.length === 1 && groupsNames[0] === WATCHED) {
    show.type = WATCHED;
  } else if (groupsNames.indexOf(AIRED) > -1) {
    show.type = AIRED;
  } else {
    show.type = UNAIRED;
  }

  return show;
};
