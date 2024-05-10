const express = require('express');
const router = express.Router();
const discussionSchema = require('./models/discussionSchema');
const replySchema = require('./models/replySchema');

router.post('/replyUrl', async (req, res) => {
    try {
      const { tableUrl } = req.params; // Extracting the tableUrl from the URL parameters
      const { reply } = req.body; // Assuming the reply text is in the request body
  
      console.log('Reply request received for tableUrl:', tableUrl);
  
      if (!reply) {
        return res.status(400).send("Reply text is required.");
      }
  
      // Find the discussion with the matching URL
      const discussion = await discussionSchema.findOne({ Main: tableUrl });
      if (!discussion) {
        console.log('Discussion not found for tableUrl:', tableUrl);
        return res.status(404).send('Discussion not found');
      }
  
      // Create a new reply document with the provided reply text
      const newReply = await replySchema.create({ Reply: reply }); 
  
      // Add the new reply to the discussion
      discussion.replies.push(newReply);
      await discussion.save();
  
      res.redirect(`/${tableUrl}`); // Redirect back to the discussion page with the dynamic URL parameter
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal server error");
    }
  });
  

module.exports = router;
