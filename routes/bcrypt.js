// Password operations
const bcrypt = require('bcrypt');

// Encrypt a password (one-way) and return the hash
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

// Take a plain text (potential) password, encrypt it, and compare it to the stored hash
exports.comparePassword = function(password, userPassword, callback) {
    bcrypt.compare(password, userPassword, function(err, isPasswordMatch) {
        if (err) {
            return callback(err);
        }
        return callback(null, isPasswordMatch);
    });
};
