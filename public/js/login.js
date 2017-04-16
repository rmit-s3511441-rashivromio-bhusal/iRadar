function gel(id) {
    return document.getElementById(id);
}

function log(str) {
    window.console.log('%c' + str, 'color:blue;');
}

function login() {
    var loginBtn, msg, user_name, password, isIncomplete, auth;
    
    loginBtn = gel('btn-login');
    loginBtn.disabled = true;
    
    msg = gel('alert-login');
    msg.style.display = 'none';
    
    user_name = gel('user_name');
    password = gel('password');
    
    user_name.parentNode.classList.remove('has-error');
    password.parentNode.classList.remove('has-error');
    
    isIncomplete = false;
    if (!user_name.value) {
        isIncomplete = true;
        user_name.parentNode.classList.add('has-error');
    }
    if (!password.value) {
        isIncomplete = true;
        password.parentNode.classList.add('has-error');
    }
    
    var usernameStr = String(user_name.value);
    if (usernameStr.match(/[A-Z]/) != null) {
        user_name.value = usernameStr = usernameStr.toLowerCase();
    }
    
    if (usernameStr.match(/^[a-z]+(\.[a-z]+)?$/) == null) {
        isIncomplete = true;
        user_name.parentNode.classList.add('has-error');
    }
    
    if (isIncomplete) {
        loginBtn.disabled = false;
        return;
    }
    
    // REST CALL
    auth = 'Basic ' + window.btoa(usernameStr + ':' + password.value); // encode to base64
    
    $.get({
        url: 'https://iradar-dev.appspot.com/authenticate',
        type: 'GET',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", auth);
        },
        success: function (response) {
            log('token: ' + response.token);
            msg.classList.remove('alert-danger');
            msg.classList.add('alert-success');
            msg.innerHTML = 'Success';
            msg.style.display = 'block';
            window.location = 'https://iradar-dev.appspot.com/home';
        }
    }).fail(function (response) {
        response = JSON.parse(response.responseText);
        msg.innerHTML = response.error;
        msg.style.display = 'block';
        loginBtn.disabled = false;
        password.select();
    });
}

function checkHTTPS() {
    var url = String(window.location);
    if (url.match(/^http:/) !== null) {
        window.location = url.replace(/^http:/, 'https:');
    }
}
