import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import admin from "firebase-admin";
import axios from "axios";
import puppeteer from "puppeteer";
import ffmpeg from 'fluent-ffmpeg';
import { format } from "date-fns";
import authRoutes from "./routes/authRoutes.js";
import Post from "./models/Post.js";
import { generateUniqueContent } from "./ai/generator.js";

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
app.use("/uploads", express.static("uploads"));
// Serves background pattern images from the frontend's public folder
app.use("/patterns", express.static(path.join(__dirname, '..', 'memofrontend', 'public', 'patterns')));
app.use("/auth", authRoutes);

// JWT Middleware
const authenticate = async (req, res, next) => {
  const AUTH_ENABLED = (admin.apps && admin.apps.length > 0);
  if (!AUTH_ENABLED) {
    req.userId = "dev-user";
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

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
    // Add other templates as needed
];

// ====================================================================
//                       API ROUTES START HERE
// ====================================================================

app.post("/api/render-video/:id", authenticate, async (req, res) => {
  const { styles } = req.body;
  const postId = req.params.id;

  try {
    const post = await Post.findOne({ _id: postId, userId: req.userId });
    if (!post || !post.media[0] || post.mediaTypes[0] !== 'video') {
      return res.status(404).json({ message: "Valid video post not found." });
    }

    res.status(202).json({ message: "Video rendering process started." });

    console.log(`[JOB_START] Starting video render for post ${postId}`);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    const htmlContent = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Lobster&family=Montserrat:wght@400;700&family=Playfair+Display&family=Roboto+Mono&display=swap');
            body { margin: 0; width: 500px; height: 500px; font-family: ${styles.fontFamily}; background: ${styles.background}; color: ${styles.color}; }
            .container { padding: 20px; }
            h3 { color: ${styles.headingColor}; }
            p { color: ${styles.color}; }
          </style>
        </head>
        <body>
          <div class="container">
            <h3>${post.caption}</h3>
            <p>${post.description}</p>
            <p>${format(new Date(post.createdAt), "PPP")}</p>
          </div>
        </body>
      </html>
    `;
    
    await page.setContent(htmlContent);
    const backgroundImagePath = `uploads/background-${postId}.png`;
    await page.screenshot({ path: backgroundImagePath, fullPage: true });
    await browser.close();
    console.log(`[JOB_PROGRESS] Background image created for post ${postId}`);

    const inputVideoPath = path.join(__dirname, 'uploads', post.media[0]);
    const outputVideoPath = `uploads/rendered-${postId}.mp4`;

    ffmpeg()
      .input(backgroundImagePath)
      .input(inputVideoPath)
      .complexFilter([
        '[1:v] scale=400:300 [scaled_video]',
        '[0:v][scaled_video] overlay=50:100'
      ])
      .outputOptions('-map 1:a?')
      .save(outputVideoPath)
      .on('end', () => {
        console.log(`[JOB_COMPLETE] Rendered video saved to ${outputVideoPath}`);
        fs.unlinkSync(backgroundImagePath);
      })
      .on('error', (err) => {
        console.error(`[JOB_ERROR] FFmpeg error for post ${postId}:`, err);
        fs.unlinkSync(backgroundImagePath);
      });

  } catch (err) {
    console.error("Error starting video render:", err);
  }
});

app.get("/api/fonts", async (req, res) => {
  try {
    const fontFamilies = [
      "Montserrat:wght@400;600", "Playfair+Display", "Roboto+Mono", "Lobster"
    ].map(name => `family=${name.replace(/\s/g, '+')}`).join('&');
    const url = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;
    const fontCss = await axios.get(url);
    res.header("Content-Type", "text/css");
    res.send(fontCss.data);
  } catch (error) {
    res.status(500).send("Error fetching fonts");
  }
});

app.get("/api/public/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.archived) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
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
    const newPost = new Post({ 
      media: mediaPaths, 
      mediaTypes: mediaTypes,
      caption, 
      description,
      userId: req.userId 
    });
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

app.post("/api/ai-caption", async (req, res) => {
  try {
    const { userPrompt, currentCaption = "", currentDescription = "" } = req.body;
    const result = await generateUniqueContent(userPrompt, currentCaption, currentDescription);
    res.json(result);
  } catch (err) {
    res.status(500).json({ 
      error: "AI generation failed", 
      details: err.message,
    });
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
//                       UPDATED SHARE ROUTE IS HERE
// ====================================================================
app.get('/share/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = await Post.findById(postId);

    if (!post || post.archived) {
      return res.status(404).send('<h1>Post not found</h1>');
    }

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
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Lobster&family=Montserrat:wght@400;700&family=Playfair+Display:ital@0;1&family=Roboto+Mono&display=swap" rel="stylesheet">
          <title>${post.caption || 'A Memory from MemoCapsule'}</title>
          <style>
              body { 
                  font-family: ${pageStyles.fontFamily}; 
                  background: ${pageStyles.background}; 
                  background-size: cover;
                  background-position: center;
                  color: ${pageStyles.textColor};
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 100vh; 
                  margin: 0; 
                  padding: 1rem; 
                  box-sizing: border-box;
              }
              .post-container { 
                  max-width: 500px; 
                  width: 100%; 
                  background-color: ${activeTemplate.styles.backgroundImage ? 'rgba(255, 255, 255, 0.9)' : pageStyles.background}; 
                  backdrop-filter: ${activeTemplate.styles.backgroundImage ? 'blur(10px)' : 'none'};
                  -webkit-backdrop-filter: ${activeTemplate.styles.backgroundImage ? 'blur(10px)' : 'none'};
                  border-radius: 12px; 
                  box-shadow: 0 4px 20px rgba(0,0,0,0.15); 
                  overflow: hidden; 
              }
              .content { padding: 1.5rem; }
              h1 { 
                  font-size: 1.7em; 
                  margin: 0 0 0.5em 0; 
                  color: ${pageStyles.headingColor};
              }
              p { font-size: 1.1em; margin: 0; line-height: 1.6; }
              .date { font-size: 0.85em; color: #888; margin-top: 1.5rem; }
          </style>
      </head>
      <body>
          <div class="post-container">
              ${mediaElement}
              <div class="content">
                  <h1>${post.caption}</h1>
                  <p>${post.description}</p>
                  <p class="date">Created on: ${formattedDate}</p>
              </div>
          </div>
      </body>
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