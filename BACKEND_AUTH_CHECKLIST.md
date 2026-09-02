# Backend Authentication & API Setup Checklist

## ✅ Token Validation on Requests
- **JWT Strategy**: Configured to accept `Authorization: Bearer {token}` headers
- **JWT Guard**: Applied to all protected endpoints (`/auth/logout`, `/auth/me`, `/favourites/*`)
- **Token Validation**: Uses `process.env.JWT_SECRET` (now explicitly set in `.env`)
- **Expiration**: Access tokens expire in 1 hour (can be refreshed using refresh token)
- **Error Handling**: Returns 401 Unauthorized if token is missing, invalid, or expired
- **Enhanced Logging**: JWT Guard and Strategy now log validation results for debugging

## ✅ Logout Endpoint Expectations
**Endpoint**: `POST /auth/logout`
- **Authentication**: Requires valid JWT token (Bearer token in Authorization header)
- **Response**: Always returns 200 OK with success message
- **Server-side**: JWT is stateless (no token blacklisting needed)
- **Client behavior**: App clears token locally after logout
- **Fallback**: App gracefully handles 401 responses mid-session

## ✅ Profile Endpoint
**Endpoint**: `GET /auth/me`
- **Authentication**: Requires valid JWT token
- **Response**: Returns user object with:
  - `id`: User ID (as string)
  - `userId`: User ID (as string, for compatibility)
  - `email`: User email
  - `role`: User role (user/admin)
- **Token Payload**: Contains `sub` (user ID), `email`, `role`
- **Fallback**: App can extract `userId` from JWT `sub` claim if needed

## ✅ Login/Signup Endpoints
**Endpoints**: `POST /auth/login`, `POST /auth/signup`
- **Response Format**:
  ```json
  {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "123",
      "userId": "123",
      "email": "user@example.com",
      "fullName": "User Name",
      "role": "user"
    }
  }
  ```
- **Token Expiration**: Access token: 1 hour, Refresh token: 7 days
- **userId Field**: Explicitly included for app to persist locally

## ✅ Session Persistence
- **Token Storage**: App stores `accessToken` + `userId` locally
- **Request Headers**: All authenticated requests include `Authorization: Bearer {token}`
- **Token Validation**: Each request validates token signature and expiration
- **No special backend logic**: Backend just validates token on each request

## ✅ Refresh Token Flow
**Endpoint**: `POST /auth/refresh`
- **Input**: `{ "refreshToken": "eyJhbGc..." }`
- **Response**: New access and refresh tokens
- **Use case**: When access token expires (1 hour), app can refresh without re-login
- **Note**: App currently not using this—implement if smoother session handling needed

## 🔒 Security Configuration
- **JWT Secret**: `hiking-app-secret-key-2026` (set in `.env`)
- **JWT Refresh Secret**: `hiking-app-refresh-secret-key-2026` (set in `.env`)
- **CORS**: Enabled for all origins (configured in main.ts)
- **Token Format**: `Authorization: Bearer <token>` (standard Bearer scheme)

## 📋 Protected Endpoints (Require JWT)
```
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/trails/:id/cover-photo
POST   /api/trails/:id/media
POST   /api/trails/:id/transportation
POST   /api/trails/:id/phases
POST   /api/trails/:id/highlights
POST   /api/trails/:id/points-of-interest
POST   /api/trails/:id/cost-items
POST   /api/trails/:id/safety-items
POST   /api/trails/:id/seasons
POST   /api/trails/:id/avoided-months
POST   /api/trails/:id/gpx-route
PATCH  /api/trails/:id
DELETE /api/trails/:id
POST   /api/trails/:id/publish
POST   /api/favourites/trails/:trailId
DELETE /api/favourites/trails/:trailId
GET    /api/favourites
GET    /api/favourites/trails/:trailId/check
```

## 🚀 Testing the Setup

### 1. Login Flow
```bash
POST /api/auth/login
Body: { "email": "user@example.com", "password": "password123" }
Response: { accessToken, refreshToken, user }
```

### 2. Use Token on Protected Request
```bash
GET /api/auth/me
Header: Authorization: Bearer {accessToken}
Response: { id, userId, email, role }
```

### 3. Refresh Token
```bash
POST /api/auth/refresh
Body: { "refreshToken": "{refreshToken}" }
Response: { accessToken, refreshToken }
```

### 4. Logout
```bash
POST /api/auth/logout
Header: Authorization: Bearer {accessToken}
Response: { message: "Logged out successfully" }
```

## 📝 Notes for Frontend Team
- Token expires in 1 hour—implement refresh flow or re-login
- Always include `Authorization: Bearer {token}` header for protected endpoints
- Store both `accessToken` and `userId` after login
- Clear stored token on logout or 401 error
- Refresh token can be stored securely for background token refresh
