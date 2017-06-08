/*  */
function listSelectorToggled() {
    var allChecked = true;
    var listSelectors = document.getElementsByClassName('list-selector');
    for (var i = 0; i < listSelectors.length; i++) {
        if (!listSelectors[i].checked) {
            allChecked = false;
            break;
        }
    }
    gel('cbc-all').checked = allChecked;
    getList();
}

function selectList() {
    var isChecked = gel('cbc-all').checked;
    var listSelectors = document.getElementsByClassName('list-selector');
    for (var i = 0; i < listSelectors.length; i++) {
        listSelectors[i].checked = isChecked;
    }
    getList();
}

function getList() {
    // get list
    var list = [];
    var listSelectors = document.getElementsByClassName('list-selector');
    for (var i = 0; i < listSelectors.length; i++) {
        if (listSelectors[i].checked == true) {
            list.push(String(listSelectors[i].getAttribute('data-for')));
        }
    }
    gel('bulkList').value = list.join(',');
    gel('bulkList2').value = list.join(',');
}

function setParameter(parm, value) {
    console.log('addParameter('+parm+','+value+')');
    var url = String(window.location);
    var regex = new RegExp('\\b\\&?'+parm+'=[^\\&]*', 'gi');
    url = url.replace(regex, '');
    url = url.replace(/\?\&/, '?');
    if (url.match(/\?/) == null) {
        window.location = url + '?' + parm + '=' + value;
        return;
    }
    if (url.match(/\?$/) != null) {
        window.location = url + parm + '=' + value;
        return;
    }
    window.location = url + '&' + parm + '=' + value;
}

function addQuery(str) { 
    console.log('addQuery('+str+')');
    var url = String(window.location);
    var regex = new RegExp('\\bquery=[^\\&]*', 'gi');
    var query = url.match(regex);
    if (query) {
        query = String(query).replace(/^query=/i, '');
        query = encodeURI(decodeURI(query) + '^' + str);
    } else {
        query = encodeURI(str);
    }
    setParameter('query', query);
}

function showRows(newValue) {
    console.log('showRows('+newValue+')');
    setParameter('rows', newValue);
}

function search() {
    console.log('showRows()');
    var str   = gel('search').value;
    var field = gel('search-group-select').value;
    
    if (!str || !field) {
        alert('Please enter a search term');
        return;
    }
    addQuery(field + '=*' + str);
}

function deleteRows() {
    
}

function orderBy(name) {
    setParameter('order', name);
}