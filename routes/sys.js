// This module contains common functions used by all other modules
module.exports = {
    
    // Called by routers for each form
    // @return an Object for an input to be used by input.pug
    getFieldObj: function(entity, type, name, label, isDisabled, isMandatory, options, foreignKind) {
        
        // reference field Icons
        var glyphicons = {
            'User'  : 'user',
            'Store' : 'home',
            'Beacon': 'info-sign'
        };
        
        var fieldValue = entity[name];
        if (type == 'DateTime')
            fieldValue = this.getDisplayValue(fieldValue);
            
        var obj = {
            'type'       : type,
            'name'       : name,
            'label'      : label,
            'value'      : fieldValue,
            'isMandatory': isMandatory,
            'isDisabled' : isDisabled
        };
        
        if (options)
            obj.options = options;
        
        if (foreignKind) {
            obj.kind = foreignKind;
            obj.icon = glyphicons[foreignKind];
            obj.path = 'https://iradar-dev.appspot.com/' + foreignKind.toLowerCase() + 's/' + fieldValue + '/edit';
        }
        
        return obj;
    },
    
    // Get the current date and time in AEST
    // @return date/time string in "yyyy-MM-dd HH:mm:ss" format
    getNow: function () {
        var date = new Date();
        date.setTime(date.getTime() + 36000000); // add 10 hours for AEST
        
        var year  = date.getFullYear();
        var month = this.pad2(date.getMonth() + 1);
        var day   = this.pad2(date.getDate());
        var hour  = this.pad2(date.getHours());
        var min   = this.pad2(date.getMinutes());
        var sec   = this.pad2(date.getSeconds());
        
        return year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
    },
    
    // Convert a date/time string to "dd-MM-yyyy HH:mm:ss" format - the common display format for all date-time fields
    // @input a date/time string in "yyyy-MM-dd HH:mm:ss" format
    // @return a date/time string in "dd-MM-yyyy HH:mm:ss" format
    getDisplayValue(dateStr) {
        if (!dateStr)
            return '';
        if (typeof dateStr != 'string')
            dateStr = String(dateStr);
        if (dateStr.match(/^[0-3][0-9]-[01][0-9]-[0-9]{4}\s[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$/) != null)
            return dateStr;
        if (dateStr.match(/^[0-9]{4}-[01][0-9]-[0-3][0-9]\s[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$/) == null)
            return '';
        
        var date = dateStr.substring(0,10);
        date = date.split('-').reverse().join('-');
        var time = dateStr.substring(10);
        return date + time; // + this.getTimeAgo(dateStr);
    },
    
    // Convert a date/time string to "yyyy-MM-dd HH:mm:ss" format - The format dates are stored in the database to enable sorting
    // @input a date/time string in "dd-MM-yyyy HH:mm:ss" format
    // @return a date/time string in "yyyy-MM-dd HH:mm:ss" format
    getValue(dateStr) {
        if (!dateStr)
            return '';
        if (typeof dateStr != 'string')
            dateStr = String(dateStr);
        if (dateStr.match(/^[0-9]{4}-[01][0-9]-[0-3][0-9]\s[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$/) != null)
            return dateStr;
        if (dateStr.match(/^[0-3][0-9]-[01][0-9]-[0-9]{4}\s[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$/) == null)
            return '';
        
        var date = dateStr.substring(0,10);
        date = date.split('-').reverse().join('-');
        var time = dateStr.substring(10);
        return date + time;
    },
    
    // Get a descriptive string for the relative time since the given date
    // @input date string
    // @return string
    getTimeAgo: function(dateStr) {
        var date;
        try {
            date = new Date(dateStr);
        } catch (ex) { }
        if (!date)
            return '';
        
        var now = new Date(this.getNow());
        
        var ms = now.getTime() - date.getTime();
        
        var inPast = true;
        if (ms < 0) {
            inPast = false;
            ms *= -1;
        }
        
        if (ms < 2000) {
            return ' (now)';
        }
        
        var sec  = 1000;
        var min  = 60000;
        var hour = 3600000;
        var day  = 86400000;
        var mth  = 2628000000;
        var year = 31536000000;
        
        var years = Math.floor(ms / year);
        ms -= years * year;
        var months= Math.floor(ms / mth);
        ms -= months * mth;
        var days  = Math.floor(ms / day);
        ms -= days * day;
        var hours = Math.floor(ms / hour);
        ms -= hours * hour;
        var mins  = Math.floor(ms / min);
        ms -= mins * min;
        var secs  = Math.floor(ms / sec);
        ms -= secs * sec;
        
        var units = [];
        if (years > 0)
            units.push(years  + 'y');
        if (months > 0)
            units.push(months + 'mo');
        if (days > 0)
            units.push(days   + 'd');
        if (hours > 0)
            units.push(hours  + 'h');
        if (mins > 0)
            units.push(mins   + 'm');
        if (secs > 0)
            units.push(secs   + 's');
        
        var str = ' (';
        if (units[0])
            str += units[0];
        if (units[1])
            str += ' ' + units[1];
        str += inPast ? ' ago' : ' from now';
        str += ')';
        
        return str;
    },
    
    // Pad a number to 2 digits
    pad2: function(num) {
        return num < 10 ? '0' + num : '' + num;
    },
    
    // Add a message to the stack stored in the user's session
    addMessage: function(req, msg) {
        if (!req.session.messages)
            req.session.messages = [];
        req.session.messages.push({'msg':String(msg),'type':'info'});
    },
    
    // Add an error message to the stack stored in the user's session
    addError: function(req, msg) {
        if (!req.session.messages)
            req.session.messages = [];
        req.session.messages.push({'msg':String(msg),'type':'danger'});
    },
    
    
    // Get all the messages stored in the stack in the user's session, and clear the stack
    getMessages: function(req) {
        var messages = [];
        if (req.session.messages && req.session.messages.length) {
            for (var i = 0; i < req.session.messages.length; i++)
                messages.push(req.session.messages[i]);
        }
        req.session.messages = [];
        return messages;
    },
    
    // Sort an array of objects by a given property
    // @input unsorted array of objects, property name (string), boolean to indicate descending order (optional)
    // @return sorted array of objects
    sort: function(objArr, orderBy, desc) {
        
        if (!objArr || objArr.length || objArr.length < 2 || !orderBy)
            return objArr;
        
        if (orderBy.match(/DESC$/) != null) {
            orderBy = orderBy.replace(/DESC$/, '');
            desc = true;
        }
        
        if (desc) {
            // Sort descending
            objArr.sort(function(a, b) {
                if (a[orderBy] > b[orderBy]) return -1;
                if (a[orderBy] < b[orderBy]) return 1;
                return 0;
            });
        } else {
            // Sort ascending
            objArr.sort(function(a, b) {
                if (a[orderBy] < b[orderBy]) return -1;
                if (a[orderBy] > b[orderBy]) return 1;
                return 0;
            });
        }
        return objArr;
    },
    
    // filter an array of objects with an encoded query string
    filter: function(list, query, crumbs, url) {
        if (!query)
            return list;
        
        var filters = query.split('^');
        var i, filter, field, operator, searchValue;
        
        for (i = 0; i < filters.length; i++) {
            filter = String(filters[i]);

            // Breadcrumbs
            if (i != 0)
                url += '^';
            url += filter;
            crumbs.push({
                'label': String(filter),
                'url'  : String(url)
            });
            
            // Filters
            field       = String(filter.match(/^[a-z_]+/i)[0]);
            operator    = String(filter.match(/(>=|<=|>|<|!\*|=\*|!=|=)/)[0]); // Operators: = != > >= < <= !* =*
            searchValue = String(filter.match(/[^\=\!\>\<\*]+$/)[0]) || '';

            if (searchValue === 'true')
                searchValue = true;
            if (searchValue === 'false')
                searchValue = false;

            // look through list and push any matching Beacons into filteredList
            var j, b, entityValue, filteredList = [];
            for (j = 0; j < list.length; j++) {
                if (!list[j] || list[j][field] === undefined) {
                    continue;
                }
                entityValue = String(list[j][field]);
                if (entityValue === 'true')
                    entityValue = true;
                if (entityValue === 'false')
                    entityValue = false;

                if (operator == '>=') {
                    if (entityValue >= searchValue) {
                        filteredList.push(list[j]);
                    }
                } else if (operator == '<=') {
                    if (entityValue <= searchValue) {
                        filteredList.push(list[j]);
                    }
                } else if (operator == '>') {
                    if (entityValue > searchValue) {
                        filteredList.push(list[j]);
                    }
                } else if (operator == '<') {
                    if (entityValue < searchValue) {
                        filteredList.push(list[j]);
                    }
                } else if (operator == '!*') {
                    if (entityValue.indexOf(searchValue) == -1) {
                        filteredList.push(list[j]);
                    }
                } else if (operator == '=*') {
                    if (entityValue.indexOf(searchValue) != -1) {
                        filteredList.push(list[j]);
                    }
                } else if (operator == '!=') {
                    if (entityValue !== searchValue) {
                        filteredList.push(list[j]);
                    }
                } else if (operator == '=') {
                    if (entityValue === searchValue) {
                        filteredList.push(list[j]);
                    }
                }
            }
            list = filteredList;
        }
        return list;
    },
    
    type: 'sys'
};