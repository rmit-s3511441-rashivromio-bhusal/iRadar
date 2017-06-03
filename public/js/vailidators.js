function gel(id) {
    return document.getElementById(id);
}

function log(str) {
    window.console.log('%c' + str, 'color:blue;');
}

function clearError(id) {
    gel(id+'.group').classList.remove('has-error');
    var msg = gel(id+'.msg');
    msg.innerHTML = '';
    msg.style.display = 'none';
}

function addError(id, str) {
    gel(id+'.group').classList.add('has-error');
    var msg = gel(id+'.msg');
    msg.innerHTML = str;
    msg.style.display = 'block';
}

function validateString(id, label) {
    var str = gel(id).value.trim();
    if (str == '') {
        addError(id, label + ' cannot be empty');
        return false;
    }
    clearError(id);
    return true;
}

function validateURL(id, label, required) {
    clearError(id);
    var url = gel(id).value.trim();
    if (url == '') {
        if (required) {
            addError(id, label + ' cannot be empty');
            return false;
        }
        return true;
    }
    var regex = /^[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?$/i;
    if (url.match(regex) == null) {
        addError(id, 'Please enter a valid URL');
        return false;
    }
    return true;
}

function validateName(id, label) {
    clearError(id);
    var name = gel(id).value.trim();
    if (name == '') {
        addError(id, label + ' cannot be empty');
        return false;
    }
    var regex = /^[a-z]+(['\-\s][a-z]+)?$/i;
    if (name.match(regex) == null) {
        addError(id, 'Please enter a valid ' + label);
        return false;
    }
    return true;
}

function validateUsername(id, label) {
    clearError(id);
    var name = gel(id).value.trim();
    if (name == '') {
        addError(id, label + ' cannot be empty');
        return false;
    }
    if (name.match(/[A-Z]/ != null)) {
        gel(id).value = name.toLowerCase();
    }
    var regex = /^[a-z]+(\.[a-z]+)?$/;
    if (name.match(regex) == null) {
        addError(id, 'Please enter a valid ' + label);
        return false;
    }
    return true;
}

function validateEmail(id, label) {
    clearError(id);
    var name = gel(id).value.trim();
    if (name == '') {
        addError(id, label + ' cannot be empty');
        return false;
    }
    var regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (name.match(regex) == null) {
        addError(id, 'Please enter a valid email address');
        return false;
    }
    return true;
}

function validatePassword() {
    var id = 'password';
    var pw = String(gel(id).value);
    if (!pw) {
        addError(id, 'Password cannot be empty');
        return false;
    }
    var len = pw.length, MIN = 8, MAX = 24;
    if (len < MIN || len > MAX || pw.match(/[^a-zA-Z0-9\!\@\#\$\%\^\&\*\-\_]/) != null) {
        addError(id, 'Password must be from ' + MIN + ' to ' + MAX + ' characters long, and contain any of the following characters: a-z A-Z 0-9 ! @ # $ % ^ & * - _');
        return false;
    }
    return true;
}

function validateSpecial() {
    var f1 = validateString('name','Name');
    var f2 = validateString('proximity','Proximity');
    var f3 = validateString('store','Store');
    var f4 = validateString('beacon','Beacon');
    var f5 = validateString('name','Name');
    var f6 = validateURL('url','Image URL',true);
    var f7 = validateString('end','End');
    
    return f1 && f2 && f3 && f4 && f5 && f6 && f7;
}

function validateUser() {
    var f1 = validateName('first_name','First name');
    var f2 = validateName('last_name','Last name');
    var f3 = validateUsername('user_name','Username');
    var f4 = validateEmail('email','Email');
    var f5 = validateString('role','Role');
    var f6 = validateURL('image','Avatar');
    var f7 = validateString('store','Store');
    var f8 = true;
    if (String(window.location).match(/\/users\/add/) != null)
        f8 = validatePassword();
        
    return f1 && f2 && f3 && f4 && f5 && f6 && f7 && f8;
}

function validateBeacon() {
    var f1 = validateString('store','Store');
    
    return f1;
}

function storeChanges() {
    console.log('storeChanges()');
    var storeId = String(gel('store').value);
    var json = String(gel('storeBeacons').value);
    var storeBeacons = JSON.parse(json);
    var newBeacons = storeBeacons[storeId];
    var beacon = gel('beacon');
    console.log('clearing...');
    // Clear all existing options
    for (var i = 1; i < beacon.options.length; i++) {
        beacon.options.remove(i);
    }
    console.log('addin...');
    for (var i = 0; i < newBeacons.length; i++) {
        var o = document.createElement("option");
        o.text = String(newBeacons[i].label);
        o.value = String(newBeacons[i].value);
        beacon.options.add(o, i+1);
    }
    console.log('done!');
}