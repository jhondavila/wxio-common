import Core from '../Core';

import lArray from './Array';
import Util from '../Util';

var lastTime = 0,
    animFrameId,
    animFrameHandlers = [],
    animFrameNoArgs = [],
    idSource = 0,
    animFrameMap = {},
    // win = window,
    global = Core.global,
    hasImmediate = !!(global.setImmediate && global.clearImmediate),
    // requestAnimFrame =
    //     function (callback) {
    //         var currTime = Core.now(),
    //             timeToCall = Math.max(0, 16 - (currTime - lastTime)),
    //             id = win.setTimeout(function () {
    //                 callback(currTime + timeToCall);
    //             }, timeToCall);
    //         lastTime = currTime + timeToCall;
    //         return id;
    //     },
    fireHandlers = function () {
        var len = animFrameHandlers.length,
            id, i, handler;

        animFrameId = null;
        // Fire all animation frame handlers in one go
        for (i = 0; i < len; i++) {
            handler = animFrameHandlers[i];
            id = handler[3];

            // Check if this timer has been canceled; its map entry is going to be removed
            if (animFrameMap[id]) {
                handler[0].apply(handler[1] || global, handler[2] || animFrameNoArgs);
                delete animFrameMap[id];
            }
        }

        // Clear all fired animation frame handlers, don't forget that new handlers
        // could have been created in user handler functions called in the loop above
        animFrameHandlers = animFrameHandlers.slice(len);
    },
    fireElevatedHandlers = function () {
        Core.elevateFunction(fireHandlers);
    };


let lFunction = {
    flexSetter(setter) {
        return function (name, value) {
            var k, i;

            if (name !== null) {
                if (typeof name !== 'string') {
                    for (k in name) {
                        if (name.hasOwnProperty(k)) {
                            setter.call(this, k, name[k]);
                        }
                    }

                    if (Core.enumerables) {
                        for (i = Core.enumerables.length; i--;) {
                            k = Core.enumerables[i];
                            if (name.hasOwnProperty(k)) {
                                setter.call(this, k, name[k]);
                            }
                        }
                    }
                } else {
                    setter.call(this, name, value);
                }
            }

            return this;
        };
    },

    /**
     * Create a new function from the provided `fn`, change `this` to the provided scope,
     * optionally overrides arguments for the call. Defaults to the arguments passed by
     * the caller.
     *
     * {@link Ext#bind Ext.bind} is alias for {@link Ext.Function#bind Ext.Function.bind}
     * 
     * **NOTE:** This method is deprecated. Use the standard `bind` method of JavaScript
     * `Function` instead:
     * 
     *      function foo () {
     *          ...
     *      }
     *      
     *      var fn = foo.bind(this);
     *
     * This method is unavailable natively on IE8 and IE/Quirks but Ext JS provides a
     * "polyfill" to emulate the important features of the standard `bind` method. In
     * particular, the polyfill only provides binding of "this" and optional arguments.
     * 
     * @param {Function} fn The function to delegate.
     * @param {Object} scope (optional) The scope (`this` reference) in which the function is executed.
     * **If omitted, defaults to the default global environment object (usually the browser window).**
     * @param {Array} args (optional) Overrides arguments for the call. (Defaults to the arguments passed by the caller)
     * @param {Boolean/Number} appendArgs (optional) if True args are appended to call args instead of overriding,
     * if a number the args are inserted at the specified position.
     * @return {Function} The new function.
     */
    bind(fn, scope, args, appendArgs) {
        if (arguments.length === 2) {
            return function () {
                return fn.apply(scope, arguments);
            };
        }

        var method = fn,
            slice = Array.prototype.slice;

        return function () {
            var callArgs = args || arguments;

            if (appendArgs === true) {
                callArgs = slice.call(arguments, 0);
                callArgs = callArgs.concat(args);
            }
            else if (typeof appendArgs === 'number') {
                callArgs = slice.call(arguments, 0); // copy arguments first
                lArray.insert(callArgs, appendArgs, args);
            }

            return method.apply(scope || global, callArgs);
        };
    },

    /**
     * Captures the given parameters for a later call to `Ext.callback`. This binding is
     * most useful for resolving scopes for example to an `Ext.app.ViewController`.
     *
     * The arguments match that of `Ext.callback` except for the `args` which, if provided
     * to this method, are prepended to any arguments supplied by the eventual caller of
     * the returned function.
     *
     * @return {Function} A function that, when called, uses `Ext.callback` to call the
     * captured `callback`.
     * @since 5.0.0
     */
    bindCallback(callback, scope, args, delay, caller) {
        return function () {
            var a = lArray.slice(arguments);
            return Util.callback(callback, scope, args ? args.concat(a) : a, delay, caller);
        };
    },

    /**
     * Create a new function from the provided `fn`, the arguments of which are pre-set to `args`.
     * New arguments passed to the newly created callback when it's invoked are appended after the pre-set ones.
     * This is especially useful when creating callbacks.
     *
     * For example:
     *
     *     var originalFunction = function(){
     *         alert(Ext.Array.from(arguments).join(' '));
     *     };
     *
     *     var callback = Ext.Function.pass(originalFunction, ['Hello', 'World']);
     *
     *     callback(); // alerts 'Hello World'
     *     callback('by Me'); // alerts 'Hello World by Me'
     *
     * {@link Ext#pass Ext.pass} is alias for {@link Ext.Function#pass Ext.Function.pass}
     *
     * @param {Function} fn The original function.
     * @param {Array} args The arguments to pass to new callback.
     * @param {Object} scope (optional) The scope (`this` reference) in which the function is executed.
     * @return {Function} The new callback function.
     */
    pass(fn, args, scope) {
        if (!Core.isArray(args)) {
            if (Core.isIterable(args)) {
                args = lArray.clone(args);
            } else {
                args = args !== undefined ? [args] : [];
            }
        }

        return function () {
            var fnArgs = args.slice();
            fnArgs.push.apply(fnArgs, arguments);
            return fn.apply(scope || this, fnArgs);
        };
    },

    /**
     * Create an alias to the provided method property with name `methodName` of `object`.
     * Note that the execution scope will still be bound to the provided `object` itself.
     *
     * @param {Object/Function} object
     * @param {String} methodName
     * @return {Function} aliasFn
     */
    alias(object, methodName) {
        return function () {
            return object[methodName].apply(object, arguments);
        };
    },

    /**
     * Create a "clone" of the provided method. The returned method will call the given
     * method passing along all arguments and the "this" pointer and return its result.
     *
     * @param {Function} method
     * @return {Function} cloneFn
     */
    clone(method) {
        return function () {
            return method.apply(this, arguments);
        };
    },

    /**
     * Creates an interceptor function. The passed function is called before the original one. If it returns false,
     * the original one is not called. The resulting function returns the results of the original function.
     * The passed function is called with the parameters of the original function. Example usage:
     *
     *     var sayHi = function(name){
     *         alert('Hi, ' + name);
     *     };
     *
     *     sayHi('Fred'); // alerts "Hi, Fred"
     *
     *     // create a new function that validates input without
     *     // directly modifying the original function:
     *     var sayHiToFriend = Ext.Function.createInterceptor(sayHi, function(name){
     *         return name === 'Brian';
     *     });
     *
     *     sayHiToFriend('Fred');  // no alert
     *     sayHiToFriend('Brian'); // alerts "Hi, Brian"
     *
     * @param {Function} origFn The original function.
     * @param {Function} newFn The function to call before the original.
     * @param {Object} [scope] The scope (`this` reference) in which the passed function is executed.
     * **If omitted, defaults to the scope in which the original function is called or the browser window.**
     * @param {Object} [returnValue=null] The value to return if the passed function return `false`.
     * @return {Function} The new function.
     */
    createInterceptor(origFn, newFn, scope, returnValue) {
        if (!Core.isFunction(newFn)) {
            return origFn;
        } else {
            returnValue = Core.isDefined(returnValue) ? returnValue : null;

            return function () {
                var me = this,
                    args = arguments;

                return (newFn.apply(scope || me || global, args) !== false) ?
                    origFn.apply(me || global, args) : returnValue;
            };
        }
    },

    /**
     * Creates a delegate (callback) which, when called, executes after a specific delay.
     *
     * @param {Function} fn The function which will be called on a delay when the returned function is called.
     * Optionally, a replacement (or additional) argument list may be specified.
     * @param {Number} delay The number of milliseconds to defer execution by whenever called.
     * @param {Object} scope (optional) The scope (`this` reference) used by the function at execution time.
     * @param {Array} args (optional) Override arguments for the call. (Defaults to the arguments passed by the caller)
     * @param {Boolean/Number} appendArgs (optional) if True args are appended to call args instead of overriding,
     * if a number the args are inserted at the specified position.
     * @return {Function} A function which, when called, executes the original function after the specified delay.
     */
    createDelayed(fn, delay, scope, args, appendArgs) {
        if (scope || args) {
            fn = this.bind(fn, scope, args, appendArgs);
        }

        return function () {
            var me = this,
                args = Array.prototype.slice.call(arguments);

            setTimeout(function () {
                if (Core.elevateFunction) {
                    Core.elevateFunction(fn, me, args);
                } else {
                    fn.apply(me, args);
                }
            }, delay);
        };
    },

    /**
     * Calls this function after the number of milliseconds specified, optionally in a specific scope. Example usage:
     *
     *     var sayHi = function(name){
     *         alert('Hi, ' + name);
     *     }
     *
     *     // executes immediately:
     *     sayHi('Fred');
     *
     *     // executes after 2 seconds:
     *     Ext.Function.defer(sayHi, 2000, this, ['Fred']);
     *
     *     // this syntax is sometimes useful for deferring
     *     // execution of an anonymous function:
     *     Ext.Function.defer(function(){
     *         alert('Anonymous');
     *     }, 100);
     *
     * {@link Ext#defer Ext.defer} is alias for {@link Ext.Function#defer Ext.Function.defer}
     *
     * @param {Function} fn The function to defer.
     * @param {Number} millis The number of milliseconds for the `setTimeout` call
     * (if less than or equal to 0 the function is executed immediately).
     * @param {Object} scope (optional) The scope (`this` reference) in which the function is executed.
     * **If omitted, defaults to the browser window.**
     * @param {Array} [args] Overrides arguments for the call. Defaults to the arguments passed by the caller.
     * @param {Boolean/Number} [appendArgs=false] If `true` args are appended to call args instead of overriding,
     * or, if a number, then the args are inserted at the specified position.
     * @return {Number} The timeout id that can be used with `clearTimeout`.
     */
    defer(fn, millis, scope, args, appendArgs) {
        fn = this.bind(fn, scope, args, appendArgs);
        if (millis > 0) {
            return setTimeout(function () {
                if (Core.elevateFunction) {
                    Core.elevateFunction(fn);
                } else {
                    fn();
                }
            }, millis);
        }
        fn();
        return 0;
    },

    /**
     * Calls this function repeatedly at a given interval, optionally in a specific scope.
     *
     * {@link Ext#defer Ext.defer} is alias for {@link Ext.Function#defer Ext.Function.defer}
     *
     * @param {Function} fn The function to defer.
     * @param {Number} millis The number of milliseconds for the `setInterval` call
     * @param {Object} scope (optional) The scope (`this` reference) in which the function is executed.
     * **If omitted, defaults to the browser window.**
     * @param {Array} [args] Overrides arguments for the call. Defaults to the arguments passed by the caller.
     * @param {Boolean/Number} [appendArgs=false] If `true` args are appended to call args instead of overriding,
     * or, if a number, then the args are inserted at the specified position.
     * @return {Number} The interval id that can be used with `clearInterval`.
     */
    interval(fn, millis, scope, args, appendArgs) {
        fn = this.bind(fn, scope, args, appendArgs);
        return setInterval(function () {
            if (Core.elevateFunction) {
                Core.elevateFunction(fn);
            } else {
                fn();
            }
        }, millis);
    },

    /**
     * Create a combined function call sequence of the original function + the passed function.
     * The resulting function returns the results of the original function.
     * The passed function is called with the parameters of the original function. Example usage:
     *
     *     var sayHi = function(name){
     *         alert('Hi, ' + name);
     *     };
     *
     *     sayHi('Fred'); // alerts "Hi, Fred"
     *
     *     var sayGoodbye = Ext.Function.createSequence(sayHi, function(name){
     *         alert('Bye, ' + name);
     *     });
     *
     *     sayGoodbye('Fred'); // both alerts show
     *
     * @param {Function} originalFn The original function.
     * @param {Function} newFn The function to sequence.
     * @param {Object} [scope] The scope (`this` reference) in which the passed function is executed.
     * If omitted, defaults to the scope in which the original function is called or the
     * default global environment object (usually the browser window).
     * @return {Function} The new function.
     */
    createSequence(originalFn, newFn, scope) {
        if (!newFn) {
            return originalFn;
        }
        else {
            return function () {
                var result = originalFn.apply(this, arguments);
                newFn.apply(scope || this, arguments);
                return result;
            };
        }
    },

    /**
     * Creates a delegate function, optionally with a bound scope which, when called, buffers
     * the execution of the passed function for the configured number of milliseconds.
     * If called again within that period, the impending invocation will be canceled, and the
     * timeout period will begin again.
     *
     * @param {Function} fn The function to invoke on a buffered timer.
     * @param {Number} buffer The number of milliseconds by which to buffer the invocation of the
     * function.
     * @param {Object} [scope] The scope (`this` reference) in which.
     * the passed function is executed. If omitted, defaults to the scope specified by the caller.
     * @param {Array} [args] Override arguments for the call. Defaults to the arguments
     * passed by the caller.
     * @return {Function} A function which invokes the passed function after buffering for the specified time.
     */
    createBuffered(fn, buffer, scope, args) {
        var timerId;

        return function () {
            var callArgs = args || Array.prototype.slice.call(arguments, 0),
                me = scope || this;

            if (timerId) {
                clearTimeout(timerId);
            }

            timerId = setTimeout(function () {
                if (Core.elevateFunction) {
                    Core.elevateFunction(fn, me, callArgs);
                } else {
                    fn.apply(me, callArgs);
                }
            }, buffer);
        };
    },


    /**
     * Creates a throttled version of the passed function which, when called repeatedly and
     * rapidly, invokes the passed function only after a certain interval has elapsed since the
     * previous invocation.
     *
     * This is useful for wrapping functions which may be called repeatedly, such as
     * a handler of a mouse move event when the processing is expensive.
     *
     * @param {Function} fn The function to execute at a regular time interval.
     * @param {Number} interval The interval in milliseconds on which the passed function is executed.
     * @param {Object} [scope] The scope (`this` reference) in which
     * the passed function is executed. If omitted, defaults to the scope specified by the caller.
     * @return {Function} A function which invokes the passed function at the specified interval.
     */
    createThrottled(fn, interval, scope) {
        var me = this,
            lastCallTime = 0,
            elapsed,
            lastArgs,
            timer,
            execute = function () {
                if (Core.elevateFunction) {
                    Core.elevateFunction(fn, scope, lastArgs);
                } else {
                    fn.apply(scope, lastArgs);
                }
                lastCallTime = Core.now();
                timer = null;
            };

        return function () {
            // Use scope of last call unless the creator specified a scope
            if (!scope) {
                scope = this;
            }
            elapsed = Core.now() - lastCallTime;
            lastArgs = arguments;

            // If this is the first invocation, or the throttle interval has been reached, clear any
            // pending invocation, and call the target function now.
            if (elapsed >= interval) {
                clearTimeout(timer);
                execute();
            }
            // Throttle interval has not yet been reached. Only set the timer to fire if not already set.
            else if (!timer) {
                timer = me.defer(execute, interval - elapsed);
            }
        };
    },

    /**
     * Wraps the passed function in a barrier function which will call the passed function after the passed number of invocations.
     * @param {Number} count The number of invocations which will result in the calling of the passed function.
     * @param {Function} fn The function to call after the required number of invocations.
     * @param {Object} scope The scope (`this` reference) in which the function will be called.
     */
    createBarrier(count, fn, scope) {
        return function () {
            if (!--count) {
                fn.apply(scope, arguments);
            }
        };
    },

    /**
     * Adds behavior to an existing method that is executed before the
     * original behavior of the function.  For example:
     * 
     *     var soup = {
     *         contents: [],
     *         add(ingredient) {
     *             this.contents.push(ingredient);
     *         }
     *     };
     *     Ext.Function.interceptBefore(soup, "add", function(ingredient){
     *         if (!this.contents.length && ingredient !== "water") {
     *             // Always add water to start with
     *             this.contents.push("water");
     *         }
     *     });
     *     soup.add("onions");
     *     soup.add("salt");
     *     soup.contents; // will contain: water, onions, salt
     * 
     * @param {Object} object The target object
     * @param {String} methodName Name of the method to override
     * @param {Function} fn Function with the new behavior.  It will
     * be called with the same arguments as the original method.  The
     * return value of this function will be the return value of the
     * new method.
     * @param {Object} [scope] The scope to execute the interceptor function. Defaults to the object.
     * @return {Function} The new function just created.
     */
    interceptBefore(object, methodName, fn, scope) {
        var method = object[methodName] || Core.emptyFn;

        return (object[methodName] = function () {
            var ret = fn.apply(scope || this, arguments);
            method.apply(this, arguments);

            return ret;
        });
    },

    /**
     * Adds behavior to an existing method that is executed after the
     * original behavior of the function.  For example:
     * 
     *     var soup = {
     *         contents: [],
     *         add(ingredient) {
     *             this.contents.push(ingredient);
     *         }
     *     };
     *     Ext.Function.interceptAfter(soup, "add", function(ingredient){
     *         // Always add a bit of extra salt
     *         this.contents.push("salt");
     *     });
     *     soup.add("water");
     *     soup.add("onions");
     *     soup.contents; // will contain: water, salt, onions, salt
     * 
     * @param {Object} object The target object
     * @param {String} methodName Name of the method to override
     * @param {Function} fn Function with the new behavior.  It will
     * be called with the same arguments as the original method.  The
     * return value of this function will be the return value of the
     * new method.
     * @param {Object} [scope] The scope to execute the interceptor function. Defaults to the object.
     * @return {Function} The new function just created.
     */
    interceptAfter(object, methodName, fn, scope) {
        var method = object[methodName] || Core.emptyFn;

        return (object[methodName] = function () {
            method.apply(this, arguments);
            return fn.apply(scope || this, arguments);
        });
    },

    makeCallback(callback, scope) {
        //<debug>
        if (!scope[callback]) {
            if (scope.$className) {
                console.error('No method "' + callback + '" on ' + scope.$className);
            }
            console.error('No method "' + callback + '"');
        }
        //</debug>

        return function () {
            return scope[callback].apply(scope, arguments);
        };
    },

    /**
     * Returns a wrapper function that caches the return value for previously
     * processed function argument(s).
     *
     * For example:
     *
     *      function factorial (value) {
     *          var ret = value;
     *
     *          while (--value > 1) {
     *              ret *= value;
     *          }
     *
     *          return ret;
     *      }
     *
     * Each call to `factorial` will loop and multiply to produce the answer. Using
     * this function we can wrap the above and cache its answers:
     *
     *      factorial = Ext.Function.memoize(factorial);
     *
     * The returned function operates in the same manner as before, but results are
     * stored in a cache to avoid calling the wrapped function when given the same
     * arguments.
     *
     *      var x = factorial(20);  // first time; call real factorial()
     *      var y = factorial(20);  // second time; return value from first call
     *
     * To support multi-argument methods, you will need to provide a `hashFn`.
     *
     *      function permutation (n, k) {
     *          return factorial(n) / factorial(n - k);
     *      }
     *
     *      permutation = Ext.Function.memoize(permutation, null, function (n, k) {
     *          n + '-' + k;
     *      });
     *
     * In this case, the `memoize` of `factorial` is sufficient optimization, but the
     * example is simply to illustrate how to generate a unique key for an expensive,
     * multi-argument method.
     *
     * **IMPORTANT**: This cache is unbounded so be cautious of memory leaks if the
     * `memoize`d function is kept indefinitely or is given an unbounded set of
     * possible arguments.
     *
     * @param {Function} fn Function to wrap.
     * @param {Object} scope Optional scope in which to execute the wrapped function.
     * @param {Function} hashFn Optional function used to compute a hash key for
     * storing the result, based on the arguments to the original function.
     * @return {Function} The caching wrapper function.
     * @since 6.0.0
     */
    memoize(fn, scope, hashFn) {
        var memo = {},
            isFunc = hashFn && Core.isFunction(hashFn);

        return function (value) {
            var key = isFunc ? hashFn.apply(scope, arguments) : value;

            if (!(key in memo)) {
                memo[key] = fn.apply(scope, arguments);
            }

            return memo[key];
        };
    },
    asap(fn, scope, parameters) {
        if (scope != null || parameters != null) {
            fn = this.bind(fn, scope, parameters);
        }
        return setImmediate(function () {
            if (Core.elevateFunction) {
                Core.elevateFunction(fn);
            } else {
                fn();
            }
        });
    },
    asapCancel(id) {
        clearImmediate(id);
    }

};




let lCore = {
    asap: lFunction.asap,
    defer: lFunction.defer,
    interval: lFunction.interval,
    pass: lFunction.pass,
    bind: lFunction.bind,
    deferCallback: lFunction.bind
};


export { lCore };


export default lFunction;