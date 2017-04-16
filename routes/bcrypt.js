const bcrypt = require('bcrypt');

exports.cryptPassword = function(password, callback) {
    var saltRounds = 10;
    
    bcrypt.genSalt(saltRounds, function(err, salt) {
        if (err) {
            return callback(err);
        }
        bcrypt.hash(password, salt, function(err, hash) {
            return callback(err, hash);
        });
    });
};

exports.comparePassword = function(password, userPassword, callback) {
    bcrypt.compare(password, userPassword, function(err, isPasswordMatch) {
        if (err) {
            return callback(err);
        }
        return callback(null, isPasswordMatch);
    });
};
