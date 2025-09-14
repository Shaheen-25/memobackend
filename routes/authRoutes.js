import express from "express";
import User from "../models/User.js";

const router = express.Router();

// ✅ Correct Firebase-Compatible Signup Route
router.post("/signup", async (req, res) => {
  const { name, email, firebaseUid } = req.body;

  if (!name || !email || !firebaseUid) {
    return res.status(400).json({ message: "Name, email, and firebaseUid are required" });
  }

  try {
    // Check if a user with this Firebase UID already exists in your database
    const existingUser = await User.findOne({ firebaseUid });
    if (existingUser) {
      // If the user record is already there, just return it
      return res.status(200).json(existingUser);
    }

    // If no record exists, create a new user document in MongoDB
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

export default router;