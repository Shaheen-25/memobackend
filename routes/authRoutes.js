import express from "express";
import User from "../models/User.js";
// --- ADDED IMPORTS ---
import Post from "../models/Post.js";
import { authenticate } from "../middleware/authenticate.js"; // Adjust path if needed
import { s3 } from "../config/s3Client.js";

// Create a router instance
const router = express.Router();

// Signup Route
router.post("/signup", async (req, res) => {
  const { name, email, firebaseUid } = req.body;

  if (!name || !email || !firebaseUid) {
    return res.status(400).json({ message: "Name, email, and firebaseUid are required" });
  }

  try {
    const existingUser = await User.findOne({ firebaseUid });
    if (existingUser) {
      return res.status(200).json(existingUser);
    }

    const newUser = new User({
      name,
      email,
      firebaseUid,
    });
    await newUser.save();
    res.status(201).json({
      message: "User record created successfully in MongoDB",
      user: newUser,
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ message: "Server error while creating user record" });
  }
});


// --- NEW DELETE ACCOUNT ROUTE ---
/**
 * @route   DELETE /auth/me
 * @desc    Deletes the authenticated user's account and all their data
 * @access  Private
 */
router.delete('/me', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authenticate middleware

    // 1. Find all of the user's posts to get the media file keys
    const userPosts = await Post.find({ userId: userId });

    if (userPosts.length > 0) {
      // 2. Create a list of all media file keys to delete from Backblaze
      const filesToDelete = userPosts.flatMap(post => post.media.map(fileKey => ({ Key: fileKey })));
      
      // 3. If there are files, delete them from Backblaze B2
      if (filesToDelete.length > 0) {
        const deleteParams = {
          Bucket: process.env.B2_BUCKET_NAME,
          Delete: { Objects: filesToDelete },
        };
        await s3.deleteObjects(deleteParams).promise();
      }
    }

    // 4. Delete all of the user's post documents from MongoDB
    await Post.deleteMany({ userId: userId });

    // 5. Delete the user's main profile document from the 'users' collection
    await User.findOneAndDelete({ firebaseUid: userId });

    // Note: The Firebase user account itself is deleted from the frontend after this succeeds.
    res.status(200).json({ message: 'User data deleted successfully.' });

  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ message: 'Server error during account deletion.' });
  }
});


export default router;