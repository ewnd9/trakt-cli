import { formatEpisode as fmt, formatSeries } from 'show-episode-format';
import moment from 'moment';
import chalk from 'chalk';

export default (trakt, query, flags) => {
  return trakt
    .getReport(60)
    .then(report => report.filter(_ => _.length > 0).forEach(printGroup))
    .then(() => console.log());

  function printGroup(group) {
    console.log();
    group.forEach(printShows);
  };

  function printShows({ show, report }) {
    const titles = [];

    if (report.aired.length > 0) {
      titles.push(`${formatInterval(report.aired)} available`);
    }

    const now = new Date();

    if (report.future.length > 0) {
      report.future.forEach(report => {
        const length = report.episodes.length;
        const date = moment(report.episodes[0].first_aired);
        const day = date.format('ddd');

        const awaiting = (
          report.gap === 0 ?
            `${date.diff(now, 'hours')} hours (${day})` :
            `${report.gap + 1} days (${day})`
        );

        if (length === 1) {
          titles.push(`${fmt(report.episodes[0].episode)} in ${awaiting}`)
        } else {
          titles.push(`${formatInterval(report.episodes)} every week in ${awaiting}`);
        }
      });
    }

    console.log(chalk.underline(show), titles.join(', '));
  };

  function formatInterval(data) {
    const episodes = data.map(_ => _.episode);
    return formatSeries(episodes).map(group => {
      return group.length === 1 ? fmt(group[0]) : `${fmt(group[0])}-${fmt(group[group.length - 1])}`;
    }).join(', ');
  };
};
