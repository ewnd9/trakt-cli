import moment from 'moment';

export const formatMoment = date => date.format('MM.DD.YYYY');
export const format = date => formatMoment(moment(date));
