'use strict';

const path          = require('path');
const cookieSession = require('cookie-session')
const helmet        = require('helmet');
const config        = require('./routes/config');
const express       = require('express'); 
const app           = express();

app.disable('etag'); // Disable HTTP ETag
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('trust proxy', true);

// Static content
app.use(express.static('public/favicons'));
app.use(express.static('public/css'));
app.use(express.static('public/images'));
app.use(express.static('public/js'));

app.use(helmet()); // Express security best practice

app.use(cookieSession({
    name: String(config.cookie.name),
    keys: [String(config.cookie.key)],
    maxAge: Number(config.cookie.maxAge),
}));

app.use(function (request, response, next) {
    // Update the session on each request to get the session alive
    request.session.nowInMinutes = Date.now() / 60e3; // Only update once per minute
    next();
});

app.use('/api',          require('./routes/api-router'));
app.use('/beacons',      require('./routes/beacons'));
//app.use('/specials', require('./routes/crud-methods')('Special', 'name'));
//app.use('/stores',   require('./routes/crud-methods')('Store', 'name'));
app.use('/specials',     require('./routes/specials'));
app.use('/stores',       require('./routes/stores'));
app.use('/users',        require('./routes/users'));
app.use('/reports',      require('./routes/reports'));
app.use('/authenticate', require('./routes/authenticate'));
app.use('/kontakt',      require('./routes/kontakt'));

app.get('/', (request, response) => {
    response.redirect('/home');
});

app.get('/home', (request, response) => {
    console.log('/home');
    
    if (request.session && request.session.id) {
        console.log('session.id: ' + request.session.id);
        response.render('home.jade', {
            pageTitle: "iRadar - Home",
            pageId   : "home",
            token    : request.session.token,
            id       : Number(request.session.id),
            image    : request.session.image,
            name     : request.session.name,
            initials : request.session.initials,
            isAdmin  : request.session.name == 'Geoffrey Sage'
        });
    } else {
        response.redirect('/login');
    }
});

app.get('/login', (request, response) => {
    response.render('login.jade');
});

app.get('/logout', (request, response) => {
    request.session = null;
    response.redirect('/login');
});

// Basic 404 handler
app.use((request, response) => {
    response.status(404).render('404.jade');
});

// Basic error handler
app.use((err, request, response, next) => {
    console.error('500: ' + err);
    
    // If our routes specified a specific response, then send that. Otherwise,
    // send a generic message so as not to leak anything.
    response.status(500).send(err.response || '<p>Something broke!</p><p>Possibly jade could not render the .jade file. Try debugging the template.</p>');
});

if (module === require.main) {
    // Start the server
    var PORT = process.env.PORT || 8080;
    var server = app.listen(PORT, () => {
        var port = server.address().port;
        console.log(`App listening on port ${port}`);
    });
}

module.exports = app;
