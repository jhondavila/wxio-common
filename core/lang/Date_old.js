import String from './String';
import Core from '../Core';

var utilDate,
    nativeDate = Date,
    stripEscapeRe = /(\\.)/g,
    hourInfoRe = /([gGhHisucUOPZ]|MS)/,
    dateInfoRe = /([djzmnYycU]|MS)/,
    slashRe = /\\/gi,
    numberTokenRe = /\{(\d+)\}/g,
    MSFormatRe = new RegExp('\\/Date\\(([-+])?(\\d+)(?:[+-]\\d{4})?\\)\\/'),
    pad = String.leftPad,

    // Most of the date-formatting functions below are the excellent work of Baron Schwartz.
    // (see http://www.xaprb.com/blog/2005/12/12/javascript-closures-for-runtime-efficiency/)
    // They generate precompiled functions from format patterns instead of parsing and
    // processing each pattern every time a date is formatted.
    code = [
        // date calculations (note: the code below creates a dependency on Ext.Number.from())
        "var me = this, dt, y, m, d, h, i, s, ms, o, O, z, zz, u, v, W, year, jan4, week1monday, daysInMonth, dayMatched,",
        "def = me.defaults,",
        "from = Ext.Number.from,",
        "results = String(input).match(me.parseRegexes[{0}]);", // either null, or an array of matched strings

        "if(results){",
        "{1}",

        "if(u != null){", // i.e. unix time is defined
        "v = new Date(u * 1000);", // give top priority to UNIX time
        "}else{",
        // create Date object representing midnight of the current day;
        // this will provide us with our date defaults
        // (note: clearTime() handles Daylight Saving Time automatically)
        "dt = me.clearTime(new Date);",

        "y = from(y, from(def.y, dt.getFullYear()));",
        "m = from(m, from(def.m - 1, dt.getMonth()));",
        "dayMatched = d !== undefined;",
        "d = from(d, from(def.d, dt.getDate()));",

        // Attempt to validate the day. Since it defaults to today, it may go out
        // of range, for example parsing m/Y where the value is 02/2000 on the 31st of May.
        // It will attempt to parse 2000/02/31, which will overflow to March and end up
        // returning 03/2000. We only do this when we default the day. If an invalid day value
        // was set to be parsed by the user, continue on and either let it overflow or return null
        // depending on the strict value. This will be in line with the normal Date behaviour.

        "if (!dayMatched) {",
        "dt.setDate(1);",
        "dt.setMonth(m);",
        "dt.setFullYear(y);",

        "daysInMonth = me.getDaysInMonth(dt);",
        "if (d > daysInMonth) {",
        "d = daysInMonth;",
        "}",
        "}",

        "h  = from(h, from(def.h, dt.getHours()));",
        "i  = from(i, from(def.i, dt.getMinutes()));",
        "s  = from(s, from(def.s, dt.getSeconds()));",
        "ms = from(ms, from(def.ms, dt.getMilliseconds()));",

        "if(z >= 0 && y >= 0){",
        // both the year and zero-based day of year are defined and >= 0.
        // these 2 values alone provide sufficient info to create a full date object

        // create Date object representing January 1st for the given year
        // handle years < 100 appropriately
        "v = me.add(new Date(y < 100 ? 100 : y, 0, 1, h, i, s, ms), me.YEAR, y < 100 ? y - 100 : 0);",

        // then add day of year, checking for Date "rollover" if necessary
        "v = !strict? v : (strict === true && (z <= 364 || (me.isLeapYear(v) && z <= 365))? me.add(v, me.DAY, z) : null);",
        "}else if(strict === true && !me.isValid(y, m + 1, d, h, i, s, ms)){", // check for Date "rollover"
        "v = null;", // invalid date, so return null
        "}else{",
        "if (W) {", // support ISO-8601
        // http://en.wikipedia.org/wiki/ISO_week_date
        //
        // Mutually equivalent definitions for week 01 are:
        // a. the week starting with the Monday which is nearest in time to 1 January
        // b. the week with 4 January in it
        // ... there are many others ...
        //
        // We'll use letter b above to determine the first week of the year.
        //
        // So, first get a Date object for January 4th of whatever calendar year is desired.
        //
        // Then, the first Monday of the year can easily be determined by (operating on this Date):
        // 1. Getting the day of the week.
        // 2. Subtracting that by one.
        // 3. Multiplying that by 86400000 (one day in ms).
        // 4. Subtracting this number of days (in ms) from the January 4 date (represented in ms).
        //
        // Example #1 ...
        //
        //       January 2012
        //   Su Mo Tu We Th Fr Sa
        //    1  2  3  4  5  6  7
        //    8  9 10 11 12 13 14
        //   15 16 17 18 19 20 21
        //   22 23 24 25 26 27 28
        //   29 30 31
        //
        // 1. January 4th is a Wednesday.
        // 2. Its day number is 3.
        // 3. Simply substract 2 days from Wednesday.
        // 4. The first week of the year begins on Monday, January 2. Simple!
        //
        // Example #2 ...
        //       January 1992
        //   Su Mo Tu We Th Fr Sa
        //             1  2  3  4
        //    5  6  7  8  9 10 11
        //   12 13 14 15 16 17 18
        //   19 20 21 22 23 24 25
        //   26 27 28 29 30 31
        //
        // 1. January 4th is a Saturday.
        // 2. Its day number is 6.
        // 3. Simply subtract 5 days from Saturday.
        // 4. The first week of the year begins on Monday, December 30. Simple!
        //
        // v = Ext.Date.clearTime(new Date(week1monday.getTime() + ((W - 1) * 604800000 + 43200000)));
        // (This is essentially doing the same thing as above but for the week rather than the day)
        "year = y || (new Date()).getFullYear();",
        "jan4 = new Date(year, 0, 4, 0, 0, 0);",
        "d = jan4.getDay();",
        // If the 1st is a Thursday, then the 4th will be a Sunday, so we need the appropriate
        // day number here, which is why we use the day === checks.
        "week1monday = new Date(jan4.getTime() - ((d === 0 ? 6 : d - 1) * 86400000));",
        // The reason for adding 43200000 (12 hours) is to avoid any complication with daylight saving
        // switch overs. For example,  if the clock is rolled back, an hour will repeat, so adding 7 days
        // will leave us 1 hour short (Sun <date> 23:00:00). By setting is to 12:00, subtraction
        // or addition of an hour won't make any difference.
        "v = Ext.Date.clearTime(new Date(week1monday.getTime() + ((W - 1) * 604800000 + 43200000)));",
        "} else {",
        // plain old Date object
        // handle years < 100 properly
        "v = me.add(new Date(y < 100 ? 100 : y, m, d, h, i, s, ms), me.YEAR, y < 100 ? y - 100 : 0);",
        "}",
        "}",
        "}",
        "}",

        "if(v){",
        // favor UTC offset over GMT offset
        "if(zz != null){",
        // reset to UTC, then add offset
        "v = me.add(v, me.SECOND, -v.getTimezoneOffset() * 60 - zz);",
        "}else if(o){",
        // reset to GMT, then add offset
        "v = me.add(v, me.MINUTE, -v.getTimezoneOffset() + (sn == '+'? -1 : 1) * (hr * 60 + mn));",
        "}",
        "}",

        "return (v != null) ? v : null;"
    ].join('\n');

// Polyfill Date's toISOString instance method where not implemented.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
// TODO: Remove this when IE8 retires.
if (!Date.prototype.toISOString) {
    Date.prototype.toISOString = function () {
        var me = this;
        return pad(me.getUTCFullYear(), 4, '0') + '-' +
            pad(me.getUTCMonth() + 1, 2, '0') + '-' +
            pad(me.getUTCDate(), 2, '0') + 'T' +
            pad(me.getUTCHours(), 2, '0') + ':' +
            pad(me.getUTCMinutes(), 2, '0') + ':' +
            pad(me.getUTCSeconds(), 2, '0') + '.' +
            pad(me.getUTCMilliseconds(), 3, '0') + 'Z';
    };
}

/**
* @private
* Create private copy of Ext JS's `Ext.util.Format.format()` method
* + to remove unnecessary dependency
* + to resolve namespace conflict with MS-Ajax's implementation
*/
function xf(format, ...params) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(numberTokenRe, function (m, i) {
        return args[i];
    });
}


let lDate = {
    /** @ignore */
    now: nativeDate.now, // always available due to polyfill in Ext.js

    /**
     * @private
     */
    toString: function (date) {
        if (!date) {
            date = new nativeDate();
        }

        return date.getFullYear() + "-"
            + pad(date.getMonth() + 1, 2, '0') + "-"
            + pad(date.getDate(), 2, '0') + "T"
            + pad(date.getHours(), 2, '0') + ":"
            + pad(date.getMinutes(), 2, '0') + ":"
            + pad(date.getSeconds(), 2, '0');
    },

    /**
     * Returns the number of milliseconds between two dates.
     * @param {Date} dateA The first date.
     * @param {Date} [dateB=new Date()] (optional) The second date.
     * @return {Number} The difference in milliseconds
     */
    getElapsed: function (dateA, dateB) {
        return Math.abs(dateA - (dateB || utilDate.now()));
    },

    /**
     * Global flag which determines if strict date parsing should be used.
     * Strict date parsing will not roll-over invalid dates, which is the
     * default behavior of JavaScript Date objects.
     * (see {@link #parse} for more information)
     * @type Boolean
    */
    useStrict: false,

    /**
     * @private
     */
    formatCodeToRegex: function (character, currentGroup) {
        // Note: currentGroup - position in regex result array (see notes for Ext.Date.parseCodes below)
        var p = utilDate.parseCodes[character];

        if (p) {
            p = typeof p === 'function' ? p() : p;
            utilDate.parseCodes[character] = p; // reassign function result to prevent repeated execution
        }

        return p ? Core.applyIf({
            c: p.c ? xf(p.c, currentGroup || "{0}") : p.c
        }, p) : {
                g: 0,
                c: null,
                s: String.escapeRegex(character) // treat unrecognized characters as literals
            };
    },

    /**
     * An object hash in which each property is a date parsing function. The property name is the
     * format string which that function parses.
     *
     * This object is automatically populated with date parsing functions as
     * date formats are requested for Ext standard formatting strings.
     *
     * Custom parsing functions may be inserted into this object, keyed by a name which from then on
     * may be used as a format string to {@link #parse}.
     *
     * Example:
     *
     *     Ext.Date.parseFunctions['x-date-format'] = myDateParser;
     *
     *  A parsing function should return a Date object, and is passed the following parameters:
     *
     * - `date`: {@link String} - The date string to parse.
     * - `strict`: {@link Boolean} - `true` to validate date strings while parsing
     * (i.e. prevent JavaScript Date "rollover"). __The default must be `false`.__
     * Invalid date strings should return `null` when parsed.
     *
     * To enable Dates to also be _formatted_ according to that format, a corresponding
     * formatting function must be placed into the {@link #formatFunctions} property.
     * @property parseFunctions
     * @type Object
     */
    parseFunctions: {
        "MS": function (input, strict) {
            // note: the timezone offset is ignored since the MS Ajax server sends
            // a UTC milliseconds-since-Unix-epoch value (negative values are allowed)
            var r = (input || '').match(MSFormatRe);
            return r ? new nativeDate(((r[1] || '') + r[2]) * 1) : null;
        },
        "time": function (input, strict) {
            var num = parseInt(input, 10);
            if (num || num === 0) {
                return new nativeDate(num);
            }
            return null;
        },
        "timestamp": function (input, strict) {
            var num = parseInt(input, 10);
            if (num || num === 0) {
                return new nativeDate(num * 1000);
            }
            return null;
        }
    },
    parseRegexes: [],

    /**
     * An object hash in which each property is a date formatting function. The property name is the
     * format string which corresponds to the produced formatted date string.
     *
     * This object is automatically populated with date formatting functions as
     * date formats are requested for Ext standard formatting strings.
     *
     * Custom formatting functions may be inserted into this object, keyed by a name which from then on
     * may be used as a format string to {@link #format}.
     *
     * Example:
     *
     *     Ext.Date.formatFunctions['x-date-format'] = myDateFormatter;
     *
     * A formatting function should return a string representation of the Date object which
     * is the scope (this) of the function.
     *
     * To enable date strings to also be _parsed_ according to that format, a corresponding
     * parsing function must be placed into the {@link #parseFunctions} property.
     * @property formatFunctions
     * @type Object
     */
    formatFunctions: {
        "MS": function () {
            // UTC milliseconds since Unix epoch (MS-AJAX serialized date format (MRSF))
            return '\\/Date(' + this.getTime() + ')\\/';
        },
        "time": function () {
            return this.getTime().toString();
        },
        "timestamp": function () {
            return utilDate.format(this, 'U');
        }
    },

    y2kYear: 50,

    /**
     * Date interval constant.
     * @type String
     */
    MILLI: "ms",

    /**
     * Date interval constant.
     * @type String
     */
    SECOND: "s",

    /**
     * Date interval constant.
     * @type String
     */
    MINUTE: "mi",

    /** Date interval constant.
     * @type String
     */
    HOUR: "h",

    /**
     * Date interval constant.
     * @type String
     */
    DAY: "d",

    /**
     * Date interval constant.
     * @type String
     */
    MONTH: "mo",

    /**
     * Date interval constant.
     * @type String
     */
    YEAR: "y",

    /**
     * An object hash containing default date values used during date parsing.
     * 
     * The following properties are available:
     *
     * - `y`: {@link Number} - The default year value. Defaults to `undefined`.
     * - `m`: {@link Number} - The default 1-based month value. Defaults to `undefined`.
     * - `d`: {@link Number} - The default day value. Defaults to `undefined`.
     * - `h`: {@link Number} - The default hour value. Defaults to `undefined`.
     * - `i`: {@link Number} - The default minute value. Defaults to `undefined`.
     * - `s`: {@link Number} - The default second value. Defaults to `undefined`.
     * - `ms`: {@link Number} - The default millisecond value. Defaults to `undefined`.
     * 
     * Override these properties to customize the default date values used by the {@link #parse} method.
     * 
     * __Note:__ In countries which experience Daylight Saving Time (i.e. DST), the `h`, `i`, `s`
     * and `ms` properties may coincide with the exact time in which DST takes effect.
     * It is the responsibility of the developer to account for this.
     *
     * Example Usage:
     * 
     *     // set default day value to the first day of the month
     *     Ext.Date.defaults.d = 1;
     *
     *     // parse a February date string containing only year and month values.
     *     // setting the default day value to 1 prevents weird date rollover issues
     *     // when attempting to parse the following date string on, for example, March 31st 2009.
     *     Ext.Date.parse('2009-02', 'Y-m'); // returns a Date object representing February 1st 2009.
     *
     * @property defaults
     * @type Object
     */
    defaults: {},

    //<locale type="array">
    /**
     * @property {String[]} dayNames
     * An array of textual day names.
     * Override these values for international dates.
     *
     * Example:
     *
     *     Ext.Date.dayNames = [
     *         'SundayInYourLang',
     *         'MondayInYourLang'
     *         // ...
     *     ];
     */
    dayNames: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ],
    //</locale>

    //<locale type="array">
    /**
     * @property {String[]} monthNames
     * An array of textual month names.
     * Override these values for international dates.
     *
     * Example:
     *
     *     Ext.Date.monthNames = [
     *         'JanInYourLang',
     *         'FebInYourLang'
     *         // ...
     *     ];
     */
    monthNames: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ],
    //</locale>

    //<locale type="object">
    /**
     * @property {Object} monthNumbers
     * An object hash of zero-based JavaScript month numbers (with short month names as keys).
     *
     * __Note:__ keys are case-sensitive.
     * 
     * Override these values for international dates.
     *
     * Example:
     *
     *     Ext.Date.monthNumbers = {
     *         'LongJanNameInYourLang': 0,
     *         'ShortJanNameInYourLang':0,
     *         'LongFebNameInYourLang':1,
     *         'ShortFebNameInYourLang':1
     *         // ...
     *     };
     */
    monthNumbers: {
        January: 0,
        Jan: 0,
        February: 1,
        Feb: 1,
        March: 2,
        Mar: 2,
        April: 3,
        Apr: 3,
        May: 4,
        June: 5,
        Jun: 5,
        July: 6,
        Jul: 6,
        August: 7,
        Aug: 7,
        September: 8,
        Sep: 8,
        October: 9,
        Oct: 9,
        November: 10,
        Nov: 10,
        December: 11,
        Dec: 11
    },
    //</locale>

    //<locale>
    /**
     * @property {String} defaultFormat
     * The date format string that the {@link Ext.util.Format#dateRenderer}
     * and {@link Ext.util.Format#date} functions use.  See {@link Ext.Date} for details.
     *
     * This may be overridden in a locale file.
     */
    defaultFormat: "m/d/Y",
    //</locale>
    //<locale type="function">
    /**
     * Get the short month name for the given month number.
     * Override this function for international dates.
     * @param {Number} month A zero-based JavaScript month number.
     * @return {String} The short month name.
     */
    getShortMonthName: function (month) {
        return utilDate.monthNames[month].substring(0, 3);
    },
    //</locale>

    //<locale type="function">
    /**
     * Get the short day name for the given day number.
     * Override this function for international dates.
     * @param {Number} day A zero-based JavaScript day number.
     * @return {String} The short day name.
     */
    getShortDayName: function (day) {
        return utilDate.dayNames[day].substring(0, 3);
    },
    //</locale>

    //<locale type="function">
    /**
     * Get the zero-based JavaScript month number for the given short/full month name.
     * Override this function for international dates.
     * @param {String} name The short/full month name.
     * @return {Number} The zero-based JavaScript month number.
     */
    getMonthNumber: function (name) {
        // handle camel casing for English month names (since the keys for the Ext.Date.monthNumbers hash are case sensitive)
        return utilDate.monthNumbers[name.substring(0, 1).toUpperCase() + name.substring(1, 3).toLowerCase()];
    },
    //</locale>

    /**
     * Checks if the specified format contains hour information
     * @param {String} format The format to check
     * @return {Boolean} True if the format contains hour information
     * @method
     */
    formatContainsHourInfo: function (format) {
        return hourInfoRe.test(format.replace(stripEscapeRe, ''));
    },

    /**
     * Checks if the specified format contains information about
     * anything other than the time.
     * @param {String} format The format to check
     * @return {Boolean} True if the format contains information about
     * date/day information.
     * @method
     */
    formatContainsDateInfo: function (format) {
        return dateInfoRe.test(format.replace(stripEscapeRe, ''));
    },

    /**
     * Removes all escaping for a date format string. In date formats,
     * using a '\' can be used to escape special characters.
     * @param {String} format The format to unescape
     * @return {String} The unescaped format
     * @method
     */
    unescapeFormat: function (format) {
        // Escape the format, since \ can be used to escape special
        // characters in a date format. For example, in a Spanish
        // locale the format may be: 'd \\de F \\de Y'
        return format.replace(slashRe, '');
    },

    /**
     * The base format-code to formatting-function hashmap used by the {@link #format} method.
     * Formatting functions are strings (or functions which return strings) which
     * will return the appropriate value when evaluated in the context of the Date object
     * from which the {@link #format} method is called.
     * Add to / override these mappings for custom date formatting.
     *
     * __Note:__ `Ext.Date.format()` treats characters as literals if an appropriate mapping cannot be found.
     *
     * Example:
     *
     *     Ext.Date.formatCodes.x = "Ext.util.Format.leftPad(this.getDate(), 2, '0')";
     *     console.log(Ext.Date.format(new Date(), 'X'); // returns the current day of the month
     * @type Object
     */
    formatCodes: {
        d: "Ext.String.leftPad(m.getDate(), 2, '0')",
        D: "Ext.Date.getShortDayName(m.getDay())", // get localized short day name
        j: "m.getDate()",
        l: "Ext.Date.dayNames[m.getDay()]",
        N: "(m.getDay() ? m.getDay() : 7)",
        S: "Ext.Date.getSuffix(m)",
        w: "m.getDay()",
        z: "Ext.Date.getDayOfYear(m)",
        W: "Ext.String.leftPad(Ext.Date.getWeekOfYear(m), 2, '0')",
        F: "Ext.Date.monthNames[m.getMonth()]",
        m: "Ext.String.leftPad(m.getMonth() + 1, 2, '0')",
        M: "Ext.Date.getShortMonthName(m.getMonth())", // get localized short month name
        n: "(m.getMonth() + 1)",
        t: "Ext.Date.getDaysInMonth(m)",
        L: "(Ext.Date.isLeapYear(m) ? 1 : 0)",
        o: "(m.getFullYear() + (Ext.Date.getWeekOfYear(m) == 1 && m.getMonth() > 0 ? +1 : (Ext.Date.getWeekOfYear(m) >= 52 && m.getMonth() < 11 ? -1 : 0)))",
        Y: "Ext.String.leftPad(m.getFullYear(), 4, '0')",
        y: "('' + m.getFullYear()).substring(2, 4)",
        a: "(m.getHours() < 12 ? 'am' : 'pm')",
        A: "(m.getHours() < 12 ? 'AM' : 'PM')",
        g: "((m.getHours() % 12) ? m.getHours() % 12 : 12)",
        G: "m.getHours()",
        h: "Ext.String.leftPad((m.getHours() % 12) ? m.getHours() % 12 : 12, 2, '0')",
        H: "Ext.String.leftPad(m.getHours(), 2, '0')",
        i: "Ext.String.leftPad(m.getMinutes(), 2, '0')",
        s: "Ext.String.leftPad(m.getSeconds(), 2, '0')",
        u: "Ext.String.leftPad(m.getMilliseconds(), 3, '0')",
        O: "Ext.Date.getGMTOffset(m)",
        P: "Ext.Date.getGMTOffset(m, true)",
        T: "Ext.Date.getTimezone(m)",
        Z: "(m.getTimezoneOffset() * -60)",

        c: function () { // ISO-8601 -- GMT format
            var c = "Y-m-dTH:i:sP", code = [], i, l = c.length, e;
            for (i = 0; i < l; ++i) {
                e = c.charAt(i);
                code.push(e === "T" ? "'T'" : utilDate.getFormatCode(e)); // treat T as a character literal
            }
            return code.join(" + ");
        },

        C: function () { // ISO-1601 -- browser format. UTC numerics with the 'Z' TZ id.
            return 'm.toISOString()';
        },

        U: "Math.round(m.getTime() / 1000)"
    },

    /**
     * Checks if the passed Date parameters will cause a JavaScript Date "rollover".
     * @param {Number} year 4-digit year.
     * @param {Number} month 1-based month-of-year.
     * @param {Number} day Day of month.
     * @param {Number} hour (optional) Hour.
     * @param {Number} minute (optional) Minute.
     * @param {Number} second (optional) Second.
     * @param {Number} millisecond (optional) Millisecond.
     * @return {Boolean} `true` if the passed parameters do not cause a Date "rollover", `false` otherwise.
     */
    isValid: function (y, m, d, h, i, s, ms) {
        // setup defaults
        h = h || 0;
        i = i || 0;
        s = s || 0;
        ms = ms || 0;

        // Special handling for year < 100
        var dt = utilDate.add(new nativeDate(y < 100 ? 100 : y, m - 1, d, h, i, s, ms), utilDate.YEAR, y < 100 ? y - 100 : 0);

        return y === dt.getFullYear() &&
            m === dt.getMonth() + 1 &&
            d === dt.getDate() &&
            h === dt.getHours() &&
            i === dt.getMinutes() &&
            s === dt.getSeconds() &&
            ms === dt.getMilliseconds();
    },

    /**
     * Parses the passed string using the specified date format.
     * Note that this function expects normal calendar dates, meaning that months are 1-based (i.e. 1 = January).
     * The {@link #defaults} hash will be used for any date value (i.e. year, month, day, hour, minute, second or millisecond)
     * which cannot be found in the passed string. If a corresponding default date value has not been specified in the {@link #defaults} hash,
     * the current date's year, month, day or DST-adjusted zero-hour time value will be used instead.
     * Keep in mind that the input date string must precisely match the specified format string
     * in order for the parse operation to be successful (failed parse operations return a 
     * `null` value).
     * 
     * Example:
     *
     *     //dt = Fri May 25 2007 (current date)
     *     var dt = new Date();
     *     
     *     //dt = Thu May 25 2006 (today&#39;s month/day in 2006)
     *     dt = Ext.Date.parse("2006", "Y");
     *     
     *     //dt = Sun Jan 15 2006 (all date parts specified)
     *     dt = Ext.Date.parse("2006-01-15", "Y-m-d");
     *     
     *     //dt = Sun Jan 15 2006 15:20:01
     *     dt = Ext.Date.parse("2006-01-15 3:20:01 PM", "Y-m-d g:i:s A");
     *     
     *     // attempt to parse Sun Feb 29 2006 03:20:01 in strict mode
     *     dt = Ext.Date.parse("2006-02-29 03:20:01", "Y-m-d H:i:s", true); // returns null
     *
     * @param {String} input The raw date string.
     * @param {String} format The expected date string format.
     * @param {Boolean} [strict=false] (optional) `true` to validate date strings while parsing (i.e. prevents JavaScript Date "rollover").
     * Invalid date strings will return `null` when parsed.
     * @return {Date/null} The parsed Date, or `null` if an invalid date string.
     */
    parse: function (input, format, strict) {
        var p = utilDate.parseFunctions;
        if (p[format] == null) {
            utilDate.createParser(format);
        }
        return p[format].call(utilDate, input, Core.isDefined(strict) ? strict : utilDate.useStrict);
    },

    // Backwards compat
    parseDate: function (input, format, strict) {
        return utilDate.parse(input, format, strict);
    },


    /**
     * @private
     */
    getFormatCode: function (character) {
        var f = utilDate.formatCodes[character];

        if (f) {
            f = typeof f === 'function' ? f() : f;
            utilDate.formatCodes[character] = f; // reassign function result to prevent repeated execution
        }

        // note: unknown characters are treated as literals
        return f || ("'" + String.escape(character) + "'");
    },

    /**
     * @private
     */
    createFormat: function (format) {
        var code = [],
            special = false,
            ch = '',
            i;

        for (i = 0; i < format.length; ++i) {
            ch = format.charAt(i);
            if (!special && ch === "\\") {
                special = true;
            } else if (special) {
                special = false;
                code.push("'" + String.escape(ch) + "'");
            } else {
                if (ch === '\n') {
                    code.push("'\\n'");
                } else {
                    code.push(utilDate.getFormatCode(ch));
                }
            }
        }
        utilDate.formatFunctions[format] = Core.functionFactory("var m=this;return " + code.join('+'));
    },

    /**
     * @private
     */
    createParser: function (format) {
        var regexNum = utilDate.parseRegexes.length,
            currentGroup = 1,
            calc = [],
            regex = [],
            special = false,
            ch = "",
            i = 0,
            len = format.length,
            atEnd = [],
            obj;

        for (; i < len; ++i) {
            ch = format.charAt(i);
            if (!special && ch === "\\") {
                special = true;
            } else if (special) {
                special = false;
                regex.push(String.escape(ch));
            } else {
                obj = utilDate.formatCodeToRegex(ch, currentGroup);
                currentGroup += obj.g;
                regex.push(obj.s);
                if (obj.g && obj.c) {
                    if (obj.calcAtEnd) {
                        atEnd.push(obj.c);
                    } else {
                        calc.push(obj.c);
                    }
                }
            }
        }

        calc = calc.concat(atEnd);

        utilDate.parseRegexes[regexNum] = new RegExp("^" + regex.join('') + "$", 'i');
        utilDate.parseFunctions[format] = Core.functionFactory("input", "strict", xf(code, regexNum, calc.join('')));
    },

    /**
     * @private
     */
    parseCodes: {
        /*
         * Notes:
         * g = {Number} calculation group (0 or 1. only group 1 contributes to date calculations.)
         * c = {String} calculation method (required for group 1. null for group 0. {0} = currentGroup - position in regex result array)
         * s = {String} regex pattern. all matches are stored in results[], and are accessible by the calculation mapped to 'c'
         */
        d: {
            g: 1,
            c: "d = parseInt(results[{0}], 10);\n",
            s: "(3[0-1]|[1-2][0-9]|0[1-9])" // day of month with leading zeroes (01 - 31)
        },
        j: {
            g: 1,
            c: "d = parseInt(results[{0}], 10);\n",
            s: "(3[0-1]|[1-2][0-9]|[1-9])" // day of month without leading zeroes (1 - 31)
        },
        D: function () {
            for (var a = [], i = 0; i < 7; a.push(utilDate.getShortDayName(i)), ++i); // get localised short day names
            return {
                g: 0,
                c: null,
                s: "(?:" + a.join("|") + ")"
            };
        },
        l: function () {
            return {
                g: 0,
                c: null,
                s: "(?:" + utilDate.dayNames.join("|") + ")"
            };
        },
        N: {
            g: 0,
            c: null,
            s: "[1-7]" // ISO-8601 day number (1 (monday) - 7 (sunday))
        },
        //<locale type="object" property="parseCodes">
        S: {
            g: 0,
            c: null,
            s: "(?:st|nd|rd|th)"
        },
        //</locale>
        w: {
            g: 0,
            c: null,
            s: "[0-6]" // JavaScript day number (0 (sunday) - 6 (saturday))
        },
        z: {
            g: 1,
            c: "z = parseInt(results[{0}], 10);\n",
            s: "(\\d{1,3})" // day of the year (0 - 364 (365 in leap years))
        },
        W: {
            g: 1,
            c: "W = parseInt(results[{0}], 10);\n",
            s: "(\\d{2})" // ISO-8601 week number (with leading zero)
        },
        F: function () {
            return {
                g: 1,
                c: "m = parseInt(me.getMonthNumber(results[{0}]), 10);\n", // get localised month number
                s: "(" + utilDate.monthNames.join("|") + ")"
            };
        },
        M: function () {
            for (var a = [], i = 0; i < 12; a.push(utilDate.getShortMonthName(i)), ++i); // get localised short month names
            return Core.applyIf({
                s: "(" + a.join("|") + ")"
            }, utilDate.formatCodeToRegex("F"));
        },
        m: {
            g: 1,
            c: "m = parseInt(results[{0}], 10) - 1;\n",
            s: "(1[0-2]|0[1-9])" // month number with leading zeros (01 - 12)
        },
        n: {
            g: 1,
            c: "m = parseInt(results[{0}], 10) - 1;\n",
            s: "(1[0-2]|[1-9])" // month number without leading zeros (1 - 12)
        },
        t: {
            g: 0,
            c: null,
            s: "(?:\\d{2})" // no. of days in the month (28 - 31)
        },
        L: {
            g: 0,
            c: null,
            s: "(?:1|0)"
        },
        o: {
            g: 1,
            c: "y = parseInt(results[{0}], 10);\n",
            s: "(\\d{4})" // ISO-8601 year number (with leading zero)

        },
        Y: {
            g: 1,
            c: "y = parseInt(results[{0}], 10);\n",
            s: "(\\d{4})" // 4-digit year
        },
        y: {
            g: 1,
            c: "var ty = parseInt(results[{0}], 10);\n"
                + "y = ty > me.y2kYear ? 1900 + ty : 2000 + ty;\n", // 2-digit year
            s: "(\\d{2})"
        },
        /*
         * In the am/pm parsing routines, we allow both upper and lower case
         * even though it doesn't exactly match the spec. It gives much more flexibility
         * in being able to specify case insensitive regexes.
         */
        //<locale type="object" property="parseCodes">
        a: {
            g: 1,
            c: "if (/(am)/i.test(results[{0}])) {\n"
                + "if (!h || h == 12) { h = 0; }\n"
                + "} else { if (!h || h < 12) { h = (h || 0) + 12; }}",
            s: "(am|pm|AM|PM)",
            calcAtEnd: true
        },
        //</locale>
        //<locale type="object" property="parseCodes">
        A: {
            g: 1,
            c: "if (/(am)/i.test(results[{0}])) {\n"
                + "if (!h || h == 12) { h = 0; }\n"
                + "} else { if (!h || h < 12) { h = (h || 0) + 12; }}",
            s: "(AM|PM|am|pm)",
            calcAtEnd: true
        },
        //</locale>
        g: {
            g: 1,
            c: "h = parseInt(results[{0}], 10);\n",
            s: "(1[0-2]|[0-9])" //  12-hr format of an hour without leading zeroes (1 - 12)
        },
        G: {
            g: 1,
            c: "h = parseInt(results[{0}], 10);\n",
            s: "(2[0-3]|1[0-9]|[0-9])" // 24-hr format of an hour without leading zeroes (0 - 23)
        },
        h: {
            g: 1,
            c: "h = parseInt(results[{0}], 10);\n",
            s: "(1[0-2]|0[1-9])" //  12-hr format of an hour with leading zeroes (01 - 12)
        },
        H: {
            g: 1,
            c: "h = parseInt(results[{0}], 10);\n",
            s: "(2[0-3]|[0-1][0-9])" //  24-hr format of an hour with leading zeroes (00 - 23)
        },
        i: {
            g: 1,
            c: "i = parseInt(results[{0}], 10);\n",
            s: "([0-5][0-9])" // minutes with leading zeros (00 - 59)
        },
        s: {
            g: 1,
            c: "s = parseInt(results[{0}], 10);\n",
            s: "([0-5][0-9])" // seconds with leading zeros (00 - 59)
        },
        u: {
            g: 1,
            c: "ms = results[{0}]; ms = parseInt(ms, 10)/Math.pow(10, ms.length - 3);\n",
            s: "(\\d+)" // decimal fraction of a second (minimum = 1 digit, maximum = unlimited)
        },
        O: {
            g: 1,
            c: [
                "o = results[{0}];",
                "var sn = o.substring(0,1),", // get + / - sign
                "hr = o.substring(1,3)*1 + Math.floor(o.substring(3,5) / 60),", // get hours (performs minutes-to-hour conversion also, just in case)
                "mn = o.substring(3,5) % 60;", // get minutes
                "o = ((-12 <= (hr*60 + mn)/60) && ((hr*60 + mn)/60 <= 14))? (sn + Ext.String.leftPad(hr, 2, '0') + Ext.String.leftPad(mn, 2, '0')) : null;\n" // -12hrs <= GMT offset <= 14hrs
            ].join("\n"),
            s: "([+-]\\d{4})" // GMT offset in hrs and mins
        },
        P: {
            g: 1,
            c: [
                "o = results[{0}];",
                "var sn = o.substring(0,1),", // get + / - sign
                "hr = o.substring(1,3)*1 + Math.floor(o.substring(4,6) / 60),", // get hours (performs minutes-to-hour conversion also, just in case)
                "mn = o.substring(4,6) % 60;", // get minutes
                "o = ((-12 <= (hr*60 + mn)/60) && ((hr*60 + mn)/60 <= 14))? (sn + Ext.String.leftPad(hr, 2, '0') + Ext.String.leftPad(mn, 2, '0')) : null;\n" // -12hrs <= GMT offset <= 14hrs
            ].join("\n"),
            s: "([+-]\\d{2}:\\d{2})" // GMT offset in hrs and mins (with colon separator)
        },
        T: {
            g: 0,
            c: null,
            s: "[A-Z]{1,5}" // timezone abbrev. may be between 1 - 5 chars
        },
        Z: {
            g: 1,
            c: "zz = results[{0}] * 1;\n" // -43200 <= UTC offset <= 50400
                + "zz = (-43200 <= zz && zz <= 50400)? zz : null;\n",
            s: "([+-]?\\d{1,5})" // leading '+' sign is optional for UTC offset
        },
        c: function () {
            var calc = [],
                arr = [
                    utilDate.formatCodeToRegex("Y", 1), // year
                    utilDate.formatCodeToRegex("m", 2), // month
                    utilDate.formatCodeToRegex("d", 3), // day
                    utilDate.formatCodeToRegex("H", 4), // hour
                    utilDate.formatCodeToRegex("i", 5), // minute
                    utilDate.formatCodeToRegex("s", 6), // second
                    { c: "ms = results[7] || '0'; ms = parseInt(ms, 10)/Math.pow(10, ms.length - 3);\n" }, // decimal fraction of a second (minimum = 1 digit, maximum = unlimited)
                    {
                        c: [ // allow either "Z" (i.e. UTC) or "-0530" or "+08:00" (i.e. UTC offset) timezone delimiters. assumes local timezone if no timezone is specified
                            "if(results[8]) {", // timezone specified
                            "if(results[8] == 'Z'){",
                            "zz = 0;", // UTC
                            "}else if (results[8].indexOf(':') > -1){",
                            utilDate.formatCodeToRegex("P", 8).c, // timezone offset with colon separator
                            "}else{",
                            utilDate.formatCodeToRegex("O", 8).c, // timezone offset without colon separator
                            "}",
                            "}"
                        ].join('\n')
                    }
                ],
                i,
                l;

            for (i = 0, l = arr.length; i < l; ++i) {
                calc.push(arr[i].c);
            }

            return {
                g: 1,
                c: calc.join(""),
                s: [
                    arr[0].s, // year (required)
                    "(?:", "-", arr[1].s, // month (optional)
                    "(?:", "-", arr[2].s, // day (optional)
                    "(?:",
                    "(?:T| )?", // time delimiter -- either a "T" or a single blank space
                    arr[3].s, ":", arr[4].s,  // hour AND minute, delimited by a single colon (optional). MUST be preceded by either a "T" or a single blank space
                    "(?::", arr[5].s, ")?", // seconds (optional)
                    "(?:(?:\\.|,)(\\d+))?", // decimal fraction of a second (e.g. ",12345" or ".98765") (optional)
                    "(Z|(?:[-+]\\d{2}(?::)?\\d{2}))?", // "Z" (UTC) or "-0530" (UTC offset without colon delimiter) or "+08:00" (UTC offset with colon delimiter) (optional)
                    ")?",
                    ")?",
                    ")?"
                ].join("")
            };
        },
        U: {
            g: 1,
            c: "u = parseInt(results[{0}], 10);\n",
            s: "(-?\\d+)" // leading minus sign indicates seconds before UNIX epoch
        }
    },

    //Old Ext.Date prototype methods.
    /**
     * @private
     */
    dateFormat: function (date, format) {
        return utilDate.format(date, format);
    },

    /**
     * Compares if two dates are equal by comparing their values.
     * @param {Date} date1
     * @param {Date} date2
     * @return {Boolean} `true` if the date values are equal
     */
    isEqual: function (date1, date2) {
        // check we have 2 date objects
        if (date1 && date2) {
            return (date1.getTime() === date2.getTime());
        }
        // one or both isn't a date, only equal if both are falsey
        return !(date1 || date2);
    },

    /**
     * Formats a date given the supplied format string.
     * @param {Date} date The date to format
     * @param {String} format The format string
     * @return {String} The formatted date or an empty string if date parameter is not a JavaScript Date object
     */
    format: function (date, format) {
        var formatFunctions = utilDate.formatFunctions;

        if (!Core.isDate(date)) {
            return '';
        }

        if (formatFunctions[format] == null) {
            utilDate.createFormat(format);
        }

        return formatFunctions[format].call(date) + '';
    },

    /**
     * Get the timezone abbreviation of the current date (equivalent to the format specifier 'T').
     *
     * __Note:__ The date string returned by the JavaScript Date object's `toString()` method varies
     * between browsers (e.g. FF vs IE) and system region settings (e.g. IE in Asia vs IE in America).
     * For a given date string e.g. "Thu Oct 25 2007 22:55:35 GMT+0800 (Malay Peninsula Standard Time)",
     * `getTimezone()` first tries to get the timezone abbreviation from between a pair of parentheses
     * (which may or may not be present), failing which it proceeds to get the timezone abbreviation
     * from the GMT offset portion of the date string.
     * 
     *     @example
     *     var dt = new Date('9/17/2011');
     *     console.log(Ext.Date.getTimezone(dt));
     *
     * @param {Date} date The date
     * @return {String} The abbreviated timezone name (e.g. 'CST', 'PDT', 'EDT', 'MPST' ...).
     */
    getTimezone: function (date) {
        // the following list shows the differences between date strings from different browsers on a WinXP SP2 machine from an Asian locale:
        //
        // Opera  : "Thu, 25 Oct 2007 22:53:45 GMT+0800" -- shortest (weirdest) date string of the lot
        // Safari : "Thu Oct 25 2007 22:55:35 GMT+0800 (Malay Peninsula Standard Time)" -- value in parentheses always gives the correct timezone (same as FF)
        // FF     : "Thu Oct 25 2007 22:55:35 GMT+0800 (Malay Peninsula Standard Time)" -- value in parentheses always gives the correct timezone
        // IE     : "Thu Oct 25 22:54:35 UTC+0800 2007" -- (Asian system setting) look for 3-4 letter timezone abbrev
        // IE     : "Thu Oct 25 17:06:37 PDT 2007" -- (American system setting) look for 3-4 letter timezone abbrev
        //
        // this crazy regex attempts to guess the correct timezone abbreviation despite these differences.
        // step 1: (?:\((.*)\) -- find timezone in parentheses
        // step 2: ([A-Z]{1,4})(?:[\-+][0-9]{4})?(?: -?\d+)?) -- if nothing was found in step 1, find timezone from timezone offset portion of date string
        // step 3: remove all non uppercase characters found in step 1 and 2
        return date.toString().replace(/^.* (?:\((.*)\)|([A-Z]{1,5})(?:[\-+][0-9]{4})?(?: -?\d+)?)$/, "$1$2").replace(/[^A-Z]/g, "");
    },

    /**
     * Get the offset from GMT of the current date (equivalent to the format specifier 'O').
     * 
     *     @example
     *     var dt = new Date('9/17/2011');
     *     console.log(Ext.Date.getGMTOffset(dt));
     *
     * @param {Date} date The date
     * @param {Boolean} [colon=false] `true` to separate the hours and minutes with a colon.
     * @return {String} The 4-character offset string prefixed with + or - (e.g. '-0600').
     */
    getGMTOffset: function (date, colon) {
        var offset = date.getTimezoneOffset();
        return (offset > 0 ? "-" : "+")
            + String.leftPad(Math.floor(Math.abs(offset) / 60), 2, "0")
            + (colon ? ":" : "")
            + String.leftPad(Math.abs(offset % 60), 2, "0");
    },

    /**
     * Get the numeric day number of the year, adjusted for leap year.
     * 
     *     @example
     *     var dt = new Date('9/17/2011');
     *     console.log(Ext.Date.getDayOfYear(dt)); // 259
     *
     * @param {Date} date The date
     * @return {Number} 0 to 364 (365 in leap years).
     */
    getDayOfYear: function (date) {
        var num = 0,
            d = utilDate.clone(date),
            m = date.getMonth(),
            i;

        for (i = 0, d.setDate(1), d.setMonth(0); i < m; d.setMonth(++i)) {
            num += utilDate.getDaysInMonth(d);
        }
        return num + date.getDate() - 1;
    },

    /**
     * Get the numeric ISO-8601 week number of the year.
     * (equivalent to the format specifier 'W', but without a leading zero).
     * 
     *     @example
     *     var dt = new Date('9/17/2011');
     *     console.log(Ext.Date.getWeekOfYear(dt)); // 37
     *
     * @param {Date} date The date.
     * @return {Number} 1 to 53.
     * @method
     */
    getWeekOfYear: (function () {
        // adapted from http://www.merlyn.demon.co.uk/weekcalc.htm
        var ms1d = 864e5, // milliseconds in a day
            ms7d = 7 * ms1d; // milliseconds in a week

        return function (date) { // return a closure so constants get calculated only once
            var DC3 = nativeDate.UTC(date.getFullYear(), date.getMonth(), date.getDate() + 3) / ms1d, // an Absolute Day Number
                AWN = Math.floor(DC3 / 7), // an Absolute Week Number
                Wyr = new nativeDate(AWN * ms7d).getUTCFullYear();

            return AWN - Math.floor(nativeDate.UTC(Wyr, 0, 7) / ms7d) + 1;
        };
    }()),

    /**
     * Checks if the current date falls within a leap year.
     * 
     *     @example
     *     var dt = new Date('1/10/2011');
     *     console.log(Ext.Date.isLeapYear(dt)); // false
     *
     * @param {Date} date The date
     * @return {Boolean} `true` if the current date falls within a leap year, `false` otherwise.
     */
    isLeapYear: function (date) {
        var year = date.getFullYear();
        return !!((year & 3) === 0 && (year % 100 || (year % 400 === 0 && year)));
    },

    /**
     * Get the first day of the current month, adjusted for leap year.  The returned value
     * is the numeric day index within the week (0-6) which can be used in conjunction with
     * the {@link #monthNames} array to retrieve the textual day name.
     *
     *      @example
     *      var dt = new Date('1/10/2007'),
     *          firstDay = Ext.Date.getFirstDayOfMonth(dt);
     *      console.log(Ext.Date.dayNames[firstDay]); // output: 'Monday'
     *
     * @param {Date} date The date
     * @return {Number} The day number (0-6).
     */
    getFirstDayOfMonth: function (date) {
        var day = (date.getDay() - (date.getDate() - 1)) % 7;
        return (day < 0) ? (day + 7) : day;
    },

    /**
     * Get the last day of the current month, adjusted for leap year.  The returned value
     * is the numeric day index within the week (0-6) which can be used in conjunction with
     * the {@link #monthNames} array to retrieve the textual day name.
     *
     *      @example
     *      var dt = new Date('1/10/2007'),
     *          lastDay = Ext.Date.getLastDayOfMonth(dt);
     *
     *      console.log(Ext.Date.dayNames[lastDay]); // output: 'Wednesday'
     *
     * @param {Date} date The date
     * @return {Number} The day number (0-6).
     */
    getLastDayOfMonth: function (date) {
        return utilDate.getLastDateOfMonth(date).getDay();
    },


    /**
     * Get the date of the first day of the month in which this date resides.
     * @param {Date} date The date
     * @return {Date}
     */
    getFirstDateOfMonth: function (date) {
        return new nativeDate(date.getFullYear(), date.getMonth(), 1);
    },

    /**
     * Get the date of the last day of the month in which this date resides.
     * @param {Date} date The date
     * @return {Date}
     */
    getLastDateOfMonth: function (date) {
        return new nativeDate(date.getFullYear(), date.getMonth(), utilDate.getDaysInMonth(date));
    },

    /**
     * Get the number of days in the current month, adjusted for leap year.
     * @param {Date} date The date
     * @return {Number} The number of days in the month.
     * @method
     */
    getDaysInMonth: (function () {
        var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        return function (date) { // return a closure for efficiency
            var m = date.getMonth();

            return m === 1 && utilDate.isLeapYear(date) ? 29 : daysInMonth[m];
        };
    }()),

    //<locale type="function">
    /**
     * Get the English ordinal suffix of the current day (equivalent to the format specifier 'S').
     * @param {Date} date The date
     * @return {String} 'st, 'nd', 'rd' or 'th'.
     */
    getSuffix: function (date) {
        switch (date.getDate()) {
            case 1:
            case 21:
            case 31:
                return "st";
            case 2:
            case 22:
                return "nd";
            case 3:
            case 23:
                return "rd";
            default:
                return "th";
        }
    },
    //</locale>

    /**
     * Creates and returns a new Date instance with the exact same date value as the called instance.
     * Dates are copied and passed by reference, so if a copied date variable is modified later, the original
     * variable will also be changed.  When the intention is to create a new variable that will not
     * modify the original instance, you should create a clone.
     *
     * Example of correctly cloning a date:
     *
     *     //wrong way:
     *     var orig = new Date('10/1/2006');
     *     var copy = orig;
     *     copy.setDate(5);
     *     console.log(orig);  // returns 'Thu Oct 05 2006'!
     *
     *     //correct way:
     *     var orig = new Date('10/1/2006'),
     *         copy = Ext.Date.clone(orig);
     *     copy.setDate(5);
     *     console.log(orig);  // returns 'Thu Oct 01 2006'
     *
     * @param {Date} date The date.
     * @return {Date} The new Date instance.
     */
    clone: function (date) {
        return new nativeDate(date.getTime());
    },

    /**
     * Checks if the current date is affected by Daylight Saving Time (DST).
     * @param {Date} date The date
     * @return {Boolean} `true` if the current date is affected by DST.
     */
    isDST: function (date) {
        // adapted from http://sencha.com/forum/showthread.php?p=247172#post247172
        // courtesy of @geoffrey.mcgill
        return new nativeDate(date.getFullYear(), 0, 1).getTimezoneOffset() !== date.getTimezoneOffset();
    },

    /**
     * Attempts to clear all time information from this Date by setting the time to midnight of the same day,
     * automatically adjusting for Daylight Saving Time (DST) where applicable.
     *
     * __Note:__ DST timezone information for the browser's host operating system is assumed to be up-to-date.
     * @param {Date} date The date
     * @param {Boolean} [clone=false] `true` to create a clone of this date, clear the time and return it.
     * @return {Date} this or the clone.
     */
    clearTime: function (date, clone) {
        // handles invalid dates preventing the browser from crashing.
        if (isNaN(date.getTime())) {
            return date;
        }

        if (clone) {
            return utilDate.clearTime(utilDate.clone(date));
        }

        // get current date before clearing time
        var d = date.getDate(),
            hr,
            c;

        // clear time
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);

        if (date.getDate() !== d) { // account for DST (i.e. day of month changed when setting hour = 0)
            // note: DST adjustments are assumed to occur in multiples of 1 hour (this is almost always the case)
            // refer to http://www.timeanddate.com/time/aboutdst.html for the (rare) exceptions to this rule

            // increment hour until cloned date == current date
            for (hr = 1, c = utilDate.add(date, utilDate.HOUR, hr); c.getDate() !== d; hr++ , c = utilDate.add(date, utilDate.HOUR, hr));

            date.setDate(d);
            date.setHours(c.getHours());
        }

        return date;
    },

    /**
     * Provides a convenient method for performing basic date arithmetic. This method
     * does not modify the Date instance being called - it creates and returns
     * a new Date instance containing the resulting date value.
     *
     * Examples:
     *
     *     // Basic usage:
     *     var dt = Ext.Date.add(new Date('10/29/2006'), Ext.Date.DAY, 5);
     *     console.log(dt); // returns 'Fri Nov 03 2006 00:00:00'
     *
     *     // Negative values will be subtracted:
     *     var dt2 = Ext.Date.add(new Date('10/1/2006'), Ext.Date.DAY, -5);
     *     console.log(dt2); // returns 'Tue Sep 26 2006 00:00:00'
     *
     *      // Decimal values can be used:
     *     var dt3 = Ext.Date.add(new Date('10/1/2006'), Ext.Date.DAY, 1.25);
     *     console.log(dt3); // returns 'Mon Oct 02 2006 06:00:00'
     *
     * @param {Date} date The date to modify
     * @param {String} interval A valid date interval enum value.
     * @param {Number} value The amount to add to the current date.
     * @return {Date} The new Date instance.
     */
    add: function (date, interval, value) {
        var d = utilDate.clone(date),
            day, decimalValue, base = 0;
        if (!interval || value === 0) {
            return d;
        }

        decimalValue = value - parseInt(value, 10);
        value = parseInt(value, 10);

        if (value) {
            switch (interval.toLowerCase()) {
                // See EXTJSIV-7418. We use setTime() here to deal with issues related to
                // the switchover that occurs when changing to daylight savings and vice
                // versa. setTime() handles this correctly where setHour/Minute/Second/Millisecond
                // do not. Let's assume the DST change occurs at 2am and we're incrementing using add
                // for 15 minutes at time. When entering DST, we should see:
                // 01:30am
                // 01:45am
                // 03:00am // skip 2am because the hour does not exist
                // ...
                // Similarly, leaving DST, we should see:
                // 01:30am
                // 01:45am
                // 01:00am // repeat 1am because that's the change over
                // 01:30am
                // 01:45am
                // 02:00am
                // ....
                // 
                case utilDate.MILLI:
                    d.setTime(d.getTime() + value);
                    break;
                case utilDate.SECOND:
                    d.setTime(d.getTime() + value * 1000);
                    break;
                case utilDate.MINUTE:
                    d.setTime(d.getTime() + value * 60 * 1000);
                    break;
                case utilDate.HOUR:
                    d.setTime(d.getTime() + value * 60 * 60 * 1000);
                    break;
                case utilDate.DAY:
                    d.setDate(d.getDate() + value);
                    break;
                case utilDate.MONTH:
                    day = date.getDate();
                    if (day > 28) {
                        day = Math.min(day, utilDate.getLastDateOfMonth(utilDate.add(utilDate.getFirstDateOfMonth(date), utilDate.MONTH, value)).getDate());
                    }
                    d.setDate(day);
                    d.setMonth(date.getMonth() + value);
                    break;
                case utilDate.YEAR:
                    day = date.getDate();
                    if (day > 28) {
                        day = Math.min(day, utilDate.getLastDateOfMonth(utilDate.add(utilDate.getFirstDateOfMonth(date), utilDate.YEAR, value)).getDate());
                    }
                    d.setDate(day);
                    d.setFullYear(date.getFullYear() + value);
                    break;
            }
        }

        if (decimalValue) {
            switch (interval.toLowerCase()) {
                case utilDate.MILLI: base = 1; break;
                case utilDate.SECOND: base = 1000; break;
                case utilDate.MINUTE: base = 1000 * 60; break;
                case utilDate.HOUR: base = 1000 * 60 * 60; break;
                case utilDate.DAY: base = 1000 * 60 * 60 * 24; break;

                case utilDate.MONTH:
                    day = utilDate.getDaysInMonth(d);
                    base = 1000 * 60 * 60 * 24 * day;
                    break;

                case utilDate.YEAR:
                    day = (utilDate.isLeapYear(d) ? 366 : 365);
                    base = 1000 * 60 * 60 * 24 * day;
                    break;
            }
            if (base) {
                d.setTime(d.getTime() + base * decimalValue);
            }
        }

        return d;
    },

    /**
     * Provides a convenient method for performing basic date arithmetic. This method
     * does not modify the Date instance being called - it creates and returns
     * a new Date instance containing the resulting date value.
     * 
     * Examples:
     *
     *     // Basic usage:
     *     var dt = Ext.Date.subtract(new Date('10/29/2006'), Ext.Date.DAY, 5);
     *     console.log(dt); // returns 'Tue Oct 24 2006 00:00:00'
     *
     *     // Negative values will be added:
     *     var dt2 = Ext.Date.subtract(new Date('10/1/2006'), Ext.Date.DAY, -5);
     *     console.log(dt2); // returns 'Fri Oct 6 2006 00:00:00'
     *
     *      // Decimal values can be used:
     *     var dt3 = Ext.Date.subtract(new Date('10/1/2006'), Ext.Date.DAY, 1.25);
     *     console.log(dt3); // returns 'Fri Sep 29 2006 06:00:00'
     * 
     * @param {Date} date The date to modify
     * @param {String} interval A valid date interval enum value.
     * @param {Number} value The amount to subtract from the current date.
     * @return {Date} The new Date instance.
     */
    subtract: function (date, interval, value) {
        return utilDate.add(date, interval, -value);
    },

    /**
     * Checks if a date falls on or between the given start and end dates.
     * @param {Date} date The date to check
     * @param {Date} start Start date
     * @param {Date} end End date
     * @return {Boolean} `true` if this date falls on or between the given start and end dates.
     */
    between: function (date, start, end) {
        var t = date.getTime();
        return start.getTime() <= t && t <= end.getTime();
    },

    //Maintains compatibility with old static and prototype window.Date methods.
    compat: function (...params) {
        var p,
            statics = ['useStrict', 'formatCodeToRegex', 'parseFunctions', 'parseRegexes', 'formatFunctions', 'y2kYear', 'MILLI', 'SECOND', 'MINUTE', 'HOUR', 'DAY', 'MONTH', 'YEAR', 'defaults', 'dayNames', 'monthNames', 'monthNumbers', 'getShortMonthName', 'getShortDayName', 'getMonthNumber', 'formatCodes', 'isValid', 'parseDate', 'getFormatCode', 'createFormat', 'createParser', 'parseCodes'],
            proto = ['dateFormat', 'format', 'getTimezone', 'getGMTOffset', 'getDayOfYear', 'getWeekOfYear', 'isLeapYear', 'getFirstDayOfMonth', 'getLastDayOfMonth', 'getDaysInMonth', 'getSuffix', 'clone', 'isDST', 'clearTime', 'add', 'between'],
            sLen = statics.length,
            pLen = proto.length,
            stat, prot, s;

        //Append statics
        for (s = 0; s < sLen; s++) {
            stat = statics[s];
            nativeDate[stat] = utilDate[stat];
        }

        //Append to prototype
        for (p = 0; p < pLen; p++) {
            prot = proto[p];
            nativeDate.prototype[prot] = function () {
                var args = Array.prototype.slice.call(arguments);
                args.unshift(this);
                return utilDate[prot].apply(utilDate, args);
            };
        }
    },

    /**
     * Calculate how many units are there between two time.
     * @param {Date} min The first time.
     * @param {Date} max The second time.
     * @param {String} unit The unit. This unit is compatible with the date interval constants.
     * @return {Number} The maximum number n of units that min + n * unit <= max.
     */
    diff: function (min, max, unit) {
        var est, diff = +max - min;
        switch (unit) {
            case utilDate.MILLI:
                return diff;
            case utilDate.SECOND:
                return Math.floor(diff / 1000);
            case utilDate.MINUTE:
                return Math.floor(diff / 60000);
            case utilDate.HOUR:
                return Math.floor(diff / 3600000);
            case utilDate.DAY:
                return Math.floor(diff / 86400000);
            case 'w':
                return Math.floor(diff / 604800000);
            case utilDate.MONTH:
                est = (max.getFullYear() * 12 + max.getMonth()) - (min.getFullYear() * 12 + min.getMonth());
                if (utilDate.add(min, unit, est) > max) {
                    return est - 1;
                }
                return est;
            case utilDate.YEAR:
                est = max.getFullYear() - min.getFullYear();
                if (utilDate.add(min, unit, est) > max) {
                    return est - 1;
                } else {
                    return est;
                }
        }
    },

    /**
     * Align the date to `unit`.
     * @param {Date} date The date to be aligned.
     * @param {String} unit The unit. This unit is compatible with the date interval constants.
     * @return {Date} The aligned date.
     */
    align: function (date, unit, step) {
        var num = new nativeDate(+date);

        switch (unit.toLowerCase()) {
            case utilDate.MILLI:
                return num;
            case utilDate.SECOND:
                num.setUTCSeconds(num.getUTCSeconds() - num.getUTCSeconds() % step);
                num.setUTCMilliseconds(0);
                return num;
            case utilDate.MINUTE:
                num.setUTCMinutes(num.getUTCMinutes() - num.getUTCMinutes() % step);
                num.setUTCSeconds(0);
                num.setUTCMilliseconds(0);
                return num;
            case utilDate.HOUR:
                num.setUTCHours(num.getUTCHours() - num.getUTCHours() % step);
                num.setUTCMinutes(0);
                num.setUTCSeconds(0);
                num.setUTCMilliseconds(0);
                return num;
            case utilDate.DAY:
                if (step === 7 || step === 14) {
                    num.setUTCDate(num.getUTCDate() - num.getUTCDay() + 1);
                }
                num.setUTCHours(0);
                num.setUTCMinutes(0);
                num.setUTCSeconds(0);
                num.setUTCMilliseconds(0);
                return num;
            case utilDate.MONTH:
                num.setUTCMonth(num.getUTCMonth() - (num.getUTCMonth() - 1) % step, 1);
                num.setUTCHours(0);
                num.setUTCMinutes(0);
                num.setUTCSeconds(0);
                num.setUTCMilliseconds(0);
                return num;
            case utilDate.YEAR:
                num.setUTCFullYear(num.getUTCFullYear() - num.getUTCFullYear() % step, 1, 1);
                num.setUTCHours(0);
                num.setUTCMinutes(0);
                num.setUTCSeconds(0);
                num.setUTCMilliseconds(0);
                return date;
        }
    },
};

utilDate = lDate;
export default lDate;

