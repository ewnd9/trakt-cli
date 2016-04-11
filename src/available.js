import { formatEpisodeRelease as fmt } from 'show-episode-format';

export default (trakt, query, flags) => {
  return trakt
    .getReport()
    .then(report => {
      const data = report[0].reduce((result, curr) => {
        curr.report.aired.forEach(ep => {
          result.push(`${curr.show} ${fmt(ep.episode)}`);
        });
        return result;
      }, []);

      console.log(flags.json ? JSON.stringify(data) : data.join('\n'));
    });
};
