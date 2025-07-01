# Clerk Admin API

A Node.js Express API for super admin management of Clerk users. This API allows you to create, delete, fetch, update, and search users in your Clerk instance. Intended for use in a secure admin dashboard.

## Features
- Add new Clerk users
- Delete Clerk users
- Fetch all Clerk users (paginated)
- Fetch a single user by ID
- Update user profile fields (email, name, phone)
- Change user passwords
- Search users by email (partial match)
- **Admin authentication required for all endpoints**

## Setup

1. **Clone the repository or copy the AuthBackend folder.**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Environment Variables:**
   - Create a `.env` file in the `AuthBackend` directory:
     ```env
     CLERK_SECRET_KEY=your_clerk_secret_key
     ADMIN_TOKEN=your_admin_token_here
     PORT=3001
     ```
   - Replace `your_clerk_secret_key` with your actual Clerk secret key (starts with `sk_`).
   - Set `ADMIN_TOKEN` to a strong random string. This is required in the `x-admin-token` header for all API requests.
   - **Do NOT use a public key (pk_) for admin operations!**

4. **Start the server:**
   ```bash
   node clerkAdminApi.js
   ```

## Authentication
All endpoints require an `x-admin-token` header with the value set to your `ADMIN_TOKEN` from the `.env` file.

Example:
```http
x-admin-token: your_admin_token_here
```

## API Endpoints

All endpoints return JSON. All write operations require valid data in the request body.

### 1. Create a New User
- **POST** `/users`
- **Headers:** `x-admin-token`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890" // optional
  }
  ```
- **Response:**
  ```json
  {
    "id": "user_...",
    ...
  }
  ```

### 2. Delete a User
- **DELETE** `/users/:userId`
- **Headers:** `x-admin-token`
- **Response:**
  ```json
  { "success": true }
  ```

### 3. Fetch All Users (Paginated)
- **GET** `/users?limit=50&offset=0`
- **Headers:** `x-admin-token`
- **Query Params:**
  - `limit` (default 50)
  - `offset` (default 0)
- **Response:**
  ```json
  [
    { "id": "user_...", ... },
    ...
  ]
  ```

### 4. Fetch a Single User by ID
- **GET** `/users/:userId`
- **Headers:** `x-admin-token`
- **Response:**
  ```json
  { "id": "user_...", ... }
  ```

### 5. Update User Profile Fields
- **PATCH** `/users/:userId`
- **Headers:** `x-admin-token`
- **Body:** (any combination of fields)
  ```json
  {
    "email": "newemail@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "phoneNumber": "+1234567890"
  }
  ```
- **Response:**
  ```json
  { "id": "user_...", ... }
  ```

### 6. Change User Password
- **PATCH** `/users/:userId/password`
- **Headers:** `x-admin-token`
- **Body:**
  ```json
  { "password": "newPassword123" }
  ```
- **Response:**
  ```json
  { "id": "user_...", ... }
  ```

### 7. Search Users by Email (Partial Match)
- **GET** `/search/users?email=partial@email.com`
- **Headers:** `x-admin-token`
- **Response:**
  ```json
  [
    { "id": "user_...", ... },
    ...
  ]
  ```

## Example Usage (with curl)

**Create a user:**
```bash
curl -X POST http://localhost:3001/users \
  -H 'Content-Type: application/json' \
  -H 'x-admin-token: your_admin_token_here' \
  -d '{"email":"user@example.com","password":"password123","firstName":"John","lastName":"Doe"}'
```

**Delete a user:**
```bash
curl -X DELETE http://localhost:3001/users/user_abc123 \
  -H 'x-admin-token: your_admin_token_here'
```

**Fetch users:**
```bash
curl http://localhost:3001/users?limit=10&offset=0 \
  -H 'x-admin-token: your_admin_token_here'
```

**Fetch a single user:**
```bash
curl http://localhost:3001/users/user_abc123 \
  -H 'x-admin-token: your_admin_token_here'
```

**Update user profile:**
```bash
curl -X PATCH http://localhost:3001/users/user_abc123 \
  -H 'Content-Type: application/json' \
  -H 'x-admin-token: your_admin_token_here' \
  -d '{"firstName":"Jane","lastName":"Smith"}'
```

**Change password:**
```bash
curl -X PATCH http://localhost:3001/users/user_abc123/password \
  -H 'Content-Type: application/json' \
  -H 'x-admin-token: your_admin_token_here' \
  -d '{"password":"newPassword123"}'
```

**Search users by email:**
```bash
curl http://localhost:3001/search/users?email=example \
  -H 'x-admin-token: your_admin_token_here'
```

## Security Notes
- **Never expose this API to the public internet.**
- Restrict access to trusted super admin users only (e.g., via VPN, firewall, or admin authentication middleware).
- Always use your Clerk **secret key** (starts with `sk_`) for admin operations.
- Do not log sensitive data (passwords, secret keys).
- Change your `ADMIN_TOKEN` regularly and keep it secret.

## Enhancements & Customization
- Add more granular admin authentication (JWT, OAuth, etc.)
- Add user search/filter by other fields
- Add rate limiting and logging
- Add audit logging for all admin actions

## License
MIT 