# 🔗 Complete API Endpoints Reference

**Base URL:** `http://localhost:4000/api`

All endpoints use the `/api` prefix globally.

---

## 📋 Table of Contents

1. [App](#app) - 1 endpoint
2. [Auth](#auth) - 4 endpoints
3. [Users](#users) - 6 endpoints
4. [Trails](#trails) - 19 endpoints
5. [Hikes Recording](#hikes-recording) - 11 endpoints
6. [Favourites](#favourites) - 4 endpoints

**Total: 45 Endpoints**

---

## 🏠 App

### 1. Health Check
- **Endpoint:** `GET /api`
- **Description:** API health check
- **Auth:** None
- **Response:** `{ "message": "Hello World!" }`

---

## 🔐 Auth

### 1. Signup
- **Endpoint:** `POST /api/auth/signup`
- **Description:** Register a new user account
- **Auth:** None
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "fullName": "John Doe"
  }
  ```
- **Response (201):** `{ "id": 1, "email": "user@example.com", "accessToken": "...", "refreshToken": "..." }`

### 2. Login
- **Endpoint:** `POST /api/auth/login`
- **Description:** Login with email and password
- **Auth:** None
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response (200):** `{ "accessToken": "...", "refreshToken": "..." }`

### 3. Refresh Token
- **Endpoint:** `POST /api/auth/refresh`
- **Description:** Refresh access token using refresh token
- **Auth:** Bearer Token (refresh token)
- **Response (200):** `{ "accessToken": "..." }`

### 4. Logout
- **Endpoint:** `POST /api/auth/logout`
- **Description:** Logout user
- **Auth:** Bearer Token (required)
- **Response (200):** `{ "message": "Logged out successfully" }`

### 5. Get Current User
- **Endpoint:** `GET /api/auth/me`
- **Description:** Get current logged-in user
- **Auth:** Bearer Token (required)
- **Response (200):** `{ "id": 1, "email": "user@example.com", "fullName": "John Doe", "role": "user" }`

---

## 👥 Users

### 1. Create User
- **Endpoint:** `POST /api/users`
- **Description:** Create a new user
- **Auth:** None
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "fullName": "John Doe"
  }
  ```
- **Response (201):** User object

### 2. Upload Avatar
- **Endpoint:** `POST /api/users/:id/avatar`
- **Description:** Upload user avatar
- **Auth:** None
- **Request:** Multipart form-data with `file` field
- **Response (200):** `{ "avatarUrl": "https://..." }`

### 3. Get All Users
- **Endpoint:** `GET /api/users?skip=0&take=10`
- **Description:** Get all users with pagination
- **Auth:** None
- **Query Params:**
  - `skip` (optional, default: 0) - Number of users to skip
  - `take` (optional, default: 10) - Number of users to take
- **Response (200):**
  ```json
  {
    "data": [{ "id": 1, "email": "user@example.com", "fullName": "John Doe" }],
    "total": 1
  }
  ```

### 4. Get User by ID
- **Endpoint:** `GET /api/users/:id`
- **Description:** Get user by ID
- **Auth:** None
- **Response (200):** User object

### 5. Update User
- **Endpoint:** `PATCH /api/users/:id`
- **Description:** Update user details
- **Auth:** Bearer Token (required)
- **Request Body:**
  ```json
  {
    "fullName": "Jane Doe",
    "phone": "+1234567890"
  }
  ```
- **Response (200):** Updated user object

### 6. Delete User
- **Endpoint:** `DELETE /api/users/:id`
- **Description:** Delete user
- **Auth:** Bearer Token (required)
- **Response (204):** No content

### 7. Update User Role
- **Endpoint:** `PATCH /api/users/:id/role`
- **Description:** Update user role (admin only)
- **Auth:** Bearer Token (required, admin)
- **Request Body:**
  ```json
  {
    "role": "admin"
  }
  ```
- **Response (200):** Updated user object

---

## 🥾 Trails

### 1. Create Trail
- **Endpoint:** `POST /api/trails`
- **Description:** Create a new trail
- **Auth:** Bearer Token (required)
- **Request Body:**
  ```json
  {
    "slug": "shivapuri-day-hike",
    "hikeName": "Shivapuri Day Hike",
    "description": "Description...",
    "maxAltitudeM": 2732,
    "difficulty": "moderate",
    "activity": "hiking",
    "region": "Kathmandu Valley",
    "country": "Nepal"
  }
  ```
- **Response (201):** Trail object with location data

### 2. Get All Trails
- **Endpoint:** `GET /api/trails?skip=0&take=50&status=active&difficulty=moderate`
- **Description:** Get all trails with optional filters
- **Auth:** None
- **Query Params:**
  - `skip` (optional) - Number of trails to skip
  - `take` (optional) - Number of trails to take
  - `status` (optional) - Filter by status (draft, active, inactive)
  - `difficulty` (optional) - Filter by difficulty
  - `activity` (optional) - Filter by activity type
  - `search` (optional) - Search by name or description
- **Response (200):**
  ```json
  {
    "data": [{ trail objects }],
    "total": 100,
    "skip": 0,
    "take": 50
  }
  ```

### 3. Get Trail by ID
- **Endpoint:** `GET /api/trails/:id`
- **Description:** Get trail by ID with full details
- **Auth:** None
- **Response (200):** Full trail object with all related data

### 4. Update Trail
- **Endpoint:** `PATCH /api/trails/:id`
- **Description:** Update trail details
- **Auth:** Bearer Token (required)
- **Request Body:** Partial trail object
- **Response (200):** Updated trail object

### 5. Delete Trail
- **Endpoint:** `DELETE /api/trails/:id`
- **Description:** Delete trail
- **Auth:** Bearer Token (required)
- **Response (204):** No content

### 6. Publish Trail
- **Endpoint:** `POST /api/trails/:id/publish`
- **Description:** Publish trail (change status to active)
- **Auth:** Bearer Token (required)
- **Response (200):** Updated trail with status = "active"

### 7. Add Itinerary Phase
- **Endpoint:** `POST /api/trails/:id/phases`
- **Description:** Add itinerary phase to trail
- **Auth:** Bearer Token (required)
- **Request Body:**
  ```json
  {
    "phaseNumber": 1,
    "title": "Day 1",
    "durationLabel": "8 hours",
    "durationMinutes": 480,
    "altitudeM": 2500,
    "details": [
      { "detail": "Start from...", "sortOrder": 0 }
    ]
  }
  ```
- **Response (201):** Created phase object

### 8. Add Highlight
- **Endpoint:** `POST /api/trails/:id/highlights`
- **Description:** Add highlight to trail
- **Auth:** Bearer Token (required)
- **Request Body:**
  ```json
  {
    "text": "Beautiful mountain views",
    "sortOrder": 0
  }
  ```
- **Response (201):** Created highlight object

### 9. Add Point of Interest
- **Endpoint:** `POST /api/trails/:id/points-of-interest`
- **Description:** Add POI to trail with images
- **Auth:** Bearer Token (required)
- **Request:** Multipart form-data
- **Fields:**
  - `name` - POI name
  - `description` - POI description
  - `latitude` - GPS latitude
  - `longitude` - GPS longitude
  - `altitudeM` - Altitude
  - `distanceKm` - Distance from start
  - `images` - Image files (array)
- **Response (201):** Created POI object

### 10. Add Cost Item
- **Endpoint:** `POST /api/trails/:id/cost-items`
- **Description:** Add cost item (included/excluded) to trail
- **Auth:** Bearer Token (required)
- **Request Body:**
  ```json
  {
    "type": "included",
    "text": "Guided tour",
    "sortOrder": 0
  }
  ```
- **Response (201):** Created cost item

### 11. Add Safety Item
- **Endpoint:** `POST /api/trails/:id/safety-items`
- **Description:** Add safety item (precaution/required gear) to trail
- **Auth:** Bearer Token (required)
- **Request Body:**
  ```json
  {
    "type": "required_gear",
    "text": "Hiking boots",
    "sortOrder": 0
  }
  ```
- **Response (201):** Created safety item

### 12. Add Recommended Season
- **Endpoint:** `POST /api/trails/:id/seasons`
- **Description:** Add recommended season to trail
- **Auth:** Bearer Token (required)
- **Request Body:**
  ```json
  {
    "season": "spring",
    "sortOrder": 0
  }
  ```
- **Response (201):** Created season

### 13. Add Avoided Month
- **Endpoint:** `POST /api/trails/:id/avoided-months`
- **Description:** Add month to avoid to trail
- **Auth:** Bearer Token (required)
- **Request Body:**
  ```json
  {
    "monthNumber": 7,
    "monthLabel": "July",
    "reason": "Heavy monsoon",
    "sortOrder": 0
  }
  ```
- **Response (201):** Created avoided month

### 14. Add Trail Media
- **Endpoint:** `POST /api/trails/:id/media`
- **Description:** Add media (photos/videos) to trail
- **Auth:** Bearer Token (required)
- **Request:** Multipart form-data
- **Fields:**
  - `type` - Media type (cover, route, gallery, video)
  - `url` - Media URL
  - `altText` - Alt text for images
  - `images` - Image files (array)
- **Response (201):** Created media object(s)

### 15. Upload GPX Route
- **Endpoint:** `POST /api/trails/:id/gpx-route`
- **Description:** Upload GPX route file for trail
- **Auth:** Bearer Token (required)
- **Request:** Multipart form-data with `gpxFile` field
- **Response (200):**
  ```json
  {
    "routeFilePath": "/uploads/gpx/...",
    "routeFileType": "gpx"
  }
  ```

---

## 🎒 Hikes Recording

### 1. Start Recording
- **Endpoint:** `POST /api/hikes/record/start`
- **Description:** Start a new hike recording session
- **Auth:** None
- **Request Body:**
  ```json
  {
    "trailId": 123,
    "userId": 456,
    "startTime": "2026-08-19T10:30:00Z"
  }
  ```
- **Response (201):** Session object with ID, status "active"

### 2. Pause/Resume Recording
- **Endpoint:** `PATCH /api/hikes/record/:sessionId/pause`
- **Description:** Pause or resume recording
- **Auth:** None
- **Request Body:**
  ```json
  {
    "action": "pause"
  }
  ```
- **Response (200):** Updated session object

### 3. Add GPS Track Point
- **Endpoint:** `POST /api/hikes/record/:sessionId/track-point`
- **Description:** Record GPS track point (call every 10-30 seconds)
- **Auth:** None
- **Request Body:**
  ```json
  {
    "latitude": 27.7172,
    "longitude": 85.324,
    "elevation": 2500,
    "accuracy": 10,
    "heading": 45,
    "speed": 3.5,
    "timestamp": "2026-08-19T10:35:00Z",
    "distanceSinceLastPoint": 0.15
  }
  ```
- **Response (200):** `{ "success": true, "trackPointId": 789, "totalDistance": 2.45 }`

### 4. Add Waypoint with Photos
- **Endpoint:** `POST /api/hikes/record/:sessionId/waypoints`
- **Description:** Add POI with photos during recording
- **Auth:** None
- **Request:** Multipart form-data
- **Fields:**
  - `name` - Waypoint name (max 50 chars)
  - `description` - Description (max 200 chars)
  - `type` - POI type (required) - viewpoint, restArea, waterSource, campsite, landmark, danger, parking, trailhead, junction, shelter, bridge, summit, other
  - `latitude` - GPS latitude (required)
  - `longitude` - GPS longitude (required)
  - `elevation` - Altitude in meters
  - `facilities` - Array of facilities
  - `conditions` - Weather/trail conditions (max 150 chars)
  - `timestamp` - ISO 8601 timestamp (required)
  - `distanceFromStart` - Distance from start in km
  - `durationAtStart` - Duration when recorded
  - `photos` - Photo files (max 5, 10MB each)
- **Response (201):** Waypoint object with photos

### 5. Update Waypoint
- **Endpoint:** `PATCH /api/hikes/record/waypoints/:waypointId?sessionId={sessionId}`
- **Description:** Update waypoint details
- **Auth:** None
- **Request:** Multipart form-data (all fields optional)
- **Response (200):** Updated waypoint object

### 6. Delete Waypoint
- **Endpoint:** `DELETE /api/hikes/record/waypoints/:waypointId?sessionId={sessionId}`
- **Description:** Delete waypoint from session
- **Auth:** None
- **Response (200):** `{ "success": true, "message": "Waypoint deleted successfully" }`

### 7. Add Photos to Waypoint
- **Endpoint:** `POST /api/hikes/record/waypoints/:waypointId/photos?sessionId={sessionId}`
- **Description:** Add more photos to existing waypoint
- **Auth:** None
- **Request:** Multipart form-data with `photos` field (max 5, 10MB each)
- **Response (201):**
  ```json
  {
    "success": true,
    "photosAdded": 2,
    "totalPhotos": 3,
    "photos": [
      { "photoId": 1004, "photoUrl": "/api/photos/1004", "thumbnail": "/api/photos/1004/thumb" }
    ]
  }
  ```

### 8. Finish Recording
- **Endpoint:** `POST /api/hikes/record/:sessionId/finish`
- **Description:** Complete recording session
- **Auth:** None
- **Request Body:**
  ```json
  {
    "endTime": "2026-08-19T14:30:00Z",
    "totalDistance": 12.5,
    "totalAltitude": 850,
    "maxAltitude": 2850,
    "minAltitude": 1980,
    "summary": "Great hike!"
  }
  ```
- **Response (200):**
  ```json
  {
    "sessionId": "uuid-string",
    "status": "completed",
    "duration": "04:00:00",
    "totalDistance": 12.5,
    "waypointCount": 5,
    "photoCount": 12
  }
  ```

### 9. Get Recording Session
- **Endpoint:** `GET /api/hikes/record/:sessionId`
- **Description:** Get current recording session with waypoints
- **Auth:** None
- **Response (200):** Session object with waypoints and stats

### 10. Get Recording History
- **Endpoint:** `GET /api/hikes/records?userId=456&trailId=123&status=completed&fromDate=2026-08-01&toDate=2026-08-31&limit=10&offset=0`
- **Description:** Get user's recording history
- **Auth:** None
- **Query Params:**
  - `userId` (required) - User ID
  - `trailId` (optional) - Filter by trail
  - `status` (optional) - Filter by status (completed, abandoned)
  - `fromDate` (optional) - ISO 8601 start date
  - `toDate` (optional) - ISO 8601 end date
  - `limit` (optional, default: 10) - Results per page
  - `offset` (optional, default: 0) - Pagination offset
- **Response (200):**
  ```json
  {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "records": [
      {
        "sessionId": "uuid",
        "trailId": 123,
        "trailName": "Shivapuri Day Hike",
        "duration": "04:00:00",
        "totalDistance": 12.5,
        "waypointCount": 5,
        "photoCount": 12
      }
    ]
  }
  ```

### 11. Get Session Waypoints
- **Endpoint:** `GET /api/hikes/record/:sessionId/waypoints?type=viewpoint&limit=50&offset=0`
- **Description:** Get waypoints from recording session
- **Auth:** None
- **Query Params:**
  - `type` (optional) - Filter by POI type
  - `limit` (optional, default: 50)
  - `offset` (optional, default: 0)
- **Response (200):**
  ```json
  {
    "total": 5,
    "waypoints": [
      {
        "poiId": 999,
        "name": "Mountain Peak",
        "type": "viewpoint",
        "latitude": 27.7172,
        "longitude": 85.324,
        "photoCount": 3
      }
    ]
  }
  ```

---

## ❤️ Favourites

### 1. Add Trail to Favourites
- **Endpoint:** `POST /api/favourites/trails/:trailId`
- **Description:** Add trail to user's favourites
- **Auth:** Bearer Token (required)
- **Response (201):** Favourite object

### 2. Remove Trail from Favourites
- **Endpoint:** `DELETE /api/favourites/trails/:trailId`
- **Description:** Remove trail from user's favourites
- **Auth:** Bearer Token (required)
- **Response (204):** No content

### 3. Get User's Favourites
- **Endpoint:** `GET /api/favourites`
- **Description:** Get all user's favourite trails
- **Auth:** Bearer Token (required)
- **Response (200):**
  ```json
  {
    "data": [{ trail objects }],
    "total": 10
  }
  ```

### 4. Check if Trail is Favourite
- **Endpoint:** `GET /api/favourites/trails/:trailId/check`
- **Description:** Check if trail is in user's favourites
- **Auth:** Bearer Token (required)
- **Response (200):** `{ "isFavourite": true }`

---

## 📊 Summary

| Resource | Count | Endpoints |
|----------|-------|-----------|
| App | 1 | GET |
| Auth | 5 | POST, POST, POST, POST, GET |
| Users | 7 | POST, POST, GET, GET, PATCH, DELETE, PATCH |
| Trails | 15 | POST, GET, GET, PATCH, DELETE, POST, POST, POST, POST, POST, POST, POST, POST, POST, POST |
| Hikes | 11 | POST, PATCH, POST, POST, PATCH, DELETE, POST, POST, GET, GET, GET |
| Favourites | 4 | POST, DELETE, GET, GET |
| **Total** | **45** | **Endpoints** |

---

## 🔑 Authentication

- **Type:** Bearer Token (JWT)
- **Header:** `Authorization: Bearer <token>`
- **Obtained from:** `/api/auth/login` or `/api/auth/signup`

---

## 📱 File Upload Endpoints

Endpoints that accept file uploads (use `multipart/form-data`):

1. `POST /api/users/:id/avatar` - Avatar upload
2. `POST /api/trails/:id/points-of-interest` - POI images
3. `POST /api/trails/:id/media` - Trail media (photos/videos)
4. `POST /api/trails/:id/gpx-route` - GPX route file
5. `POST /api/hikes/record/:sessionId/waypoints` - Waypoint photos
6. `POST /api/hikes/record/waypoints/:waypointId/photos` - Add photos to waypoint

---

## ✅ Ready to Use

All endpoints are implemented, documented, and ready for production use!

Access Swagger UI at: `http://localhost:4000/api`
