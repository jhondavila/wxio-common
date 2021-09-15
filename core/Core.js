let enumerables = [
  //'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
  "valueOf",
  "toLocaleString",
  "toString",
  "constructor"
];

let propToString = Object.prototype.toString,
  identityFn = function (o) {
    return o;
  };

// import CoreNode from "./node/Core";

export default {
  //   ...CoreNode,
  name: "Wx",
  elevateFunction: null,
  _namedScopes: {
    this: { isThis: 1 },
    controller: { isController: 1 },
    self: { isSelf: 1 },
    "self.controller": { isSelf: 1, isController: 1 }
  },
  idSeed: 0,
  global: global,
  idPrefix: "wx-",
  now: Date.now,
  enumerables: enumerables,
  MSDateRe: /^\\?\/Date\(([-+])?(\d+)(?:[+-]\d{4})?\)\\?\/$/,
  iterableRe: /\[object\s*(?:Array|Arguments|\w*Collection|\w*List|HTML\s+document\.all\s+class)\]/,
  emptyFn() { },
  identityFn: identityFn,
  startTime: Date.now(),
  id: function (o, prefix) {
    if (o && o.id) {
      return o.id;
    }

    var id = (prefix || this.idPrefix) + ++this.idSeed;

    if (o) {
      o.id = id;
    }

    return id;
  },
  apply(object, config, defaults) {
    if (defaults) {
      this.apply(object, defaults);
    }

    if (object && config && typeof config === "object") {
      var i, j, k;

      for (i in config) {
        object[i] = config[i];
      }

      if (this.enumerables) {
        for (j = this.enumerables.length; j--;) {
          k = this.enumerables[j];
          if (config.hasOwnProperty && config.hasOwnProperty(k)) {
            object[k] = config[k];
          }
        }
      }
    }
    return object;
  },
  applyIf(object, config) {
    var property;
    if (object) {
      for (property in config) {
        if (object[property] === undefined) {
          object[property] = config[property];
        }
      }
    }
    return object;
  },
  applyIfNot(object, config) {
    var property;
    if (object) {
      for (property in config) {
        if (object[property] === undefined) {
          object[property] = config[property];
        }
      }
    }
    return object;
  },
  toString: propToString,
  //Type Eval
  isEmpty: function (value, allowEmptyString) {
    return (
      value == null ||
      (!allowEmptyString ? value === "" : false) ||
      (this.isArray(value) && value.length === 0)
    );
  },
  isArray: Array.isArray,
  isObject: function (value) {
    return propToString.call(value) === "[object Object]";
  },
  isDate(value) {
    return propToString.call(value) === "[object Date]";
  },
  isMSDate(value) {
    if (!this.isString(value)) {
      return false;
    }
    return this.MSDateRe.test(value);
  },
  isPrimitive(value) {
    var type = typeof value;
    return type === "string" || type === "number" || type === "boolean";
  },
  isFunction(value) {
    return !!value && typeof value === "function";
  },
  isNumber(value) {
    return typeof value === "number" && isFinite(value);
  },
  isNumeric(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
  },
  isString(value) {
    return typeof value === "string";
  },
  isBoolean(value) {
    return typeof value === "boolean";
  },
  isDefined(value) {
    return typeof value !== "undefined";
  },
  isIterable: function (value) {
    // To be iterable, the object must have a numeric length property and must not be a string or function.
    if (
      !value ||
      typeof value.length !== "number" ||
      typeof value === "string" ||
      this.isFunction(value)
    ) {
      return false;
    }
    if (!value.propertyIsEnumerable) {
      return !!value.item;
    }

    if (
      value.hasOwnProperty("length") &&
      !value.propertyIsEnumerable("length")
    ) {
      return true;
    }

    return this.iterableRe.test(propToString.call(value));
  },
  ///
  clone: function (item) {
    if (item === null || item === undefined) {
      return item;
    }

    if (item.nodeType && item.cloneNode) {
      return item.cloneNode(true);
    }

    var type = propToString.call(item),
      i,
      j,
      k,
      clone,
      key;

    // Date
    if (type === "[object Date]") {
      return new Date(item.getTime());
    }

    // Array
    if (type === "[object Array]") {
      i = item.length;

      clone = [];

      while (i--) {
        clone[i] = this.clone(item[i]);
      }
    }
    // Object
    else if (type === "[object Object]" && item.constructor === Object) {
      clone = {};

      for (key in item) {
        clone[key] = this.clone(item[key]);
      }

      if (enumerables) {
        for (j = enumerables.length; j--;) {
          k = enumerables[j];
          if (item.hasOwnProperty(k)) {
            clone[k] = item[k];
          }
        }
      }
    }

    return clone || item;
  },
  functionFactory: function (...params) {
    var args = Array.prototype.slice.call(arguments),
      ln;
    // if (Ext.isSandboxed) {
    //     ln = args.length;
    //     if (ln > 0) {
    //         ln--;
    //         args[ln] = 'var Ext=window.' + Ext.name + ';' + args[ln];
    //     }
    // }

    return Function.prototype.constructor.apply(Function.prototype, args);
  },

  deleteKey(object, keys) {
    for (var x = 0; x < keys.length; x++) {
      delete object[keys[x]];
    }
  },


  classId(cls) {
    let prototype = Object.getPrototypeOf(cls);
    if (!prototype.constructor.sequence) {
      let className = prototype.constructor.name;
      Object.defineProperty(prototype.constructor, "sequence", {
        value: {
          seed: 0,
          prefix: className,
          generate() {
            this.seed++;
            return this.prefix !== null
              ? this.prefix + "-" + this.seed
              : this.seed;
          }
        }
      });
    }
    return prototype.constructor.sequence.generate();
  },
  pause(ms) {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, ms);
    });
  },
  parseToForm(form, root, data) {
    if (this.isArray(data)) {
      if (this.isEmpty(data)) {
        form.append(`${root}`, "[]");
      } else {
        let row;
        for (let x = 0; x < data.length; x++) {
          row = data[x];
          this.parseToForm(form, `${root}[${x}]`, row);
        }
      }
    } else if (this.isObject(data)) {
      for (let p in data) {
        this.parseToForm(form, `${root}[${p}]`, data[p]);
      }
    } else {
      form.append(`${root}`, data);
    }
  },
  cancelablePromise(promiseToCancel) {
    let cancel;
    const promise = new Promise((resolve, reject) => {
      promiseToCancel.then(result => resolve(result)).catch(e => {
        reject(e);
      });
      cancel = () => reject('canceled')
    })
    return {
      promise,
      cancel
    }
  },
  textCapitalize(text) {
    return text.substring(0, 1).toUpperCase() + text.substring(1, text.length);
  },
  formatDDddddMMMMCapitalize(date) {
    return `${this.textCapitalize(date.format("dddd DD"))} de ${this.textCapitalize(date.format("MMMM"))}`
  },
  syncJoin(socket, room) {
    return new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        reject(`timeout syncJoin room`);
      }, 10000)
      socket.join(room, function () {
        clearTimeout(timeout);
        resolve();
      })
    }).catch(e => {

      console.log(e);
    })
  }
};
