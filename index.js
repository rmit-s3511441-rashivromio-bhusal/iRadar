var http = require('http');
var express = require('express');
var app = express();

app.set('port', process.env.PORT || 3000);
app.set('view engine', 'ejs');
app.set('views', 'app');

app.use(require('./routes'));
app.use(express.static('app'));

var port = app.get('port');
var server = app.listen(port, function(){
    console.log(`server is listening on port ${port}`);
});
