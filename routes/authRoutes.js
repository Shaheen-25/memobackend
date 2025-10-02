import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import { authenticate } from "../middleware/authenticate.js";
import { s3 } from "../config/s3Client.js";

const router = express.Router();

// Signup Route
router.post("/signup", async (req, res) => {
  const { name, email, firebaseUid } = req.body;

  if (!name || !email || !firebaseUid) {
    return res.status(400).json({ message: "Name, email, and firebaseUid are required" });
  }

  try {
    // --- FIX: Added check for existing email to prevent crashes ---
    const emailExists = await User.findOne({ email: email });
    if (emailExists) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    // Check if user already exists via Firebase UID (for logins)
    const existingUser = await User.findOne({ firebaseUid });
    if (existingUser) {
      return res.status(200).json(existingUser);
    }

    // If user is truly new, create them
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


// Delete Account Route
router.delete('/me', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const userPosts = await Post.find({ userId: userId });

    if (userPosts.length > 0) {
      const filesToDelete = userPosts.flatMap(post => post.media.map(fileKey => ({ Key: fileKey })));
      
      if (filesToDelete.length > 0) {
        const deleteParams = {
          Bucket: process.env.B2_BUCKET_NAME,
          Delete: { Objects: filesToDelete },
        };
        await s3.deleteObjects(deleteParams).promise();
      }
    }

    await Post.deleteMany({ userId: userId });
    await User.findOneAndDelete({ firebaseUid: userId });

    res.status(200).json({ message: 'User data deleted successfully.' });

  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ message: 'Server error during account deletion.' });
  }
});


export default router;