const express = require('express');
const fs = require('fs');
const path = require('path');
const { Clerk } = require('@clerk/clerk-sdk-node');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
require('dotenv').config();

const app = express();
app.use(express.json());

// --- Swagger/OpenAPI Setup ---
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Clerk Admin API',
    version: '1.0.0',
    description: 'API for super admin management of Clerk users',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local server' }
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
  // Capture response body
  const oldJson = res.json;
  res.json = function (body) {
    console.log(`[Response] ${res.statusCode} ${req.method} ${req.originalUrl}`);
    console.log('[Response Body]', JSON.stringify(body, null, 2));
    return oldJson.call(this, body);
  };
  next();
});

const clerk = new Clerk({ secretKey: 'sk_live_iw5EKsXOFqQFJdyXCMdawwVo5y3NJyJAWGwx3ZISH5' });

// --- Docs Endpoint ---
/**
 * @swagger
 * /docs:
 *   get:
 *     summary: Get API documentation (README rendered as HTML with link to Swagger UI)
 *     description: |
 *       Returns the README.md rendered as HTML, with a summary, a link to Swagger UI, and a table of contents for easy navigation.
 *       For interactive API testing, use the Swagger UI at /swagger.
 *     responses:
 *       200:
 *         description: Returns the README.md as HTML
 */
let marked;
try { marked = require('marked'); } catch (e) { marked = null; }
app.get('/docs', (req, res) => {
  const readmePath = path.join(__dirname, 'README.md');
  fs.readFile(readmePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Could not load documentation.');
    } else {
      let html = '';
      if (marked) {
        html = marked.parse(data);
      } else {
        html = `<pre>${data}</pre>`;
      }
      // Extract table of contents from markdown (headers)
      const toc = [];
      const lines = data.split('\n');
      for (const line of lines) {
        const match = /^(#+)\s+(.*)/.exec(line);
        if (match) {
          const level = match[1].length;
          const text = match[2];
          const anchor = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          toc.push({ level, text, anchor });
        }
      }
      let tocHtml = '<ul style="list-style:none; padding-left:0;">';
      for (const { level, text, anchor } of toc) {
        tocHtml += `<li style="margin-left:${(level-1)*16}px"><a href="#${anchor}">${text}</a></li>`;
      }
      tocHtml += '</ul>';
      res.send(`
        <html>
          <head>
            <title>Clerk Admin API Docs</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; background: #f9f9f9; color: #222; }
              .container { max-width: 900px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 32px; }
              h1, h2, h3 { color: #2c3e50; }
              a.button { display: inline-block; margin-bottom: 24px; padding: 10px 18px; background: #007bff; color: #fff; border-radius: 6px; text-decoration: none; font-weight: 500; }
              a.button:hover { background: #0056b3; }
              pre, code { background: #f4f4f4; border-radius: 4px; padding: 2px 6px; }
              .toc { margin-bottom: 32px; background: #f4f8fb; border-radius: 6px; padding: 16px; }
            </style>
          </head>
          <body>
            <div class="container">
              <a href="/swagger" class="button">Open Swagger UI</a>
              <h1>Clerk Admin API Documentation</h1>
              <p>This page renders the <code>README.md</code> for quick reference. For interactive API testing, use <a href="/swagger">Swagger UI</a>.</p>
              <div class="toc">
                <strong>Table of Contents</strong>
                ${tocHtml}
              </div>
              ${html}
            </div>
          </body>
        </html>
      `);
    }
  });
});

// --- Clerk User Management Endpoints (RESTful, action-specific) ---

/**
 * @swagger
 * /user/create:
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
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Error
 */
app.post('/user/create', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phoneNumber } = req.body;
    const user = await clerk.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      lastName,
      phoneNumber,
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user/delete/{userId}:
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
app.delete('/user/delete/:userId', async (req, res) => {
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
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const users = await clerk.users.getUserList({ limit, offset });
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user/get/{userId}:
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
app.get('/user/get/:userId', async (req, res) => {
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
 * /user/update/{userId}:
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
app.patch('/user/update/:userId', async (req, res) => {
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
 * /user/password/:userId:
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
    const users = await clerk.users.getUserList({ limit: 200 });
    const filtered = users.filter(u => u.emailAddresses.some(ea => ea.emailAddress.includes(email)));
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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Clerk Admin API running on port ${PORT}`);
}); 