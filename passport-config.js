const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const User = require('./models/userSchema'); // Assuming your User model is in a file named 'user.js'

function initialize(passport) {
  const authenticateUser = async (email, password, done) => {
    try {
      const user = await User.findOne({ email }); // Find user by email
      if (!user) {
        return done(null, false, { message: 'No user found with that email' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return done(null, false, { message: 'Password incorrect' });
      }

      return done(null, user); // Successful authentication
    } catch (error) {
      return done(error); // Handle errors appropriately
    }
  };

  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));

  passport.serializeUser((user, done) => {
    done(null, user._id); // Serialize the user ID
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user); // Deserialization logic
    } catch (err) {
      done(err); // Handle errors
    }
  });
}

module.exports = initialize;
