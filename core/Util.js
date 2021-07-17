import Core from "./";
import lFunction from './lang/Function';

var nonWhitespaceRe = /\S/,
    toString = Object.prototype.toString,
    typeofTypes = {
        number: 1,
        string: 1,
        'boolean': 1,
        'undefined': 1
    },
    toStringTypes = {
        '[object Array]': 'array',
        '[object Date]': 'date',
        '[object Boolean]': 'boolean',
        '[object Number]': 'number',
        '[object RegExp]': 'regexp'
    };



export default {

    callback: function (callback, scope, args, delay, caller, defaultScope) {
        if (!callback) {
            return;
        }

        var namedScope = (scope in Core._namedScopes);

        if (callback.charAt) { // if (isString(fn))
            if ((!scope || namedScope) && caller) {
                scope = caller.resolveListenerScope(namedScope ? scope : defaultScope);
            }
            //<debug>
            if (!scope || !Core.isObject(scope)) {
                console.error('Named method "' + callback + '" requires a scope object');
            }
            if (!Core.isFunction(scope[callback])) {
                console.error('No method named "' + callback + '" on ' +
                    (scope.$className || 'scope object'));
            }
            //</debug>

            callback = scope[callback];
        } else if (namedScope) {
            scope = defaultScope || caller;
        } else if (!scope) {
            scope = caller;
        }

        var ret;

        if (callback && Core.isFunction(callback)) {
            scope = scope || Core.global;
            if (delay) {
                lFunction.defer(callback, delay, scope, args);
            } else if (Core.elevateFunction) {
                ret = Core.elevateFunction(callback, scope, args);
            } else if (args) {
                ret = callback.apply(scope, args);
            } else {
                ret = callback.call(scope);
            }
        }

        return ret;
    },
    coerce(from, to) {
        var fromType = this.typeOf(from),
            toType = this.typeOf(to),
            isString = typeof from === 'string';

        if (fromType !== toType) {
            switch (toType) {
                case 'string':
                    return String(from);
                case 'number':
                    return Number(from);
                case 'boolean':
                    return isString && (!from || from === 'false') ? false : Boolean(from);
                case 'null':
                    return isString && (!from || from === 'null') ? null : from;
                case 'undefined':
                    return isString && (!from || from === 'undefined') ? undefined : from;
                case 'date':
                    return "No implementado en fechas";
                // return isString && isNaN(from) ? Ext.Date.parse(from, Ext.Date.defaultFormat) : Date(Number(from));
            }
        }
        return from;
    },
    propertyNameSplitRe: /[,;\s]+/,
    copyTo(dest, source, names, usePrototypeKeys) {

        if (typeof names === 'string') {
            names = names.split(this.propertyNameSplitRe);
        }

        for (var name, i = 0, n = names ? names.length : 0; i < n; i++) {
            name = names[i];

            if (usePrototypeKeys || source.hasOwnProperty(name)) {
                dest[name] = source[name];
            }
        }

        return dest;
    },
    copy(dest, source, names, usePrototypeKeys) {
        if (typeof names === 'string') {
            names = names.split(this.propertyNameSplitRe);
        }

        for (var name, i = 0, n = names ? names.length : 0; i < n; i++) {
            name = names[i];

            // Only copy a property if the source actually *has* that property.
            // If we are including prototype properties, then ensure that a property of
            // that name can be found *somewhere* in the prototype chain (otherwise we'd be copying undefined in which may break things)
            if (source.hasOwnProperty(name) || (usePrototypeKeys && name in source)) {
                dest[name] = source[name];
            }
        }

        return dest;
    },
    copyToIf(destination, source, names) {
        if (typeof names === 'string') {
            names = names.split(this.propertyNameSplitRe);
        }

        for (var name, i = 0, n = names ? names.length : 0; i < n; i++) {
            name = names[i];

            if (destination[name] === undefined) {
                destination[name] = source[name];
            }
        }

        return destination;
    },
    copyIf(destination, source, names) {
        if (typeof names === 'string') {
            names = names.split(this.propertyNameSplitRe);
        }

        for (var name, i = 0, n = names ? names.length : 0; i < n; i++) {
            name = names[i];

            // Only copy a property if the destination has no property by that name
            if (!(name in destination) && (name in source)) {
                destination[name] = source[name];
            }
        }

        return destination;
    },
    typeOf(value) {
        if (value === null) {
            return 'null';
        }

        var type = typeof value,
            ret, typeToString;

        if (typeofTypes[type]) {
            return type;
        }

        ret = toStringTypes[typeToString = toString.call(value)];
        if (ret) {
            return ret;
        }

        if (type === 'function') {
            return 'function';
        }

        if (type === 'object') {
            if (value.nodeType !== undefined) {
                if (value.nodeType === 3) {
                    return nonWhitespaceRe.test(value.nodeValue) ? 'textnode' : 'whitespace';
                }
                else {
                    return 'element';
                }
            }

            return 'object';
        }

        //<debug>
        // Ext.raise({
        //     sourceClass: 'Ext',
        //     sourceMethod: 'typeOf',
        //     msg: 'Failed to determine the type of "' + value + '".'
        // });
        //</debug>

        return typeToString;

    }
}