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
import sharp from 'sharp';

dotenv.config();
console.log("Loaded Google API Key:", process.env.GOOGLE_API_KEY);

const app = express();

//Initialize Firebase Admin from Environment Variable 
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
  'http://localhost:5173',   
  'https://localhost:5173',  
  'http://localhost:3000', 
  'https://memocapsule.vercel.app' //live frontend URL
];
app.use(cors({
  origin: function (origin, callback) {
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

app.use("/api/auth", authRoutes);
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

const uploadToS3 = (buffer, key, contentType) => {
  const params = {
    Bucket: process.env.B2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  };
  return s3.upload(params).promise().then(data => data.Key);
};

// Templates
const templates = [
    { id: 'light', name: 'Minimal Light', styles: { background: '#FFFFFF', color: '#1f2d37', headingColor: '#111827' } },
    { id: 'dark', name: 'Cozy Dark', styles: { background: '#1f2d37', color: '#d1d5db', headingColor: '#f9fafb' } },
    { id: 'leaves', name: 'Lush Leaves', styles: { backgroundImage: '/patterns/leaves.png', color: '#1f2d37', headingColor: '#111827' } },
    { id: 'purple-sky', name: 'Purple Sky', styles: { backgroundImage: '/patterns/Purple-sky.png', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'beach', name: 'Beach', styles: { backgroundImage: '/patterns/ocean.png', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'pentagon', name: 'Pentagon', styles: { backgroundImage: '/patterns/pentagon.webp', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'strips', name: 'Stripes', styles: { backgroundImage: '/patterns/canadian.webp', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'abstract', name: 'Abstract', styles: { backgroundImage: '/patterns/abstract.png', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'floral', name: 'Floral', styles: { backgroundImage: '/patterns/floral.png', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'food', name: 'Foodie', styles: { backgroundImage: '/patterns/food.png', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'green', name: 'Greenery', styles: { backgroundImage: '/patterns/Green.png', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'sunset', name: 'Sunset', styles: { backgroundImage: '/patterns/sunset.png', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'joy', name: 'Joy', styles: { backgroundImage: '/patterns/joy.png', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'cute', name: 'Cute', styles: { backgroundImage: '/patterns/cute.png', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
    { id: 'sky', name: 'Sky', styles: { backgroundImage: '/patterns/weather.png', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } },
];


//API ROUTES

app.get("/posts", authenticate, async (req, res) => {
  console.log(`✅ Request reached GET /posts handler for user: ${req.userId}`);
  try {
    const posts = await Post.find({
      userId: req.userId,
      isArchived: { $ne: true },
    }).sort({ createdAt: -1 });

    if (!posts || posts.length === 0) {
      return res.status(404).json({ message: "No posts found" });
    }

    res.json(posts);
  } catch (err) {
    console.error("Error in /posts route:", err);
    res.status(500).json({ message: "Failed to fetch posts", error: err.message });
  }
});


app.post("/upload-multiple", authenticate, upload.array("media"), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No media files uploaded" });
  }
  try {
    const mediaData = [];
    for (const file of req.files) {
      const originalName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
      const mediaType = file.mimetype.startsWith('image/') ? 'image' : 'video';

      if (mediaType === 'image') {
        try {
          const thumbBuffer = await sharp(file.buffer).resize({ width: 400, height: 400, fit: 'cover' }).webp({ quality: 75 }).toBuffer();
          const thumbKey = `thumb-${originalName.split('.')[0]}.webp`;
          await uploadToS3(thumbBuffer, thumbKey, 'image/webp');

          const medBuffer = await sharp(file.buffer).resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
          const medKey = `med-${originalName.split('.')[0]}.webp`;
          await uploadToS3(medBuffer, medKey, 'image/webp');

          const originalBuffer = await sharp(file.buffer).webp({ quality: 85 }).toBuffer();
          const originalKey = `orig-${originalName.split('.')[0]}.webp`;
          await uploadToS3(originalBuffer, originalKey, 'image/webp');

          mediaData.push({ originalKey, thumbnailKey: thumbKey, mediumKey: medKey, mediaType: 'image' });
        } catch (processingError) {
          console.error("Error processing image:", file.originalname, processingError);
          const originalKey = `failed-${originalName}`;
          await uploadToS3(file.buffer, originalKey, file.mimetype);
          mediaData.push({ originalKey, mediaType: 'image' });
        }
      } else {
        const videoKey = `vid-${originalName}`;
        await uploadToS3(file.buffer, videoKey, file.mimetype);
        mediaData.push({ originalKey: videoKey, mediaType: 'video' });
      }
    }
    const { caption = "", description = "" } = req.body;
    const newPost = new Post({ media: mediaData, caption, description, userId: req.userId });
    await newPost.save();
    res.status(201).json({ message: "Post uploaded", post: newPost });
  } catch (err) {
    console.error("Upload process failed:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

app.get('/media-url/:filename', authenticate, async (req, res) => {
  const filename = req.params.filename;
  const userId = req.userId;
  

  try {
    const post = await Post.findOne({
      userId: userId,
      $or: [
        { 'media.originalKey': filename },
        { 'media.thumbnailKey': filename },
        { 'media.mediumKey': filename }
      ]
    });

    if (!post) {
      console.error(`Forbidden or media not found: User ${userId} requested ${filename}. Post not found using NEW schema.`);
      return res.status(403).json({ message: "Forbidden or media not found" });
    }

    const params = {
      Bucket: process.env.B2_BUCKET_NAME, 
      Key: filename,
      Expires: 60 * 5 // URL is valid for 5 minutes
    };
    const url = s3.getSignedUrl('getObject', params);
    console.log(`✅ Media URL generated for user ${userId} file: ${filename}`);

    res.json({ url });

  } catch (error) {
    console.error(`CRITICAL ERROR generating media URL for ${filename}:`, error);
    res.status(500).json({ message: "Could not generate media URL." });
  }
});

app.get("/archived-posts", authenticate, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.userId, isArchived: true })
.sort({ createdAt: -1 }).lean();

    res.json(posts);
  } catch (err) {
    console.error("Error fetching archived posts:", err);
    res.status(500).json({ message: "Failed to fetch archived posts" });
  }
});


app.patch("/posts/:id/archive", authenticate, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isArchived: true },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    console.error("Archive error:", err);
    res.status(500).json({ message: "Archive failed" });
  }
});

app.patch("/posts/:id/unarchive", authenticate, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isArchived: false },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    console.error("Unarchive error:", err);
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

app.patch("/posts/:id/details", authenticate, async (req, res) => {
  try {
    const { caption, description } = req.body;

    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { caption, description },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ message: "Post not found or you don't have permission to edit it." });
    }

    res.json(post);
  } catch (err) {
    console.error("Error updating post details:", err);
    res.status(500).json({ message: "Failed to update post details." });
  }
});

app.delete("/posts/:id", authenticate, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.userId });
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Delete files from B2
    const keysToDelete = post.media.flatMap(item =>
        [item.originalKey, item.thumbnailKey, item.mediumKey].filter(Boolean) 
    );

    if (keysToDelete.length > 0) {
  const deleteParams = {
      Bucket: process.env.B2_BUCKET_NAME,
      Delete: { Objects: keysToDelete.map(key => ({ Key: key })) },
  };
  await s3.deleteObjects(deleteParams).promise(); 
  console.log(`Deleted files from S3/B2 for post ${post._id}:`, keysToDelete);
}  

    await post.deleteOne(); 
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete failed:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

app.post("/posts/:id/favorite", authenticate, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, isArchived: { $ne: true } }, // ✅ condition here
      { $addToSet: { favoritedBy: req.userId } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found or archived" });
    res.json(post);
  } catch (err) {
    console.error("Favorite error:", err);
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
  console.log(`✅ Request reached GET /favorites handler for user: ${req.userId}`);
  try {
    const posts = await Post.find({
      favoritedBy: req.userId,
      isArchived: { $ne: true },  
    }).sort({ createdAt: -1 }).lean();

    res.json(posts);
  } catch (err) {
    console.error("Error in /favorites route:", err);
    res.status(500).json({ message: "Failed to fetch favorites" });
  }
});


//                       SHARE PAGE ROUTE

app.get('/share/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = await Post.findById(postId);

    if (!post || post.isArchived || !post.media || post.media.length === 0) {
      return res.status(404).send('<h1>Post not found</h1>');
    }

    let keyToSign = post.media[0]?.originalKey || null;
    let mediaType = post.media[0]?.mediaType || 'image';

    // Generate signed URL for the first media item
    const mediaUrlParams = {
        Bucket: process.env.B2_BUCKET_NAME,
        Key: keyToSign,
        Expires: 60 * 60 // Share link media is valid for 1 hour
    };
    const mediaUrl = s3.getSignedUrl('getObject', mediaUrlParams);

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


app.use((req, res, next) => {
    console.log(`❓ Unmatched request: ${req.method} ${req.originalUrl}`);
    res.status(404).send("Route not found");
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});