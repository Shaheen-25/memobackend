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
import { s3 } from './config/s3Client.js';

dotenv.config();

const app = express();

//Initialize Firebase Admin from Environment Variable ---
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("✅ Firebase Admin initialized from environment variable.");
} catch (error) {
  if (fs.existsSync("./serviceAccountKey.json")) {
    const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Admin initialized from local file.");
  } else {
    console.warn("⚠️ Firebase Admin credentials not found.");
  }
}

const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Middleware
const allowedOrigins = [
  'http://localhost:5173',   // this in case your dev server switches back
  'https://localhost:5173',  // Add the new HTTPS origin
  'http://localhost:3000', 
  'https://memocapsule.vercel.app' //live frontend URL
];
app.use(cors({
  origin: function (origin, callback) {
    console.log('➡️ Request received from origin:', origin);
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('➡️ Request received from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
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
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Predefined Templates
const templates = [
    { id: 'light', name: 'Minimal Light', styles: { background: '#FFFFFF', color: '#1f2d37', headingColor: '#111827' } },
    { id: 'dark', name: 'Cozy Dark', styles: { background: '#1f2d37', color: '#d1d5db', headingColor: '#f9fafb' } },
    { id: 'leaves', name: 'Lush Leaves', styles: { backgroundImage: '/patterns/leaves.png', color: '#1f2d37', headingColor: '#111827' } },
    { id: 'light', name: 'Minimal Light', styles: { background: '#FFFFFF', color: '#1f2937', borderColor: '#e5e7eb', headingColor: '#111827' } },
    { id: 'purple-sky', name: 'Purple Sky', styles: { backgroundImage: `'/patterns/Purple-sky.png'`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'beach', name: 'Beach', styles: { backgroundImage: `'/patterns/ocean.png'`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'pentagon', name: 'Pentagon', styles: { backgroundImage: `'/patterns/pentagon.webp'`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'strips', name: 'Stripes', styles: { backgroundImage: `'/patterns/canadian.webp'`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'abstract', name: 'Abstract', styles: { backgroundImage: `'/patterns/abstract.png'`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'floral', name: 'Floral', styles: { backgroundImage: `'/patterns/floral.png'`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'food', name: 'Foodie', styles: { backgroundImage: `'/patterns/food.png'`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'green', name: 'Greenery', styles: { backgroundImage: `'/patterns/Green.png'`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'sunset', name: 'Sunset', styles: { backgroundImage: `'/patterns/sunset.png'`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'joy', name: 'Joy', styles: { backgroundImage: `'/patterns/joy.png'`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'cute', name: 'Cute', styles: { backgroundImage: `'/patterns/cute.png'`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'sky', name: 'Sky', styles: { backgroundImage: `'/patterns/weather.png'`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
];

// ====================================================================
//                       API ROUTES
// ====================================================================

app.post("/upload-multiple", authenticate, upload.array("media"), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No media files uploaded" });
  }
  try {
    const uploadFile = (file) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      const params = {
        Bucket: process.env.B2_BUCKET_NAME,
        Key: uniqueName,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
      return s3.upload(params).promise().then(data => data.Key);
    };
    const mediaPaths = await Promise.all(req.files.map(uploadFile));
    
    const mediaTypes = req.files.map((file) => file.mimetype.startsWith('image/') ? 'image' : 'video');
    const { caption = "", description = "" } = req.body;
    const newPost = new Post({ media: mediaPaths, mediaTypes, caption, description, userId: req.userId });
    await newPost.save();
    res.status(201).json({ message: "Post uploaded", post: newPost });
  } catch (err) {
    console.error("Upload to B2 failed:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

app.get('/media-url/:filename', authenticate, async (req, res) => {
  try {
    const filename = req.params.filename;
    const post = await Post.findOne({ media: filename, userId: req.userId });

    if (!post) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const params = {
      Bucket: process.env.B2_BUCKET_NAME,
      Key: filename,
      Expires: 60 * 5 // URL is valid for 5 minutes
    };
    
    const url = s3.getSignedUrl('getObject', params);
    res.json({ url });
  } catch (error) {
    res.status(500).json({ message: "Could not generate media URL." });
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
    const post = await Post.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { archived: true }, { new: true });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Archive failed" });
  }
});

app.patch("/posts/:id/unarchive", authenticate, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { archived: false }, { new: true });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Unarchive failed" });
  }
});

app.patch("/posts/:id/style", authenticate, async (req, res) => {
  try {
    const { template, fontFamily, headingColor, textColor } = req.body;
    const post = await Post.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { template, fontFamily, headingColor, textColor }, { new: true });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Failed to update style." });
  }
});

app.delete("/posts/:id", authenticate, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.userId });
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Delete files from B2
    const deleteFile = (filename) => {
        const params = {
            Bucket: process.env.B2_BUCKET_NAME,
            Key: filename,
        };
        return s3.deleteObject(params).promise();
    };
    await Promise.all(post.media.map(deleteFile));
    
    await post.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete failed:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

app.post("/posts/:id/favorite", authenticate, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate({ _id: req.params.id }, { $addToSet: { favoritedBy: req.userId } }, { new: true });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Favorite failed" });
  }
});

app.delete("/posts/:id/favorite", authenticate, async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { $pull: { favoritedBy: req.userId } }, { new: true });
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
    
    // Generate signed URL for the first media item
    const mediaUrlParams = {
        Bucket: process.env.B2_BUCKET_NAME,
        Key: post.media[0],
        Expires: 60 * 60 // Share link media is valid for 1 hour
    };
    const mediaUrl = s3.getSignedUrl('getObject', mediaUrlParams);
    
    const mediaType = post.mediaTypes[0] || (post.media[0].endsWith('.mp4') ? 'video' : 'image');
    
    const mediaElement = mediaType === 'video'
      ? `<video src="${mediaUrl}" controls autoplay muted style="width:100%; display:block;"></video>`
      : `<img src="${mediaUrl}" alt="${post.caption}" style="width:100%; display:block;">`;

    // Determine active template and styles
    const activeTemplate = templates.find(t => t.id === post.template) || templates[0];
    const backgroundImageUrl = activeTemplate.styles.backgroundImage
        ? `${process.env.BACKEND_URL}${activeTemplate.styles.backgroundImage.replace(/'/g, '')}`
        : null;
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
          <title>${post.caption || 'A MemoCapsule Memory'}</title>
          <style>
              body { 
                  font-family: ${pageStyles.fontFamily}; 
                  background: ${pageStyles.background}; 
                  background-size: cover;
                  background-position: center;
                  color: ${pageStyles.textColor};
                  display: flex; justify-content: center; align-items: center; 
                  min-height: 100vh; margin: 0; padding: 1rem; box-sizing: border-box;
              }
              .post-container { 
                  max-width: 500px; width: 100%; 
                  background-color: ${activeTemplate.styles.backgroundImage ? 'rgba(255, 255, 255, 0.95)' : pageStyles.background}; 
                  backdrop-filter: ${activeTemplate.styles.backgroundImage ? 'blur(10px)' : 'none'};
                  -webkit-backdrop-filter: ${activeTemplate.styles.backgroundImage ? 'blur(10px)' : 'none'};
                  border-radius: 12px; 
                  box-shadow: 0 4px 20px rgba(0,0,0,0.15); 
                  overflow: hidden; 
              }
              .content { padding: 1.5rem; }
              h1 { font-size: 1.7em; margin: 0 0 0.5em 0; color: ${pageStyles.headingColor}; }
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