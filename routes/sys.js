module.exports = {
    
    getDateFormat: function () {
        return 'dd-MM-yyyy';
    },
    
    getDate: function (dateObj) {
        if (!dateObj)
            return null;

        var day   = this._pad2(dateObj.getDate());
        var month = this._pad2(dateObj.getMonth() + 1);
        var year  = dateObj.getFullYear() + '';

        var format = this.getDateFormat();

        if (format == 'dd-MM-yyyy')
            return day + '-' + month + '-' + year;

        // yyyy-MM-ddd
        return year + '-' + month + '-' + day;
    },
    
    getTime: function (dateObj) {
        if (!dateObj)
            return null;
        
        var hours = this._pad2(dateObj.getHours());
        var mins  = this._pad2(dateObj.getMinutes());
        var secs  = this._pad2(dateObj.getSeconds());
        
        return hours + ':' + mins + ':' + secs;
    },
    
    getDateTime: function (dateObj) {
        if (!dateObj)
            return null;
        
        return this.getDate(dateObj) + ' ' + this.getTime(dateObj);
    },
    
    getProperty: function (name, callback) {
        const model = require('./model');
        model.get('Property', 'name', name, function(entity) {
            if (!entity)
                callback(null);
            else if (entity.type == 'Boolean')
                callback(Boolean(entity.value));
            else if (entity.type == 'Number')
                callback(Number(entity.value));
            else
                callback(String(entity.value));
        });
    },
    
    _pad2: function (num) {
        return (num < 10) ? '0' + num : '' + num;
    },
    
    _getTimeZone: function() {
        return 'AEST';
    },
    
    addTimeZoneOffset: function (dateObj, tz) {
        
        var hoursInMs = 3600000;
        
        var offSets = {
            "AEST": 10,
            "AEDT": 11,
            "CEST": 2
        };
        
        var hours = offSets[tz];
        var offset = hours * hoursInMs;
        
        var ms = dateObj.getTime() + offset;
        
        var newDate = new Date();
        newDate.setTime(ms);
        
        return newDate;
    }
    
    
    
};