import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true, // Index for faster queries by userId
    },
    media: [{
      originalKey: { // Filename/key in S3/B2 for the original file
        type: String,
        required: true
      },
      thumbnailKey: { // Filename/key for the generated thumbnail version 
        type: String
      },
      mediumKey: { // Filename/key for the generated medium-size version
        type: String
      },
      mediaType: { // Type of the media item
        type: String,
        required: true,
        enum: ['image', 'video'] // Ensures only 'image' or 'video' can be stored
      }
    }],
    caption: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "", // Default to empty string if not provided
    },
    isArchived: {
      type: Boolean,
      default: false, // By default, posts are not archived
    },
    favoritedBy: {
      type: [String], // Array of user UIDs who favorited the post
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
      type: String, // Will store color names or hex codes e.g., 'Red' or '#FFFFFF'
    },
    textColor: {
      type: String, // Will store color names or hex codes e.g., 'Black' or '#1f2937'
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

postSchema.path('media').validate(function(value) {
  return value && value.length > 0;
}, 'At least one media file is required.');


export default mongoose.model("Post", postSchema);