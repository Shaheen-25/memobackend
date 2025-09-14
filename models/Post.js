import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    media: {
      type: [String],
      required: [true, "Media files are required"],
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
      default: "",
    },
    archived: {
      type: Boolean,
      default: false,
    },
    favoritedBy: {
      type: [String],
      default: [],
    },
    template: {
      type: String,
      default: 'light',
    },
    fontFamily: {
      type: String,
      default: "'Montserrat', sans-serif",
    },
    // --- ADD THESE TWO NEW FIELDS ---
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