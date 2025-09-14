import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
      unique: true, // The Firebase UID is the unique key for this user
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

const User = mongoose.model("User", userSchema);

export default User;