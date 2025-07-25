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
 *         description: Max users to return
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
    const limit = parseInt(req.query.limit) || 1000;
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
    const limit = 1000;
    
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
 *     summary: Validate user login credentials
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
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user by email - fetch all users with Clerk's hard limit (10 per page)
    let user = null;
    try {
      let allUsers = [];
      let offset = 0;
      const limit = 10; // Clerk's hard limit
      let batch = 1;
      while (true) {
        const users = await clerk.users.getUserList({ limit, offset });
        console.log(`[DEBUG] Batch ${batch}: Fetched ${users.length} users (requested ${limit})`);
        if (users.length === 0) break;
        allUsers = allUsers.concat(users);
        offset += limit;
        batch++;
        if (offset > 10000) {
          console.warn('Reached maximum user fetch limit (10,000)');
          break;
        }
      }
      // Find user by email (case-insensitive)
      user = allUsers.find(u =>
        u.emailAddresses?.some(ea => ea.emailAddress?.toLowerCase() === email.toLowerCase())
      );
    } catch (apiError) {
      console.error('Error fetching users:', apiError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch users from Clerk'
      });
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is banned
    if (user.banned) {
      return res.status(401).json({
        success: false,
        error: 'Account is blocked'
      });
    }

    // Check if user has password authentication enabled
    const hasPassword = user.passwordEnabled;
    
    if (!hasPassword) {
      return res.status(401).json({
        success: false,
        error: 'User does not have password authentication enabled'
      });
    }

    // Note: This endpoint provides basic user validation
    // For production use, you should implement proper password verification
    // Clerk's admin API doesn't provide direct password verification
    // Consider using Clerk's client-side authentication or implementing your own password verification

  // Verify password
    try {
      const verification = await clerk.users.verifyPassword({
        userId: user.id,
        password
      });

      if (!verification.verified) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // If we reach here, authentication was successful
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
        }
      });

    } catch (verificationError) {
      console.error('Password verification error:', verificationError);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }

  } catch (error) {
    console.error('Login validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
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
