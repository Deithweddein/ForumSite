if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const { name } = require('ejs')
const mongoose = require('mongoose')
const discussionSchema = require('./models/discussionSchema')
const User = require('./models/userSchema');
const initializePassport = require('./passport-config')
const flash = require('express-flash')
const session = require('express-session')



initializePassport(
  passport, 
  email => { return  User.find(User => User.email === email)},
  name => { return User.find(User => User.name === name)}
)

mongoose.connect('mongodb://localhost:27017/')
    .then(() => console.log('Connected to MongoDB!'))
    .catch(err => console.error('Error connecting to MongoDB:', err));

app.set('view engine', 'ejs')
app.use(express.urlencoded({extended: false}))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}))
app.use(passport.initialize());
app.use(passport.session());



app.get('/', checkAuthenticated, async (req, res) => {
  try {

      // Fetch discussions from the database, sorted by clickCount in descending order
      const discussions = await discussionSchema.find().sort({ clickCount: -1 }).populate('user');
      // Render the template with discussions data
      res.render('index', { tableUrl: discussions, user: req.user, checkAuthenticated });
  } catch (err) {
      console.error(err);
      res.status(500).send('Error retrieving discussions');
  }
});


app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))
app.get('/register', checkNotAuthenticated, (req, res) =>{
    res.render("register.ejs")
})  

app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
      const { name, email, password } = req.body;
  
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please fill in all fields' });
      }
      
      const hashedPassword =  await bcrypt.hash(password, 10);

      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        text: 23123
      });
  
      // Save the new user to the database
      await newUser.save();
  
      // Success response (consider redirecting or sending a success message)

      res.status(201).json({ message: 'User registration successful' });
    } catch (error) {
      console.error(error);

      if (error.code === 11000) { // Assuming MongoDB duplicate key error code
        return res.status(400).json({ message: 'Email already exists' });
      } else {
        return res.status(500).json({ message: 'Registration failed. Please try again later.' });
      }
    }

    try {

        const users = await User.find({});

        console.log('--- Users ---');
        users.forEach(user => {
          console.log(`Name: ${user.name}`);
          console.log(`Email: ${user.email}`); // Mask email 
          console.log(`Password: ${user.password}`)
          if(!users){
            console.log('You have no users.')
          }
        });
        console.log('---');
    
        // Consider returning a filtered user list (e.g., excluding sensitive fields) if needed
        // res.json(users); // Optional sanitized user data response
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve users' });
      }
  });

  app.post('/remove', async (req, res) => {
    try {
      // Delete all discussions
      await discussionSchema.deleteMany({});
      res.redirect('/');
    } catch (err) {
      console.error(err);
      res.status(500).send("Something's wrong");
    }
  });

  app.post('/logout', (req, res) => {
    req.logout(function(err) {
      if (err) { // Handle potential errors during logout
        return res.status(500).send('Error logging out');
      }
      console.log('Logout Completed succsesfully')
      res.redirect('/'); // Redirect to home page after successful logout
    });
  });
  app.post('/tableUrl', async (req, res) => {
    try {
        const { tableUrl, discussUrl } = req.body;
        
        if (tableUrl.length < 1) {
            return res.status(400).send("Write text u dumbass");
        }
        if (tableUrl.length < 5) {
            return res.status(400).send("The text is too short.");
        }

        const newDiscussion = await discussionSchema.create({ Main: tableUrl, Discuss: discussUrl });

        // Assign the user field to the ID of the authenticated user who created the discussion
        newDiscussion.user = req.user._id;
        await newDiscussion.save();
        
        res.redirect('/' + tableUrl);
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal server error");
    }
});

app.get('/search', async (req, res) => {
  const searchQuery = req.query.query; 
  console.log("Search Query Received:", searchQuery); // Log the search query to debug

  if (!searchQuery) {
      return res.redirect('/'); // Redirect to home if the search query is empty
  }

  try {
      // Use a regular expression to make the search case-insensitive
      const regex = new RegExp(escapeRegex(searchQuery), 'i');
      const discussions = await discussionSchema.find({ Main: regex }).populate('user');
      console.log("Search Results:", discussions); // Log the results to debug

      // Render a view with the search results
      res.render('searchResults', { discussions });
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error');
  }
});

// Helper function to escape regex characters
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

app.get('/:tableUrl', checkAuthenticated, async (req, res) => {
  try {
      const { tableUrl } = req.params;
      // Find the discussion with the matching URL and populate the user and replies fields
      const discussion = await discussionSchema.findOne({ Main: tableUrl })
                            .populate('user')
                            .populate('replies.user'); // Populate user data for each reply

      if (!discussion) {
          return res.status(404).send('Discussion not found');
      }
      discussion.clickCount += 1;
      await discussion.save()
      // Pass the discussion data to the template, along with tableUrl
      res.render('tableUrl', { discussion, tableUrl });
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error');
  }
});

app.post('/:tableUrl/reply', checkAuthenticated, async (req, res) => {
    const { replyText } = req.body;
    const { tableUrl } = req.params;

    if (!replyText) {
        return res.status(400).send("Reply cannot be empty.");
    }

    try {
        const discussion = await discussionSchema.findOne({ Main: tableUrl });
        if (!discussion) {
            return res.status(404).send('Discussion not found');
        }

        const reply = {
            text: replyText,
            user: req.user._id
        };

        discussion.replies.push(reply);
        await discussion.save();

        res.redirect('/' + tableUrl);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});




  app.post('/removeAccounts', async (req, res) => {
    try
    {
      await User.deleteMany({});
      res.redirect('/register');


      const users = await User.find({});

        console.log('--- Users ---');
        users.forEach(user => {
          
          if(!user.name && !user.email && !user.password){
            console.log('You have no users.')
          }
          else{
            console.log(`Name: ${user.name}`);
            console.log(`Email: ${user.email}`); // Mask email 
            console.log(`Password: ${user.password}`)
          } 
          
          
        });

    }
    
    catch(error)
    {
      console.error(error);
      res.status(500).send("Internal server error")
    }
  }) 


  
  function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
  
    res.redirect('/login');
  }
  
  function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect('/')
    }
    next()
  }

app.listen(3000, () => {
        console.log("App listening to", 'http://localhost:3000/register')
})
