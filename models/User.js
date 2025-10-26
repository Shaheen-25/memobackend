import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true, // User's name is required
      trim: true, // Trim whitespace
    },
    email: {
      type: String,
      required: true,
      unique: true, // Emails should be unique
      trim: true,
      lowercase: true,
    },
    firebaseUid: {
      type: String,
      required: true, 
      unique: true, 
    },
  },
  {
    timestamps: true, 
  }
);

const User = mongoose.model("User", userSchema);

export default User;