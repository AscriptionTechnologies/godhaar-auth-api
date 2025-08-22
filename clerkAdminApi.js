const express = require('express');
const { Clerk } = require('@clerk/clerk-sdk-node');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
require('dotenv').config();
const cors = require('cors');

// --- Global Error Handlers ---
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err);
});

const app = express();
app.use(express.json());
app.use(cors());

// --- Clerk Initialization ---
const clerk = new Clerk({ secretKey: 'sk_live_iw5EKsXOFqQFJdyXCMdawwVo5y3NJyJAWGwx3ZISH5' });

// --- Swagger/OpenAPI Setup ---
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Godhaar Auth Admin API',
    version: '1.0.0',
    description: 'API for super admin management of Godhaar users',
  },
  servers: [
    { url: 'http://localhost:8080', description: 'Local server' },
    { url: 'https://godhaar-auth-api-202045537230.asia-south1.run.app/', description: 'Production server' }
  ],
};

const swaggerOptions = {
  swaggerDefinition,
  apis: [__filename],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/swagger.json', (req, res) => res.json(swaggerSpec));

// --- Request/Response Logging Middleware ---
app.use((req, res, next) => {
  console.log(`\n[Request] ${req.method} ${req.originalUrl}`);
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) {
    console.log('[Request Body]', JSON.stringify(req.body, null, 2));
  }
  const oldJson = res.json;
  res.json = function (body) {
    console.log(`[Response] ${res.statusCode} ${req.method} ${req.originalUrl}`);
    console.log('[Response Body]', JSON.stringify(body, null, 2));
    return oldJson.call(this, body);
  };
  next();
});

// --- Clerk User Management Endpoints ---

/**
 * @swagger
 * /user:
 *   post:
 *     summary: Create a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               unsafeMetadata:
 *                 type: object
 *                 description: Arbitrary metadata to store in Clerk's unsafeMetadata field
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Error
 */
app.post('/user', async (req, res) => {
  try {
    const { email, password, firstName, unsafeMetadata } = req.body;
    const user = await clerk.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      ...(unsafeMetadata ? { unsafeMetadata } : {})
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user/{userId}:
 *   delete:
 *     summary: Delete a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       400:
 *         description: Error
 */
app.delete('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await clerk.users.deleteUser(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user/list:
 *   get:
 *     summary: List all users (paginated)
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 900
 *         description: Max users to return (default 900)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of users
 *       400:
 *         description: Error
 */
app.get('/user/list', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 900; // Changed default from 1000 to 900
    const offset = parseInt(req.query.offset) || 0;
    const users = await clerk.users.getUserList({ limit, offset });
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user/{userId}:
 *   get:
 *     summary: Get a single user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User object
 *       404:
 *         description: Not found
 */
app.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await clerk.users.getUser(userId);
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user/{userId}:
 *   patch:
 *     summary: Update user profile fields
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Error
 */
app.patch('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, firstName, lastName, phoneNumber } = req.body;
    
    const updateData = {};
    if (email) updateData.emailAddress = [email];
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    
    const user = await clerk.users.updateUser(userId, updateData);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user/metadata/{userId}:
 *   patch:
 *     summary: Update user's unsafe metadata
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               unsafeMetadata:
 *                 type: object
 *                 description: Arbitrary metadata to store in Clerk's unsafeMetadata field
 *                 example:
 *                   role: "premium"
 *                   preferences: { theme: "dark", notifications: true }
 *                   customData: "any value"
 *     responses:
 *       200:
 *         description: User metadata updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   description: Updated user object
 *       400:
 *         description: Error updating metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 */
app.patch('/user/metadata/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { unsafeMetadata } = req.body;
    
    if (!unsafeMetadata) {
      return res.status(400).json({ 
        success: false, 
        error: 'unsafeMetadata is required in request body' 
      });
    }
    
    const user = await clerk.users.updateUser(userId, { unsafeMetadata });
    
    res.json({ 
      success: true, 
      user 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /user/password/{userId}:
 *   patch:
 *     summary: Change user password
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 *       400:
 *         description: Error
 */
app.patch('/user/password/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;
    const user = await clerk.users.updateUser(userId, { password });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user/search:
 *   get:
 *     summary: Search users by email (partial match)
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users matching email
 *       400:
 *         description: Error
 */
app.get('/user/search', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Missing email query param' });
    
    // Fetch all users with pagination
    let allUsers = [];
    let offset = 0;
    const limit = 900; // Updated default limit
    
    while (true) {
      const users = await clerk.users.getUserList({ limit, offset });
      if (users.length === 0) break;
      
      allUsers = allUsers.concat(users);
      offset += limit;
      
      // Safety check
      if (offset > 10000) break;
    }
    
    const filtered = allUsers.filter(u => 
      u.emailAddresses.some(ea => ea.emailAddress.includes(email))
    );
    res.json(filtered);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user/email/{email}:
 *   get:
 *     summary: Get user ID by email address
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Email address to search for
 *     responses:
 *       200:
 *         description: User ID found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 userId:
 *                   type: string
 *                   description: The user ID associated with the email
 *                 email:
 *                   type: string
 *                   description: The email address that was searched
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "User not found"
 *       400:
 *         description: Invalid email format or error
 */
app.get('/user/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log(`[DEBUG] Searching for user with email: ${email}`);
    
    if (!email || email.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Email parameter is required and cannot be empty' 
      });
    }
    
    // Decode URL-encoded email (in case it contains special characters)
    const decodedEmail = decodeURIComponent(email.trim());
    console.log(`[DEBUG] Decoded email: ${decodedEmail}`);
    
    // Fetch all users with pagination - using smaller batches for reliability
    let allUsers = [];
    let offset = 0;
    const limit = 100; // Smaller batch size for more reliable fetching
    let totalFetched = 0;
    
    console.log('[DEBUG] Starting to fetch users...');
    
    while (true) {
      try {
        console.log(`[DEBUG] Fetching batch: offset=${offset}, limit=${limit}`);
        const users = await clerk.users.getUserList({ limit, offset });
        
        console.log(`[DEBUG] Fetched ${users.length} users in this batch`);
        
        if (users.length === 0) {
          console.log('[DEBUG] No more users to fetch');
          break;
        }
        
        allUsers = allUsers.concat(users);
        totalFetched += users.length;
        offset += limit;
        
        // Safety check to prevent infinite loops
        if (offset > 50000) {
          console.warn('[DEBUG] Reached maximum fetch limit (50,000)');
          break;
        }
        
        // If we got less than the limit, we've reached the end
        if (users.length < limit) {
          console.log(`[DEBUG] Reached end of users (got ${users.length} < ${limit})`);
          break;
        }
        
      } catch (batchError) {
        console.error(`[DEBUG] Error fetching batch at offset ${offset}:`, batchError);
        break;
      }
    }
    
    console.log(`[DEBUG] Total users fetched: ${totalFetched}`);
    
    if (totalFetched === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch any users from Clerk'
      });
    }
    
    // Log some sample emails for debugging
    const sampleEmails = allUsers.slice(0, 5).map(u => {
      const primaryEmail = u.emailAddresses?.[0]?.emailAddress || 'No email';
      return { userId: u.id, email: primaryEmail };
    });
    console.log('[DEBUG] Sample users:', sampleEmails);
    
    // Find user by email (case-insensitive exact match)
    console.log(`[DEBUG] Searching for exact match of: "${decodedEmail.toLowerCase()}"`);
    
    const user = allUsers.find(u => {
      if (!u.emailAddresses || !Array.isArray(u.emailAddresses)) {
        return false;
      }
      
      return u.emailAddresses.some(ea => {
        if (!ea || !ea.emailAddress) return false;
        const userEmail = ea.emailAddress.toLowerCase();
        const searchEmail = decodedEmail.toLowerCase();
        console.log(`[DEBUG] Comparing: "${userEmail}" === "${searchEmail}"`);
        return userEmail === searchEmail;
      });
    });
    
    if (!user) {
      console.log(`[DEBUG] User not found for email: ${decodedEmail}`);
      return res.status(404).json({ 
        success: false, 
        error: 'User not found',
        searchedEmail: decodedEmail,
        totalUsersSearched: totalFetched
      });
    }
    
    console.log(`[DEBUG] User found: ${user.id}`);
    
    res.json({
      success: true,
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      searchedEmail: decodedEmail
    });
    
  } catch (error) {
    console.error('[ERROR] Get user by email error:', error);
    res.status(500).json({ 
      success: false, 
      error: `Internal server error: ${error.message}`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @swagger
 * /user/block/{userId}:
 *   post:
 *     summary: Block a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User blocked
 *       400:
 *         description: Error
 */
app.post('/user/block/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await clerk.users.updateUser(userId, { banned: true });
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user/unblock/{userId}:
 *   post:
 *     summary: Unblock a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User unblocked
 *       400:
 *         description: Error
 */
app.post('/user/unblock/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await clerk.users.updateUser(userId, { banned: false });
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user/verify-email/{userId}:
 *   post:
 *     summary: Mark a user's email as verified
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email marked as verified
 *       400:
 *         description: Error
 */
app.post('/user/verify-email/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await clerk.users.updateUser(userId, { emailVerified: true });
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user/reset-password/{userId}:
 *   post:
 *     summary: Send password reset email to user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       400:
 *         description: Error
 */
app.post('/user/reset-password/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await clerk.users.sendPasswordResetEmail(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Validate user login credentials (optimized for speed)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 userId:
 *                   type: string
 *                   description: User ID if login successful
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 user:
 *                   type: object
 *                   description: User information
 *       400:
 *         description: Invalid credentials or user not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   description: Error message
 *       401:
 *         description: Invalid password or account blocked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid password"
 */
app.post('/auth/login', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    console.log(`[LOGIN] Starting login for: ${email}`);
    
    // OPTIMIZED APPROACH: Search in batches and stop when user is found
    let user = null;
    let offset = 0;
    const limit = 50; // Reasonable batch size for speed vs memory
    let totalChecked = 0;
    const maxSearchTime = 10000; // 10 second timeout
    
    try {
      while (!user && (Date.now() - startTime) < maxSearchTime) {
        console.log(`[LOGIN] Searching batch: offset=${offset}, limit=${limit}`);
        
        const batchStart = Date.now();
        const users = await clerk.users.getUserList({ limit, offset });
        const batchTime = Date.now() - batchStart;
        
        console.log(`[LOGIN] Fetched ${users.length} users in ${batchTime}ms`);
        
        if (users.length === 0) {
          console.log('[LOGIN] No more users to check');
          break;
        }
        
        totalChecked += users.length;
        
        // Search for user in current batch
        user = users.find(u => {
          if (!u.emailAddresses || !Array.isArray(u.emailAddresses)) {
            return false;
          }
          return u.emailAddresses.some(ea => 
            ea.emailAddress?.toLowerCase() === email.toLowerCase()
          );
        });
        
        if (user) {
          console.log(`[LOGIN] User found in batch! UserId: ${user.id}, Total checked: ${totalChecked}`);
          break;
        }
        
        offset += limit;
        
        // Safety checks
        if (offset > 10000) {
          console.warn('[LOGIN] Reached maximum search limit (10,000)');
          break;
        }
        
        // If we got less than the limit, we've reached the end
        if (users.length < limit) {
          console.log(`[LOGIN] Reached end of users (got ${users.length} < ${limit})`);
          break;
        }
      }
      
    } catch (apiError) {
      console.error('[LOGIN] Error during user search:', apiError);
      
      // If it's a timeout or network error, return a specific message
      if (apiError.code === 'ECONNABORTED' || apiError.message?.includes('timeout')) {
        return res.status(408).json({
          success: false,
          error: 'Search request timed out. Please try again.'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to search users. Please try again.'
      });
    }
    
    const searchTime = Date.now() - startTime;
    console.log(`[LOGIN] Search completed in ${searchTime}ms, checked ${totalChecked} users`);
    
    // Check if search timed out
    if (searchTime >= maxSearchTime) {
      console.warn(`[LOGIN] Search timed out after ${searchTime}ms`);
      return res.status(408).json({
        success: false,
        error: 'Login search timed out. Please try again or contact support.'
      });
    }
    
    if (!user) {
      console.log(`[LOGIN] User not found: ${email}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Quick validation checks
    if (user.banned) {
      console.log(`[LOGIN] User is banned: ${user.id}`);
      return res.status(401).json({
        success: false,
        error: 'Account is blocked'
      });
    }
    
    if (!user.passwordEnabled) {
      console.log(`[LOGIN] Password not enabled for user: ${user.id}`);
      return res.status(401).json({
        success: false,
        error: 'Password authentication not available'
      });
    }
    
    // Fast password verification with timeout
    console.log(`[LOGIN] Verifying password for user: ${user.id}`);
    const verifyStart = Date.now();
    
    try {
      // Create a promise with timeout for password verification
      const verificationPromise = clerk.users.verifyPassword({
        userId: user.id,
        password
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Password verification timeout')), 5000)
      );
      
      const verification = await Promise.race([verificationPromise, timeoutPromise]);
      const verifyTime = Date.now() - verifyStart;
      
      console.log(`[LOGIN] Password verification completed in ${verifyTime}ms`);
      
      if (!verification.verified) {
        console.log(`[LOGIN] Invalid password for user: ${user.id}`);
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`[LOGIN] Login successful for ${user.id} in ${totalTime}ms`);
      
      // Success response
      return res.json({
        success: true,
        userId: user.id,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified
        },
        debug: {
          searchTime: searchTime,
          verifyTime: verifyTime,
          totalTime: totalTime,
          usersChecked: totalChecked
        }
      });
      
    } catch (verificationError) {
      console.error('[LOGIN] Password verification error:', verificationError);
      
      if (verificationError.message === 'Password verification timeout') {
        return res.status(408).json({
          success: false,
          error: 'Authentication timed out. Please try again.'
        });
      }
      
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[LOGIN] Login error after ${totalTime}ms:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Login service temporarily unavailable. Please try again.'
    });
  }
});

/**
 * @swagger
 * /debug/user-count:
 *   get:
 *     summary: Debug endpoint to count total users (for troubleshooting)
 *     responses:
 *       200:
 *         description: Total user count
 */
app.get('/debug/user-count', async (req, res) => {
  try {
    let allUsers = [];
    let offset = 0;
    const limit = 10;
    let batch = 1;
    
    while (true) {
      const users = await clerk.users.getUserList({ limit, offset });
      console.log(`[DEBUG] Debug batch ${batch}: Fetched ${users.length} users (requested ${limit})`);
      if (users.length === 0) break;
      
      allUsers = allUsers.concat(users);
      offset += limit;
      batch++;
      
      if (offset > 10000) {
        console.warn('Reached maximum user fetch limit (10,000)');
        break;
      }
    }
    
    res.json({
      totalUsers: allUsers.length,
      batches: batch - 1,
      sampleEmails: allUsers.slice(0, 5).map(u => u.emailAddresses?.[0]?.emailAddress || 'No email')
    });
  } catch (error) {
    console.error('Debug user count error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Godhaar Auth Admin API running on port ${PORT}`);
});
