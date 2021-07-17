
import Core from './Core';
import * as JSONExp from './JSON';
import * as lang from './lang';
import Util from './Util';

// console.log(lang)

const JSON = {
    JSON: JSONExp.default
};

// console.log(Core.default)
export default {
    ...Util,
    ...JSON,
    ...JSONExp.Core,
    ...lang.default,
    ...lang.lCore,
    ...Core
}