import Core from "../Core";
var arrayPrototype = Array.prototype,
    slice = arrayPrototype.slice,

    supportsSliceOnNodeList = true;

let lArray = {
    stableSort(array, userComparator) {
        var len = array.length,
            indices = new Array(len),
            i;

        // generate 0-n index map from original array
        for (i = 0; i < len; i++) {
            indices[i] = i;
        }

        // Sort indices array using a comparator which compares the original values at the two indices, and uses those indices as a tiebreaker
        indices.sort(function (index1, index2) {
            return userComparator(array[index1], array[index2]) || (index1 - index2);
        });

        // Reconsitute a sorted array using the array that the indices have been sorted into
        for (i = 0; i < len; i++) {
            indices[i] = array[indices[i]];
        }

        // Rebuild the original array
        for (i = 0; i < len; i++) {
            array[i] = indices[i];
        }

        return array;
    },
    lexicalCompare(lhs, rhs) {
        lhs = String(lhs);
        rhs = String(rhs);
        return (lhs < rhs) ? -1 : ((lhs > rhs) ? 1 : 0);
    },
    erase(array, index, removeCount) {
        array.splice(index, removeCount);
        return array;
    },
    replace(array, index, removeCount, insert) {
        if (insert && insert.length) {
            // Inserting at index zero with no removing: use unshift
            if (index === 0 && !removeCount) {
                array.unshift.apply(array, insert);
            }
            // Inserting/replacing in middle of array
            else if (index < array.length) {
                array.splice.apply(array, [index, removeCount].concat(insert));
            }
            // Appending to array
            else {
                array.push.apply(array, insert);
            }
        } else {
            array.splice(index, removeCount);
        }
        return array;
    },
    splice(array, ...params) {
        return array.splice.apply(array, slice.call(arguments, 1));
    },
    each(array, fn, scope, reverse) {
        array = this.from(array);
        var i,
            ln = array.length;

        if (reverse !== true) {
            for (i = 0; i < ln; i++) {
                if (fn.call(scope || array[i], array[i], i, array) === false) {
                    return i;
                }
            }
        }
        else {
            for (i = ln - 1; i > -1; i--) {
                if (fn.call(scope || array[i], array[i], i, array) === false) {
                    return i;
                }
            }
        }

        return true;
    },
    forEach(array, fn, scope) {
        return array.forEach(fn, scope);
    },
    from(value, newReference) {
        if (value === undefined || value === null) {
            return [];
        }

        if (Core.isArray(value)) {
            return (newReference) ? slice.call(value) : value;
        }

        var type = typeof value;
        // Both strings and functions will have a length property. In phantomJS, NodeList
        // instances report typeof=='function' but don't have an apply method...
        if (value && value.length !== undefined && type !== 'string' && (type !== 'function' || !value.apply)) {
            return this.toArray(value);
        }

        return [value];
    },
    toArray(iterable, start, end) {
        if (!iterable || !iterable.length) {
            return [];
        }

        if (typeof iterable === 'string') {
            iterable = iterable.split('');
        }

        if (supportsSliceOnNodeList) {
            return slice.call(iterable, start || 0, end || iterable.length);
        }

        var array = [],
            i;

        start = start || 0;
        end = end ? ((end < 0) ? iterable.length + end : end) : iterable.length;

        for (i = start; i < end; i++) {
            array.push(iterable[i]);
        }

        return array;
    },
    indexOf(array, item, from) {
        return arrayPrototype.indexOf.call(array, item, from);
    },
    contains(array, item) {
        return arrayPrototype.indexOf.call(array, item) !== -1;
    },
    pluck(array, propertyName) {
        var ret = [],
            i, ln, item;
        for (i = 0, ln = array.length; i < ln; i++) {
            item = array[i];
            ret.push(item[propertyName]);
        }
        return ret;
    },
    map(array, fn, scope) {

        return array.map(fn, scope);
    },
    every(array, fn, scope) {
        return array.every(fn, scope);
    },
    some(array, fn, scope) {
        return array.some(fn, scope);
    },
    equals(array1, array2) {
        var len1 = array1.length,
            len2 = array2.length,
            i;

        // Short circuit if the same array is passed twice
        if (array1 === array2) {
            return true;
        }

        if (len1 !== len2) {
            return false;
        }

        for (i = 0; i < len1; ++i) {
            if (array1[i] !== array2[i]) {
                return false;
            }
        }

        return true;
    },
    clean(array) {
        var results = [],
            i = 0,
            ln = array.length,
            item;

        for (; i < ln; i++) {
            item = array[i];

            if (!Core.isEmpty(item)) {
                results.push(item);
            }
        }

        return results;
    },
    unique(array) {
        var clone = [],
            i = 0,
            ln = array.length,
            item;

        for (; i < ln; i++) {
            item = array[i];

            if (this.indexOf(clone, item) === -1) {
                clone.push(item);
            }
        }

        return clone;
    },
    filter(array, fn, scope) {
        return array.filter(fn, scope);
    },
    findBy(array, fn, scope) {
        var i = 0,
            len = array.length;

        for (; i < len; i++) {
            if (fn.call(scope || array, array[i], i)) {
                return array[i];
            }
        }
        return null;
    },
    remove(array, item) {
        var index = this.indexOf(array, item);

        if (index !== -1) {
            this.erase(array, index, 1);
        }

        return array;
    },
    removeAt(array, index, count) {
        var len = array.length;
        if (index >= 0 && index < len) {
            count = count || 1;
            count = Math.min(count, len - index);
            this.erase(array, index, count);
        }
        return array;
    },
    include(array, item) {
        if (!this.contains(array, item)) {
            array.push(item);
        }
    },
    clone(array) {
        return slice.call(array);
    },
    merge(...params) {
        var args = slice.call(arguments),
            array = [],
            i, ln;

        for (i = 0, ln = args.length; i < ln; i++) {
            array = array.concat(args[i]);
        }
        return this.unique(array);
    },
    union(...params) {
        var args = slice.call(arguments),
            array = [],
            i, ln;

        for (i = 0, ln = args.length; i < ln; i++) {
            array = array.concat(args[i]);
        }
        return this.unique(array);
    },
    difference(arrayA, arrayB) {
        var clone = slice.call(arrayA),
            ln = clone.length,
            i, j, lnB;

        for (i = 0, lnB = arrayB.length; i < lnB; i++) {
            for (j = 0; j < ln; j++) {
                if (clone[j] === arrayB[i]) {
                    this.erase(clone, j, 1);
                    j--;
                    ln--;
                }
            }
        }

        return clone;
    },
    slice(array, begin, end) {
        return slice.call(array, begin, end);
    },
    sort(array, sortFn) {
        return this.stableSort(array, sortFn || this.lexicalCompare);
    },
    min(array, comparisonFn) {
        var min = array[0],
            i, ln, item;

        for (i = 0, ln = array.length; i < ln; i++) {
            item = array[i];

            if (comparisonFn) {
                if (comparisonFn(min, item) === 1) {
                    min = item;
                }
            }
            else {
                if (item < min) {
                    min = item;
                }
            }
        }

        return min;
    },
    max(array, comparisonFn) {
        var max = array[0],
            i, ln, item;

        for (i = 0, ln = array.length; i < ln; i++) {
            item = array[i];

            if (comparisonFn) {
                if (comparisonFn(max, item) === -1) {
                    max = item;
                }
            }
            else {
                if (item > max) {
                    max = item;
                }
            }
        }

        return max;
    },
    flatten: function (array) {
        var worker = [];

        function rFlatten(a) {
            var i, ln, v;

            for (i = 0, ln = a.length; i < ln; i++) {
                v = a[i];

                if (Core.isArray(v)) {
                    rFlatten(v);
                } else {
                    worker.push(v);
                }
            }

            return worker;
        }

        return rFlatten(array);
    },

    mean(array) {
        return array.length > 0 ? this.sum(array) / array.length : undefined;
    },
    sum(array) {
        var sum = 0,
            i, ln, item;
        for (i = 0, ln = array.length; i < ln; i++) {
            item = array[i];

            sum += item;
        }
        return sum;
    },
    insert(array, index, items) {
        return this.replace(array, index, 0, items);
    },
    move(array, fromIdx, toIdx) {
        if (toIdx === fromIdx) {
            return;
        }
        var item = array[fromIdx],
            incr = toIdx > fromIdx ? 1 : -1,
            i;

        for (i = fromIdx; i != toIdx; i += incr) {
            array[i] = array[i + incr];
        }
        array[toIdx] = item;
    },
    push: function (target, ...params) {
        var len = arguments.length,
            i = 1,
            newItem;

        if (target === undefined) {
            target = [];
        } else if (!Core.isArray(target)) {
            target = [target];
        }
        for (; i < len; i++) {
            newItem = arguments[i];
            Array.prototype.push[Core.isIterable(newItem) ? 'apply' : 'call'](target, newItem);
        }
        return target;
    },
    numericSortFn: function (a, b) {
        return a - b;
    },
    arrayContainsArray: function (superset, subset) {
        return subset.every(function (value) {
            return (superset.indexOf(value) >= 0);
        });
    }
}
export default lArray;


let lCore = {
    each: lArray.each,
    min: lArray.min,
    max: lArray.max,
    sum: lArray.sum,
    mean: lArray.mean,

    flatten: lArray.flatten,

    clean: lArray.clean,

    unique: lArray.unique,

    pluck: lArray.pluck,

    toArray(...args) {
        return lArray.toArray.apply(lArray, arguments);
    }
};
export { lCore }