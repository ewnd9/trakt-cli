import _ from 'lodash';
import Configstore from 'configstore';
import ora from 'ora';
import hasha from 'hasha';

import printReport from './utils/print-shows';

const conf = new Configstore('trakt-cli');
const print = console.log.bind(console);

// I still can't replace `report` task because air dates available only in the calendar endpoint
export default trakt => {
  const spinner = ora('Loading history');
  spinner.start();

  const onUpdate = (show, hasChanged, index, length) => {
    const slug = show.ids.slug;
    spinner.text = `${index + 1} / ${length} (${slug}) ${hasChanged ? 'from-cache' : ''}`;
  };

  const getKey = stat => `show.${stat.show.ids.imdb}`;

  const getCache = (stat, hash) => {
    const key = getKey(stat);
    const showInfo = conf.get(key);

    if (showInfo && showInfo.hash === hash) {
      return Promise.resolve(showInfo.data);
    } else {
      return Promise.reject(null);
    }
  };

  const setCache = (stat, hash, data) => {
    conf.set(getKey(stat), {
      hash,
      data: data
    });

    return Promise.resolve();
  };

  const hashFunction = obj => hasha(JSON.stringify(obj));

  return trakt
    .getCompleteShows(hashFunction, getCache, setCache, onUpdate)
    .then(shows => {
      spinner.stop();
      printReport(shows);
    })
    .catch(err => print(err.stack));
};
