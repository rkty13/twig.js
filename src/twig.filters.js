//     Twig.js
//     Copyright (c) 2011-2012 John Roepke
//     Available under the BSD 2-Clause License
//     https://github.com/justjohn/twig.js

// ## twig.filters.js
//
// This file handles parsing filters.
var Twig = (function (Twig) {

    // Determine object type
    function is(type, obj) {
        var clas = Object.prototype.toString.call(obj).slice(8, -1);
        return obj !== undefined && obj !== null && clas === type;
    }

    Twig.filters = {
        // String Filters
        upper:  function(value) {
            return value.toUpperCase();
        },
        lower: function(value) {
            return value.toLowerCase();
        },
        capitalize: function(value) {
            return value.substr(0, 1).toUpperCase() + value.substr(1);
        },
        title: function(value) {
            return value.replace( /(^|\s)([a-z])/g , function(m, p1, p2){
                return p1 + p2.toUpperCase();
            });
        },
        length: function(value) {
            if (value instanceof Array || typeof value === "string") {
                return value.length;
            } else if (value instanceof Object) {
                if (value._keys === undefined) {
                    return Object.keys(value).length;
                } else {
                    return value._keys.length;
                }
            }
        },

        // Array/Object Filters
        reverse: function(value) {
            if (is("Array", value)) {
                return value.reverse();
            } else if (is("String", value)) {
                return value.split("").reverse().join("");
            } else {
                var keys = value._keys || Object.keys(value).reverse();
                value._keys = keys;
                return value;
            }
        },
        sort: function(value) {
            if (is("Array", value)) {
                return value.sort();
            } else if (value instanceof Object) {
                // Sorting objects isn't obvious since the order of
                // returned keys isn't guaranteedin JavaScript.
                // Because of this we use a "hidden" key called _keys to
                // store the keys in the order we want to return them.

                delete value._keys;
                var keys = Object.keys(value),
                    sorted_keys = keys.sort(function(a, b) {
                        return value[a] > value[b];
                    });
                value._keys = sorted_keys;
                return value;
            }
        },
        keys: function(value) {
            var keyset = value._keys || Object.keys(value),
                output = [];

            keyset.forEach(function(key) {
                if (key === "_keys") return; // Ignore the _keys property
                if (value.hasOwnProperty(key)) {
                    output.push(key);
                }
            });
            return output;
        },
        url_encode: function(value) {
            return encodeURIComponent(value);
        },
        join: function(value, params) {
            var join_str = "",
                output = [],
                keyset = null;

            if (params && params[0]) {
                join_str = params[0];
            }
            if (value instanceof Array) {
                output = value;
            } else {
                keyset = value._keys || Object.keys(value);
                keyset.forEach(function(key) {
                    if (key === "_keys") return; // Ignore the _keys property
                    if (value.hasOwnProperty(key)) {
                        output.push(value[key]);
                    }
                });
            }
            return output.join(join_str);
        },
        "default": function(value, params) {
            if (params === undefined || params.length !== 1) {
                throw new Twig.Error("default filter expects one argument");
            }
            if (value === undefined || value === null || value === '' ) {
                return params[0];
            } else {
                return value;
            }
        },
        json_encode: function(value) {
            delete value._keys;
            return JSON.stringify(value);
        },
        merge: function(value, params) {
            var obj = [],
                arr_index = 0,
                keyset = [];

            // Check to see if all the objects being merged are arrays
            if (!(value instanceof Array)) {
                // Create obj as an Object
                obj = { };
            } else {
                params.forEach(function(param) {
                    if (!(param instanceof Array)) {
                        obj = { };
                    }
                });
            }
            if (!(obj instanceof Array)) {
                obj._keys = [];
            }

            if (value instanceof Array) {
                value.forEach(function(val) {
                    if (obj._keys) obj._keys.unshift(arr_index);
                    obj[arr_index] = val;
                    arr_index++;
                });
            } else {
                keyset = value._keys || Object.keys(value);
                keyset.forEach(function(key) {
                    obj[key] = value[key];
                    obj._keys.push(key);

                    // Handle edge case where a number index in an object is greater than
                    //   the array counter. In such a case, the array counter is increased
                    //   one past the index.
                    //
                    // Example {{ ["a", "b"]|merge({"4":"value"}, ["c", "d"])
                    // Without this, d would have an index of "4" and overwrite the value
                    //   of "value"
                    var int_key = parseInt(key, 10);
                    if (!isNaN(int_key) && int_key >= arr_index) {
                        arr_index = int_key + 1;
                    }
                });
            }

            // mixin the merge arrays
            params.forEach(function(param) {
                if (param instanceof Array) {
                    param.forEach(function(val) {
                        if (obj._keys) obj._keys.push(arr_index);
                        obj[arr_index] = val;
                        arr_index++;
                    });
                } else {
                    keyset = param._keys || Object.keys(param);
                    keyset.forEach(function(key) {
                        if (!obj[key]) obj._keys.unshift(key);
                        obj[key] = param[key];

                        var int_key = parseInt(key, 10);
                        if (!isNaN(int_key) && int_key >= arr_index) {
                            arr_index = int_key + 1;
                        }
                    });
                }
            })
            if (params.length === 0) {
                throw new Twig.Error("Filter merge expects at least one parameter");
            }

            return obj;
        },
        date: function(value, params) {
            var date = new Date(value);
            if (date.getDate() === NaN)
            {
                // Firefox can't instanciate a new Date from a string.
                // Shame on it
                date.setFromString(value);
            }
            return date.format(params[0]);
        },

        replace: function(value, params) {
            var pairs = params[0],
                tag;
            for (tag in pairs) {
                if (pairs.hasOwnProperty(tag) && tag !== "_keys") {
                    value = value.replace(tag, pairs[tag]);
                }
            }
            return value;
        },

        format: function(value, params) {
            return Twig.lib.vsprintf(value, params);
        },

        striptags: function(value) {
            return Twig.lib.strip_tags(value);
        },

        escape: function(value) {
            return value.replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");
        },

        /* Alias of escape */
        "e": function(value) {
            return Twig.filters.escape(value);
        },

        nl2br: function(value) {
            var br = '<br />';
            return Twig.filters.escape(value)
                        .replace(/\r\n/g, br)
                        .replace(/\r/g, br)
                        .replace(/\n/g, br);
        },

        /**
         * Adapted from: http://phpjs.org/functions/number_format:481
         */ 
        number_format: function(value, params) {
            var number = value;

            if (params instanceof Array) {
                var decimals = params[0] ? params[0] : undefined,
                    dec_point = params[1] ? params[1] : undefined,
                    thousands_sep = params[2] ? params[2] : undefined;
            }

            number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
            var n = !isFinite(+number) ? 0 : +number,
                prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
                sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
                dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
                s = '',
                toFixedFix = function (n, prec) {
                    var k = Math.pow(10, prec);
                    return '' + Math.round(n * k) / k;
                };
            // Fix for IE parseFloat(0.55).toFixed(0) = 0;
            s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
            if (s[0].length > 3) {
                s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
            }
            if ((s[1] || '').length < prec) {
                s[1] = s[1] || '';
                s[1] += new Array(prec - s[1].length + 1).join('0');
            }
            return s.join(dec);
        }

        /* convert_encoding,
        raw */
    };

    Twig.filter = function(filter, value, params) {
        if (!Twig.filters[filter]) {
            throw "Unable to find filter " + filter;
        }
        return Twig.filters[filter].apply(this, [value, params]);
    }

    Twig.filter.extend = function(filter, definition) {
        Twig.filters[filter] = definition;
    };

    return Twig;

})(Twig || { });