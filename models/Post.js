import mongoose from "mongoose";

// Define the Post schema
const postSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true, // Index for faster queries by userId
    },
    media: {
      type: [String],
      required: [true, "Media files are required"], // At least one media file is required
    },
    mediaTypes: {
      type: [String],
      default: []
    },
    caption: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",   // Default to empty string if not provided
    },
    archived: {
      type: Boolean,
      default: false,// By default, posts are not archived
    },
    favoritedBy: {
      type: [String],
      default: [],
    },
    template: {
      type: String,
      default: 'light', // Default template
    },
    fontFamily: {
      type: String,
      default: "'Montserrat', sans-serif",
    },
    headingColor: {
      type: String, // Will store hex color codes e.g., '#FFFFFF'
    },
    textColor: {
      type: String, // Will store hex color codes e.g., '#1f2937'
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

export default mongoose.model("Post", postSchema);