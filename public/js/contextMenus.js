/* Uses BootstrapMenu.js to implement a context menu on table data elements in the list views.
   The items in the menu add different filter parameters to the URL for refining search results */

/* Provides basic 'equivalent' and 'not equivalent' filters for String fields */
var menu = new BootstrapMenu('.filter', {
    fetchElementData: function($td) {
        return String($td.data('filter'));
    },
    actions: [{
        name: 'Show matching',
        onClick: function(filter) {
            addQuery(filter);
        }
    },{
        name: 'Filter out',
        onClick: function(filter) {
            addQuery(filter.replace(/=/, '!='));
        }
    }]
});

/* Provides various filters for filtering date/time fields */
var dateMenu = new BootstrapMenu('.filter-date', {
    fetchElementData: function($td) {
        return String($td.data('filter'));
    },
    actions: [{
        name: 'Show matching time',
        onClick: function(filter) {
            addQuery(filter);
        }
    },{
        name: 'Filter out time',
        onClick: function(filter) {
            addQuery(String(filter).replace(/=/, '!='));
        }
    },{
        name: 'Show matching date',
        onClick: function(filter) {
            filter = filter.substring(0, filter.indexOf(' ')); // trim time
            filter = filter.replace(/=/, '=*');
            addQuery(filter);
        }
    },{
        name: 'Filter out date',
        onClick: function(filter) {
            filter = filter.substring(0, filter.indexOf(' ')); // trim time
            filter = filter.replace(/=/, '!*');
            addQuery(filter);
        }
    },{
        name: 'Show at and before this time',
        onClick: function(filter) {
            filter = filter.substring(0, filter.indexOf(' ')); // trim time
            filter = filter.replace(/=/, '<=');
            addQuery(filter);
        }
    },{
        name: 'Show at and after this time',
        onClick: function(filter) {
            filter = filter.substring(0, filter.indexOf(' ')); // trim time
            filter = filter.replace(/=/, '>=');
            addQuery(filter);
        }
    },{
        name: 'Show before this time',
        onClick: function(filter) {
            filter = filter.substring(0, filter.indexOf(' ')); // trim time
            filter = filter.replace(/=/, '<');
            addQuery(filter);
        }
    },{
        name: 'Show after this time',
        onClick: function(filter) {
            filter = filter.substring(0, filter.indexOf(' ')); // trim time
            filter = filter.replace(/=/, '>');
            addQuery(filter);
        }
    }]
});