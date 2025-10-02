import admin from 'firebase-admin';

/**
 * Middleware to authenticate requests using a Firebase ID token.
 * It verifies the token from the Authorization header and attaches the user's UID
 * to the request object (req.userId) for use in protected routes.
 */
const authenticate = async (req, res, next) => {
  // Get the Authorization header from the request
  const authHeader = req.headers.authorization;

  // Check if the header exists and is in the correct "Bearer <token>" format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided or invalid format.' });
  }

  // Extract the token from the header
  const idToken = authHeader.split('Bearer ')[1];

  try {
    // Verify the token using the Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Attach the user's unique Firebase ID (uid) to the request object
    req.userId = decodedToken.uid;
    
    // Pass control to the next function in the middleware chain (the route handler)
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return res.status(403).json({ message: 'Forbidden: Invalid or expired token.' });
  }
};

export { authenticate };