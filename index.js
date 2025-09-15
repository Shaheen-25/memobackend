import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { format } from "date-fns";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from './routes/ai.js';
import Post from "./models/Post.js";

dotenv.config();

const app = express();

// Initialize Firebase Admin SDK
if (fs.existsSync("./serviceAccountKey.json")) {
  const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  console.warn("⚠️ Firebase serviceAccountKey.json not found — skipping Firebase Admin init");
}

const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
// app.use("/uploads", express.static("uploads")); // --- REMOVED THIS INSECURE LINE ---
app.use("/patterns", express.static(path.join(__dirname, '..', 'memofrontend', 'public', 'patterns')));
app.use("/auth", authRoutes);
app.use('/api/ai', aiRoutes);

// JWT Middleware
const authenticate = async (req, res, next) => {
  const AUTH_ENABLED = (admin.apps && admin.apps.length > 0);
  if (!AUTH_ENABLED) {
    req.userId = "dev-user";
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Invalid token format" });
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.userId = decodedToken.uid;
    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images and videos are allowed!'), false);
  }
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 }});

// Templates array for the backend to reference for share pages
const templates = [
    { id: 'light', name: 'Minimal Light', styles: { background: '#FFFFFF', color: '#1f2d37', headingColor: '#111827' } },
    { id: 'dark', name: 'Cozy Dark', styles: { background: '#1f2d37', color: '#d1d5db', headingColor: '#f9fafb' } },
    { id: 'leaves', name: 'Lush Leaves', styles: { backgroundImage: '/patterns/leaves.png', color: '#1f2d37', headingColor: '#111827' } },
    { id: 'purple-sky', name: 'Purple Sky', styles: { backgroundImage: '/patterns/Purple-sky.png', color: '#FFFFFF', headingColor: '#FFFFFF' } },
    { id: 'beach', name: 'Beach', styles: { backgroundImage: '/patterns/ocean.png', color: '#1f2d37', headingColor: '#111827' } },
];

// ====================================================================
//                       API ROUTES
// ====================================================================

// --- NEW SECURE MEDIA ROUTE ---
// This route replaces the public static folder. It checks for authentication
// and ownership before allowing a user to access a media file.
app.get('/uploads/:filename', authenticate, async (req, res) => {
  try {
    const filename = req.params.filename;

    // Find a post that contains this media file AND belongs to the logged-in user.
    const post = await Post.findOne({ media: filename, userId: req.userId });

    // If no post is found, the user does not have permission to view this file.
    if (!post) {
      return res.status(403).json({ message: "Forbidden: You don't have access to this file." });
    }

    // If permission is granted, send the file.
    const filePath = path.join(__dirname, 'uploads', filename);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    } else {
      return res.status(404).json({ message: "File not found." });
    }
  } catch (error) {
    console.error("Error serving media file:", error);
    res.status(500).json({ message: "Server error while fetching media." });
  }
});

app.post("/upload-multiple", authenticate, upload.array("media"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No media files uploaded" });
    }
    const mediaPaths = req.files.map((file) => file.filename);
    const mediaTypes = req.files.map((file) => file.mimetype.startsWith('image/') ? 'image' : 'video');
    const { caption = "", description = "" } = req.body;
    const newPost = new Post({ media: mediaPaths, mediaTypes, caption, description, userId: req.userId });
    await newPost.save();
    res.status(201).json({ message: "Post uploaded", post: newPost });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

app.get("/posts", authenticate, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.userId, archived: false }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch posts", error: err.message });
  }
});

app.get("/archived-posts", authenticate, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.userId, archived: true }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch archived posts" });
  }
});

app.patch("/posts/:id/archive", authenticate, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { archived: true },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found or you don't have permission" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Archive failed" });
  }
});

app.patch("/posts/:id/unarchive", authenticate, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { archived: false },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found or you don't have permission" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Unarchive failed" });
  }
});

app.patch("/posts/:id/style", authenticate, async (req, res) => {
  try {
    const { template, fontFamily, headingColor, textColor } = req.body;
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { template, fontFamily, headingColor, textColor },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found or you don't have permission." });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Failed to update style." });
  }
});

app.patch("/posts/:id", authenticate, async (req, res) => {
  try {
    const { caption, description } = req.body;
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { caption, description },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found or you don't have permission" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

app.delete("/posts/:id", authenticate, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.userId });
    if (!post) return res.status(404).json({ message: "Post not found or you don't have permission" });
    post.media.forEach((file) => {
      const filePath = path.join(__dirname, "uploads", file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    await post.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

app.post("/posts/:id/favorite", authenticate, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id },
      { $addToSet: { favoritedBy: req.userId } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Favorite failed" });
  }
});

app.delete("/posts/:id/favorite", authenticate, async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $pull: { favoritedBy: req.userId } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Unfavorite failed" });
  }
});

app.get("/favorites", authenticate, async (req, res) => {
  try {
    const posts = await Post.find({ favoritedBy: req.userId, archived: false }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch favorites" });
  }
});

// ====================================================================
//                       SHARE PAGE ROUTE
// ====================================================================
app.get('/share/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = await Post.findById(postId);

    if (!post || post.archived) {
      return res.status(404).send('<h1>Post not found</h1>');
    }
    
    // NOTE: For the public share page, we serve media from a non-authenticated path.
    // We create a separate, public route for this purpose if needed, or keep it simple.
    // For now, this assumes anyone with the share link can see the media.
    const mediaUrl = `${process.env.API_URL || 'http://localhost:5000'}/uploads/${post.media[0]}`;
    const mediaType = post.mediaTypes[0] || (post.media[0].endsWith('.mp4') ? 'video' : 'image');
    
    const mediaElement = mediaType === 'video'
      ? `<video src="${mediaUrl}" controls autoplay muted style="width:100%; display:block;"></video>`
      : `<img src="${mediaUrl}" alt="${post.caption}" style="width:100%; display:block;">`;

    const activeTemplate = templates.find(t => t.id === post.template) || templates[0];
    
    const pageStyles = {
        fontFamily: post.fontFamily || "'Montserrat', sans-serif",
        background: activeTemplate.styles.backgroundImage 
            ? `url(${activeTemplate.styles.backgroundImage})` 
            : activeTemplate.styles.background,
        headingColor: post.headingColor || activeTemplate.styles.headingColor,
        textColor: post.textColor || activeTemplate.styles.color
    };
    
    const formattedDate = format(new Date(post.createdAt), "MMMM dd, yyyy");

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        </html>
    `);

  } catch (error) {
    console.error('Error fetching share post:', error);
    res.status(500).send('<h1>Error loading post</h1>');
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});