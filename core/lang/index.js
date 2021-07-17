import * as lArray from './Array';
import String from './String';
import * as lFunction from './Function';
import Date from './Date';
import * as lObject from './Object';


let lCore = {
    ...lArray.lCore,

    // ...lNumber.lCore,
    ...lObject.lCore,
    ...lFunction.lCore
};

export { lCore }

export default {
    Array: lArray.default,
    Object: lObject.default,
    String,
    // Number: lNumber,
    Date,
    Function: lFunction.default
}
