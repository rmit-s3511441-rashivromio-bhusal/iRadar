module.exports = {
    
    getFieldObj: function(entity, type, name, label, isDisabled, isMandatory, options, foreignKind) {
        
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
    
    getTimeAgo: function(dateStr) {
        var date;
        try {
            date = new Date(dateStr);
        } catch (ex) { }
        if (!date)
            return;
        
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
    
    pad2: function(num) {
        return num < 10 ? '0' + num : '' + num;
    },
    
    type: 'sys'
};