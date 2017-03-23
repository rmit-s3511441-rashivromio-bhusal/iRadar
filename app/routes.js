var express = require('express');
var router = express.Router();

router.get('/', function(request, response){
    response.render('home'); 
});

router.get('/home', function(request, response){
    response.render('home'); 
});

module.exports = router;
