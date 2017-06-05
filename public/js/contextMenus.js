var menu = new BootstrapMenu('.filter', {
  /* a function to know which row was the context menu opened on,
   * given the selected DOM element. When this function is defined,
   * every user-defined action callback receives its return value as
   * an argument. */
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

var dateMenu = new BootstrapMenu('.filter-date', {
  /* a function to know which row was the context menu opened on,
   * given the selected DOM element. When this function is defined,
   * every user-defined action callback receives its return value as
   * an argument. */
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