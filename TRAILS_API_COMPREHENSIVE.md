# Trails API - Comprehensive Documentation

Complete documentation for all Trail management endpoints with Flutter integration examples.

---

## Table of Contents

1. [GPX Upload (First Step)](#gpx-upload-first-step)
2. [Trail Creation](#trail-creation)
3. [Get All Trails](#get-all-trails)
4. [Get Trail by ID](#get-trail-by-id)
5. [Update Trail](#update-trail)
6. [Delete Trail](#delete-trail)
7. [Publish Trail](#publish-trail)
8. [Add Itinerary Phases](#add-itinerary-phases)
9. [Add Highlights](#add-highlights)
10. [Add Points of Interest](#add-points-of-interest)
11. [Add Cost Items](#add-cost-items)
12. [Add Safety Items](#add-safety-items)
13. [Add Recommended Seasons](#add-recommended-seasons)
14. [Add Avoided Months](#add-avoided-months)
15. [Add Media Images](#add-media-images)
16. [Upload GPX Route (After Trail Creation)](#upload-gpx-route-after-trail-creation)

---

## GPX Upload (First Step)

**Endpoint:** `POST /api/trails/upload-gpx`

**Purpose:** Upload GPX file as the first step before creating a trail. No trail ID needed.

**Authentication:** Not required ✅

### Request

```
Content-Type: multipart/form-data
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| gpxFile | file | Yes | GPX route file (max 10MB, .gpx extension only) |

### Response (201 Created)

```json
{
  "gpxFilePath": "/uploads/gpx/trail-route-abc123.gpx",
  "message": "GPX file uploaded successfully. Use this path in trail creation."
}
```

### Error Responses

**400 - No file provided:**
```json
{
  "statusCode": 400,
  "message": "GPX file is required. Please upload a GPX file."
}
```

**400 - Invalid file format:**
```json
{
  "statusCode": 400,
  "message": "Only .gpx files are allowed"
}
```

**400 - File too large:**
```json
{
  "statusCode": 400,
  "message": "File exceeds maximum size of 10MB"
}
```

### Flutter Integration

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';

Future<String?> uploadGpxFile(File gpxFile) async {
  try {
    final uri = Uri.parse('http://192.168.1.68:4000/api/trails/upload-gpx');
    
    var request = http.MultipartRequest('POST', uri);
    request.files.add(
      await http.MultipartFile.fromPath(
        'gpxFile',
        gpxFile.path,
      ),
    );

    final response = await request.send();
    final responseData = await response.stream.bytesToString();
    final jsonResponse = jsonDecode(responseData);

    if (response.statusCode == 201) {
      String gpxFilePath = jsonResponse['gpxFilePath'];
      print('GPX uploaded: $gpxFilePath');
      return gpxFilePath;
    } else {
      print('Error: ${jsonResponse['message']}');
      return null;
    }
  } catch (e) {
    print('Upload failed: $e');
    return null;
  }
}
```

---

## Trail Creation

**Endpoint:** `POST /api/trails`

**Purpose:** Create a new trail with basic information. Use the GPX file path from step 1.

**Authentication:** Not required ✅

### Request

```
Content-Type: application/json
```

**Body:**

```json
{
  "slug": "shivapuri-day-hike",
  "hikeName": "Shivapuri Day Hike",
  "description": "A beautiful day hike to Shivapuri peak with stunning views",
  "maxAltitudeM": 2732,
  "durationLabel": "1 Day",
  "durationDays": 1,
  "difficulty": "moderate",
  "difficultyLabel": "Moderate",
  "difficultyRating": 3.5,
  "activity": "hiking",
  "distanceMinKm": 18,
  "distanceMaxKm": 18,
  "walkingTimeMinMinutes": 360,
  "walkingTimeMaxMinutes": 420,
  "groupSizeLimit": 12,
  "entryPermitRequired": false,
  "fitnessRequirement": "Moderate fitness level required",
  "bestTimeNotes": "Best visited during dry season (October-November)",
  "region": "Kathmandu Valley",
  "country": "Nepal",
  "gpxFilePath": "/uploads/gpx/trail-route-abc123.gpx"
}
```

**Field Details:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| slug | string | Yes | Unique URL slug (must be unique) |
| hikeName | string | Yes | Trail name |
| description | string | Yes | Trail description |
| maxAltitudeM | number | No | Maximum altitude in meters |
| durationLabel | string | No | Duration label (e.g., "1 Day", "2 Days") |
| durationDays | number | No | Duration in days |
| difficulty | string | No | Difficulty level: easy, easy_to_moderate, moderate, moderate_to_difficult, difficult, expert, hard (alias for difficult) |
| difficultyLabel | string | No | Difficulty label for display |
| difficultyRating | number | No | Difficulty rating (1-5) |
| activity | string | No | Activity type: hiking, trekking, walking, trail_running, sightseeing, other |
| distanceMinKm | number | No | Minimum distance in km |
| distanceMaxKm | number | No | Maximum distance in km |
| walkingTimeMinMinutes | number | No | Minimum walking time in minutes |
| walkingTimeMaxMinutes | number | No | Maximum walking time in minutes |
| groupSizeLimit | number | No | Maximum group size |
| entryPermitRequired | boolean | No | Whether entry permit is required |
| fitnessRequirement | string | No | Fitness level requirement description |
| bestTimeNotes | string | No | Notes about best time to visit |
| region | string | No | Region or area name |
| country | string | No | Country name |
| gpxFilePath | string | No | GPX file path from upload-gpx endpoint |

### Response (201 Created)

```json
{
  "id": "123456789",
  "slug": "shivapuri-day-hike",
  "hikeName": "Shivapuri Day Hike",
  "description": "A beautiful day hike to Shivapuri peak with stunning views",
  "maxAltitudeM": 2732,
  "durationLabel": "1 Day",
  "durationDays": 1,
  "difficulty": "moderate",
  "difficultyLabel": "Moderate",
  "difficultyRating": 3.5,
  "activity": "hiking",
  "distanceMinKm": 18,
  "distanceMaxKm": 18,
  "walkingTimeMinMinutes": 360,
  "walkingTimeMaxMinutes": 420,
  "groupSizeLimit": 12,
  "entryPermitRequired": false,
  "fitnessRequirement": "Moderate fitness level required",
  "bestTimeNotes": "Best visited during dry season (October-November)",
  "status": "draft",
  "routeFilePath": "/uploads/gpx/trail-route-abc123.gpx",
  "routeFileType": "gpx",
  "location": {
    "id": "987654321",
    "region": "Kathmandu Valley",
    "country": "Nepal"
  },
  "ratingSummary": {
    "average": 0,
    "reviewCount": 0
  },
  "createdAt": "2026-08-23T10:30:00Z",
  "updatedAt": "2026-08-23T10:30:00Z"
}
```

### Error Responses

**409 - Slug already exists:**
```json
{
  "statusCode": 409,
  "message": "Slug already exists"
}
```

**400 - Validation error:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "property": "difficulty",
      "constraints": {
        "isEnum": "difficulty must be one of the following values: easy, easy_to_moderate, moderate, moderate_to_difficult, difficult, expert, hard"
      }
    }
  ]
}
```

### Flutter Integration

```dart
Future<Map<String, dynamic>?> createTrail({
  required String gpxFilePath,
  required String slug,
  required String hikeName,
  required String description,
  required double maxAltitude,
  required String difficulty,
  required String activity,
  required double distanceMin,
  required double distanceMax,
  required int walkingTimeMin,
  required int walkingTimeMax,
  required String region,
  required String country,
}) async {
  try {
    final uri = Uri.parse('http://192.168.1.68:4000/api/trails');
    
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'slug': slug,
        'hikeName': hikeName,
        'description': description,
        'maxAltitudeM': maxAltitude,
        'difficulty': difficulty,
        'activity': activity,
        'distanceMinKm': distanceMin,
        'distanceMaxKm': distanceMax,
        'walkingTimeMinMinutes': walkingTimeMin,
        'walkingTimeMaxMinutes': walkingTimeMax,
        'region': region,
        'country': country,
        'gpxFilePath': gpxFilePath,
      }),
    );

    if (response.statusCode == 201) {
      final jsonResponse = jsonDecode(response.body);
      print('Trail created: ${jsonResponse['id']}');
      return jsonResponse;
    } else {
      final errorResponse = jsonDecode(response.body);
      print('Error: ${errorResponse['message']}');
      return null;
    }
  } catch (e) {
    print('Create trail failed: $e');
    return null;
  }
}
```

---

## Get All Trails

**Endpoint:** `GET /api/trails`

**Purpose:** Retrieve all trails with optional filters and pagination.

**Authentication:** Not required ✅

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| skip | number | No | Number of trails to skip (default: 0) |
| take | number | No | Number of trails to retrieve (default: 10) |
| status | string | No | Filter by status: draft, active, archived |
| difficulty | string | No | Filter by difficulty level |
| activity | string | No | Filter by activity type |
| search | string | No | Search by trail name, description, or slug |

### Request Example

```
GET /api/trails?skip=0&take=10&difficulty=moderate&activity=hiking
```

### Response (200 OK)

```json
{
  "data": [
    {
      "id": "123456789",
      "slug": "shivapuri-day-hike",
      "hikeName": "Shivapuri Day Hike",
      "description": "A beautiful day hike...",
      "maxAltitudeM": 2732,
      "difficulty": "moderate",
      "activity": "hiking",
      "distanceMinKm": 18,
      "distanceMaxKm": 18,
      "status": "active",
      "location": {
        "region": "Kathmandu Valley",
        "country": "Nepal"
      },
      "ratingSummary": {
        "average": 4.5,
        "reviewCount": 12
      },
      "createdAt": "2026-08-23T10:30:00Z"
    }
  ],
  "total": 45,
  "skip": 0,
  "take": 10
}
```

### Flutter Integration

```dart
Future<List<Map<String, dynamic>>> getAllTrails({
  int skip = 0,
  int take = 10,
  String? difficulty,
  String? activity,
  String? search,
}) async {
  try {
    var uri = Uri.parse('http://192.168.1.68:4000/api/trails');
    
    final queryParams = {
      'skip': skip.toString(),
      'take': take.toString(),
      if (difficulty != null) 'difficulty': difficulty,
      if (activity != null) 'activity': activity,
      if (search != null) 'search': search,
    };
    
    uri = uri.replace(queryParameters: queryParams);
    
    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final jsonResponse = jsonDecode(response.body);
      final trails = List<Map<String, dynamic>>.from(jsonResponse['data']);
      return trails;
    } else {
      print('Error: ${response.statusCode}');
      return [];
    }
  } catch (e) {
    print('Get trails failed: $e');
    return [];
  }
}
```

---

## Get Trail by ID

**Endpoint:** `GET /api/trails/{id}`

**Purpose:** Retrieve full details of a specific trail including all related data.

**Authentication:** Not required ✅

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Trail ID |

### Request Example

```
GET /api/trails/123456789
```

### Response (200 OK)

```json
{
  "id": "123456789",
  "slug": "shivapuri-day-hike",
  "hikeName": "Shivapuri Day Hike",
  "description": "A beautiful day hike to Shivapuri peak with stunning views",
  "maxAltitudeM": 2732,
  "durationLabel": "1 Day",
  "durationDays": 1,
  "difficulty": "moderate",
  "activity": "hiking",
  "distanceMinKm": 18,
  "distanceMaxKm": 18,
  "walkingTimeMinMinutes": 360,
  "walkingTimeMaxMinutes": 420,
  "groupSizeLimit": 12,
  "entryPermitRequired": false,
  "status": "active",
  "routeFilePath": "/uploads/gpx/trail-route.gpx",
  "routeFileType": "gpx",
  "location": {
    "id": "987654321",
    "region": "Kathmandu Valley",
    "country": "Nepal"
  },
  "ratingSummary": {
    "average": 4.5,
    "reviewCount": 12,
    "breakdowns": []
  },
  "itineraryPhases": [
    {
      "id": "phase1",
      "dayNumber": 1,
      "title": "Day 1: Trek to Base Camp",
      "details": [
        {
          "detail": "Start early morning"
        }
      ]
    }
  ],
  "highlights": [
    {
      "id": "highlight1",
      "title": "Peak View",
      "description": "Stunning view from the peak"
    }
  ],
  "pointsOfInterest": [],
  "costItems": [],
  "safetyItems": [],
  "media": [],
  "reviews": [],
  "createdAt": "2026-08-23T10:30:00Z",
  "updatedAt": "2026-08-23T10:30:00Z"
}
```

### Error Responses

**404 - Trail not found:**
```json
{
  "statusCode": 404,
  "message": "Trail not found"
}
```

### Flutter Integration

```dart
Future<Map<String, dynamic>?> getTrailById(String trailId) async {
  try {
    final uri = Uri.parse('http://192.168.1.68:4000/api/trails/$trailId');
    
    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final jsonResponse = jsonDecode(response.body);
      return jsonResponse;
    } else {
      print('Trail not found');
      return null;
    }
  } catch (e) {
    print('Get trail failed: $e');
    return null;
  }
}
```

---

## Update Trail

**Endpoint:** `PATCH /api/trails/{id}`

**Purpose:** Update trail information.

**Authentication:** Required (JWT Bearer Token) 🔒

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Trail ID |

### Request Body

Same fields as trail creation (all optional):

```json
{
  "hikeName": "Updated Trail Name",
  "description": "Updated description",
  "difficulty": "difficult",
  "distanceMinKm": 20,
  "distanceMaxKm": 25
}
```

### Response (200 OK)

```json
{
  "id": "123456789",
  "hikeName": "Updated Trail Name",
  "description": "Updated description",
  "updatedAt": "2026-08-23T11:00:00Z"
}
```

### Error Responses

**401 - Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**404 - Trail not found:**
```json
{
  "statusCode": 404,
  "message": "Trail not found"
}
```

### Flutter Integration

```dart
Future<bool> updateTrail({
  required String trailId,
  required String accessToken,
  required Map<String, dynamic> updateData,
}) async {
  try {
    final uri = Uri.parse('http://192.168.1.68:4000/api/trails/$trailId');
    
    final response = await http.patch(
      uri,
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(updateData),
    );

    if (response.statusCode == 200) {
      print('Trail updated successfully');
      return true;
    } else {
      print('Error: ${response.statusCode}');
      return false;
    }
  } catch (e) {
    print('Update trail failed: $e');
    return false;
  }
}
```

---

## Delete Trail

**Endpoint:** `DELETE /api/trails/{id}`

**Purpose:** Delete a trail.

**Authentication:** Required (JWT Bearer Token) 🔒

### Headers

```
Authorization: Bearer <access_token>
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Trail ID |

### Request Example

```
DELETE /api/trails/123456789
```

### Response (204 No Content)

Empty response (success)

### Error Responses

**401 - Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**404 - Trail not found:**
```json
{
  "statusCode": 404,
  "message": "Trail not found"
}
```

### Flutter Integration

```dart
Future<bool> deleteTrail({
  required String trailId,
  required String accessToken,
}) async {
  try {
    final uri = Uri.parse('http://192.168.1.68:4000/api/trails/$trailId');
    
    final response = await http.delete(
      uri,
      headers: {
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 204) {
      print('Trail deleted successfully');
      return true;
    } else {
      print('Error: ${response.statusCode}');
      return false;
    }
  } catch (e) {
    print('Delete trail failed: $e');
    return false;
  }
}
```

---

## Publish Trail

**Endpoint:** `POST /api/trails/{id}/publish`

**Purpose:** Publish a trail (change status from draft to active).

**Authentication:** Required (JWT Bearer Token) 🔒

### Headers

```
Authorization: Bearer <access_token>
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Trail ID |

### Request Example

```
POST /api/trails/123456789/publish
```

### Response (200 OK)

```json
{
  "id": "123456789",
  "slug": "shivapuri-day-hike",
  "hikeName": "Shivapuri Day Hike",
  "status": "active",
  "publishedAt": "2026-08-23T11:00:00Z",
  "updatedAt": "2026-08-23T11:00:00Z"
}
```

### Flutter Integration

```dart
Future<bool> publishTrail({
  required String trailId,
  required String accessToken,
}) async {
  try {
    final uri = Uri.parse('http://192.168.1.68:4000/api/trails/$trailId/publish');
    
    final response = await http.post(
      uri,
      headers: {
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 200) {
      print('Trail published successfully');
      return true;
    } else {
      print('Error: ${response.statusCode}');
      return false;
    }
  } catch (e) {
    print('Publish trail failed: $e');
    return false;
  }
}
```

---

## Add Itinerary Phases

**Endpoint:** `POST /api/trails/{id}/phases`

**Purpose:** Add day-by-day itinerary phases to a trail.

**Authentication:** Required (JWT Bearer Token) 🔒

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Trail ID |

### Request Body

```json
{
  "dayNumber": 1,
  "title": "Day 1: Trek to Base Camp",
  "details": [
    {
      "detail": "Start early morning from town",
      "sortOrder": 0
    },
    {
      "detail": "Trek through forest",
      "sortOrder": 1
    }
  ]
}
```

### Response (201 Created)

```json
{
  "id": "phase1",
  "dayNumber": 1,
  "title": "Day 1: Trek to Base Camp",
  "trailId": "123456789",
  "details": [
    {
      "detail": "Start early morning from town",
      "sortOrder": 0
    }
  ]
}
```

### Flutter Integration

```dart
Future<bool> addItineraryPhase({
  required String trailId,
  required String accessToken,
  required int dayNumber,
  required String title,
  required List<String> details,
}) async {
  try {
    final uri = Uri.parse('http://192.168.1.68:4000/api/trails/$trailId/phases');
    
    final response = await http.post(
      uri,
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'dayNumber': dayNumber,
        'title': title,
        'details': details.asMap().entries.map((e) => {
          'detail': e.value,
          'sortOrder': e.key,
        }).toList(),
      }),
    );

    if (response.statusCode == 201) {
      print('Phase added successfully');
      return true;
    } else {
      print('Error: ${response.statusCode}');
      return false;
    }
  } catch (e) {
    print('Add phase failed: $e');
    return false;
  }
}
```

---

## Add Highlights

**Endpoint:** `POST /api/trails/{id}/highlights`

**Purpose:** Add highlight information to a trail.

**Authentication:** Required (JWT Bearer Token) 🔒

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Trail ID |

### Request Body

```json
{
  "title": "Peak View",
  "description": "Stunning panoramic view from the peak",
  "sortOrder": 0
}
```

### Response (201 Created)

```json
{
  "id": "highlight1",
  "title": "Peak View",
  "description": "Stunning panoramic view from the peak",
  "trailId": "123456789",
  "sortOrder": 0
}
```

### Flutter Integration

```dart
Future<bool> addHighlight({
  required String trailId,
  required String accessToken,
  required String title,
  required String description,
}) async {
  try {
    final uri = Uri.parse('http://192.168.1.68:4000/api/trails/$trailId/highlights');
    
    final response = await http.post(
      uri,
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'title': title,
        'description': description,
      }),
    );

    if (response.statusCode == 201) {
      print('Highlight added successfully');
      return true;
    } else {
      print('Error: ${response.statusCode}');
      return false;
    }
  } catch (e) {
    print('Add highlight failed: $e');
    return false;
  }
}
```

---

## Add Points of Interest

**Endpoint:** `POST /api/trails/{id}/points-of-interest`

**Purpose:** Add points of interest (viewpoints, water sources, camping sites, etc.) to a trail.

**Authentication:** Required (JWT Bearer Token) 🔒

### Headers

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data (if uploading images)
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Trail ID |

### Request Body

```json
{
  "name": "Water Source Point",
  "description": "Fresh water source for refilling",
  "distanceKm": 5.5,
  "altitudeM": 2100,
  "latitude": 27.6735,
  "longitude": -85.3125,
  "icon": "water",
  "facilities": ["water_point", "rest_area"],
  "sortOrder": 0
}
```

### Response (201 Created)

```json
{
  "id": "poi1",
  "name": "Water Source Point",
  "description": "Fresh water source for refilling",
  "distanceKm": 5.5,
  "altitudeM": 2100,
  "latitude": 27.6735,
  "longitude": -85.3125,
  "icon": "water",
  "facilities": ["water_point", "rest_area"],
  "trailId": "123456789"
}
```

### Flutter Integration

```dart
Future<bool> addPointOfInterest({
  required String trailId,
  required String accessToken,
  required String name,
  required String description,
  required double distanceKm,
  required int altitudeM,
  required double latitude,
  required double longitude,
  required String icon,
  required List<String> facilities,
}) async {
  try {
    final uri = Uri.parse('http://192.168.1.68:4000/api/trails/$trailId/points-of-interest');
    
    final response = await http.post(
      uri,
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'name': name,
        'description': description,
        'distanceKm': distanceKm,
        'altitudeM': altitudeM,
        'latitude': latitude,
        'longitude': longitude,
        'icon': icon,
        'facilities': facilities,
      }),
    );

    if (response.statusCode == 201) {
      print('POI added successfully');
      return true;
    } else {
      print('Error: ${response.statusCode}');
      return false;
    }
  } catch (e) {
    print('Add POI failed: $e');
    return false;
  }
}
```

---

## Add Cost Items

**Endpoint:** `POST /api/trails/{id}/cost-items`

**Purpose:** Add cost breakdown items for a trail (permits, guides, accommodations, etc.).

**Authentication:** Required (JWT Bearer Token) 🔒

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Request Body

```json
{
  "category": "Permits",
  "description": "Entry permit required",
  "estimatedCost": 50,
  "currency": "USD",
  "notes": "Optional permit for park entry"
}
```

### Response (201 Created)

```json
{
  "id": "cost1",
  "category": "Permits",
  "description": "Entry permit required",
  "estimatedCost": 50,
  "currency": "USD",
  "notes": "Optional permit for park entry",
  "trailId": "123456789"
}
```

### Flutter Integration

```dart
Future<bool> addCostItem({
  required String trailId,
  required String accessToken,
  required String category,
  required String description,
  required double estimatedCost,
  required String currency,
  String? notes,
}) async {
  try {
    final uri = Uri.parse('http://192.168.1.68:4000/api/trails/$trailId/cost-items');
    
    final response = await http.post(
      uri,
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'category': category,
        'description': description,
        'estimatedCost': estimatedCost,
        'currency': currency,
        if (notes != null) 'notes': notes,
      }),
    );

    if (response.statusCode == 201) {
      print('Cost item added successfully');
      return true;
    } else {
      print('Error: ${response.statusCode}');
      return false;
    }
  } catch (e) {
    print('Add cost item failed: $e');
    return false;
  }
}
```

---

## Add Safety Items

**Endpoint:** `POST /api/trails/{id}/safety-items`

**Purpose:** Add safety warnings and precautions for a trail.

**Authentication:** Required (JWT Bearer Token) 🔒

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Request Body

```json
{
  "category": "Weather",
  "risk": "Sudden weather changes",
  "severity": "high",
  "precautions": "Always check weather forecast before starting",
  "contacts": "+977-1-2345678"
}
```

### Response (201 Created)

```json
{
  "id": "safety1",
  "category": "Weather",
  "risk": "Sudden weather changes",
  "severity": "high",
  "precautions": "Always check weather forecast before starting",
  "contacts": "+977-1-2345678",
  "trailId": "123456789"
}
```

### Flutter Integration

```dart
Future<bool> addSafetyItem({
  required String trailId,
  required String accessToken,
  required String category,
  required String risk,
  required String severity,
  required String precautions,
  String? contacts,
}) async {
  try {
    final uri = Uri.parse('http://192.168.1.68:4000/api/trails/$trailId/safety-items');
    
    final response = await http.post(
      uri,
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'category': category,
        'risk': risk,
        'severity': severity,
        'precautions': precautions,
        if (contacts != null) 'contacts': contacts,
      }),
    );

    if (response.statusCode == 201) {
      print('Safety item added successfully');
      return true;
    } else {
      print('Error: ${response.statusCode}');
      return false;
    }
  } catch (e) {
    print('Add safety item failed: $e');
    return false;
  }
}
```

---

## Add Recommended Seasons

**Endpoint:** `POST /api/trails/{id}/seasons`

**Purpose:** Add recommended seasons for trekking the trail.

**Authentication:** Required (JWT Bearer Token) 🔒

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Request Body

```json
{
  "season": "Autumn",
  "month": "October",
  "reason": "Clear skies and pleasant weather",
  "rating": 5
}
```

### Response (201 Created)

```json
{
  "id": "season1",
  "season": "Autumn",
  "month": "October",
  "reason": "Clear skies and pleasant weather",
  "rating": 5,
  "trailId": "123456789"
}
```

### Flutter Integration

```dart
Future<bool> addRecommendedSeason({
  required String trailId,
  required String accessToken,
  required String season,
  required String month,
  required String reason,
  required int rating,
}) async {
  try {
    final uri = Uri.parse('http://192.168.1.68:4000/api/trails/$trailId/seasons');
    
    final response = await http.post(
      uri,
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'season': season,
        'month': month,
        'reason': reason,
        'rating': rating,
      }),
    );

    if (response.statusCode == 201) {
      print('Season added successfully');
      return true;
    } else {
      print('Error: ${response.statusCode}');
      return false;
    }
  } catch (e) {
    print('Add season failed: $e');
    return false;
  }
}
```

---

## Add Avoided Months

**Endpoint:** `POST /api/trails/{id}/avoided-months`

**Purpose:** Add months to avoid for trekking the trail.

**Authentication:** Required (JWT Bearer Token) 🔒

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Request Body

```json
{
  "month": "July",
  "reason": "Heavy monsoon rains and landslides"
}
```

### Response (201 Created)

```json
{
  "id": "avoided1",
  "month": "July",
  "reason": "Heavy monsoon rains and landslides",
  "trailId": "123456789"
}
```

### Flutter Integration

```dart
Future<bool> addAvoidedMonth({
  required String trailId,
  required String accessToken,
  required String month,
  required String reason,
}) async {
  try {
    final uri = Uri.parse('http://192.168.1.68:4000/api/trails/$trailId/avoided-months');
    
    final response = await http.post(
      uri,
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'month': month,
        'reason': reason,
      }),
    );

    if (response.statusCode == 201) {
      print('Avoided month added successfully');
      return true;
    } else {
      print('Error: ${response.statusCode}');
      return false;
    }
  } catch (e) {
    print('Add avoided month failed: $e');
    return false;
  }
}
```

---

## Add Media Images

**Endpoint:** `POST /api/trails/{id}/media`

**Purpose:** Add media images (cover, gallery, route, video) to a trail.

**Authentication:** Required (JWT Bearer Token) 🔒

### Headers

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Trail ID |

### Request Body (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | No | Media type: cover, route, gallery, video (default: gallery) |
| altText | string | No | Alternative text for accessibility |
| sortOrder | number | No | Sort order (default: 0) |
| images | file | Yes | Image file(s) to upload (max 10 per request) |

### Response (201 Created)

```json
{
  "count": 1,
  "message": "1 media items added successfully"
}
```

### Flutter Integration

```dart
Future<bool> addMediaImages({
  required String trailId,
  required String accessToken,
  required List<File> imageFiles,
  required String type,
  String? altText,
}) async {
  try {
    final uri = Uri.parse('http://192.168.1.68:4000/api/trails/$trailId/media');
    
    var request = http.MultipartRequest('POST', uri);
    request.headers['Authorization'] = 'Bearer $accessToken';
    request.fields['type'] = type;
    if (altText != null) request.fields['altText'] = altText;

    for (var imageFile in imageFiles) {
      request.files.add(
        await http.MultipartFile.fromPath('images', imageFile.path),
      );
    }

    final response = await request.send();
    
    if (response.statusCode == 201) {
      print('Media added successfully');
      return true;
    } else {
      print('Error: ${response.statusCode}');
      return false;
    }
  } catch (e) {
    print('Add media failed: $e');
    return false;
  }
}
```

---

## Upload GPX Route (After Trail Creation)

**Endpoint:** `POST /api/trails/{id}/gpx-route`

**Purpose:** Upload a GPX route file to an existing trail (alternative to providing gpxFilePath during creation).

**Authentication:** Required (JWT Bearer Token) 🔒

### Headers

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Trail ID |

### Request Body (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| gpxFile | file | Yes | GPX file to upload (max 10MB) |

### Response (200 OK)

```json
{
  "id": "123456789",
  "routeFilePath": "/uploads/gpx/trail-route.gpx",
  "routeFileType": "gpx",
  "updatedAt": "2026-08-23T11:30:00Z"
}
```

### Error Responses

**400 - No file provided:**
```json
{
  "statusCode": 400,
  "message": "GPX file is required. Please upload a GPX file."
}
```

**404 - Trail not found:**
```json
{
  "statusCode": 404,
  "message": "Trail not found"
}
```

### Flutter Integration

```dart
Future<bool> uploadGpxRouteToTrail({
  required String trailId,
  required String accessToken,
  required File gpxFile,
}) async {
  try {
    final uri = Uri.parse('http://192.168.1.68:4000/api/trails/$trailId/gpx-route');
    
    var request = http.MultipartRequest('POST', uri);
    request.headers['Authorization'] = 'Bearer $accessToken';
    request.files.add(
      await http.MultipartFile.fromPath('gpxFile', gpxFile.path),
    );

    final response = await request.send();
    
    if (response.statusCode == 200) {
      print('GPX route uploaded successfully');
      return true;
    } else {
      print('Error: ${response.statusCode}');
      return false;
    }
  } catch (e) {
    print('Upload GPX route failed: $e');
    return false;
  }
}
```

---

## API Base URL

```
http://192.168.1.68:4000
```

## Common Headers

### For POST/PATCH with JSON:
```
Content-Type: application/json
```

### For Authentication:
```
Authorization: Bearer <your_jwt_token>
```

### For File Upload:
```
Content-Type: multipart/form-data
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 204 | No Content - Successful deletion |
| 400 | Bad Request - Invalid input or validation error |
| 401 | Unauthorized - Missing or invalid authentication |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists (e.g., slug) |

---

## Notes for Integration

1. **Replace IP Address**: Change `192.168.1.68` with your actual server IP
2. **Store GPX Path**: Always store the GPX file path returned from `upload-gpx` to use in trail creation
3. **Authentication**: Most endpoints except GET and first-time trail creation require JWT token
4. **File Limits**: GPX files max 10MB, images max 10MB each
5. **Error Handling**: Always check response status code and handle errors appropriately
6. **CORS**: API allows cross-origin requests from any domain

---

## Testing with Postman/cURL

### Upload GPX Example:
```bash
curl -X POST http://192.168.1.68:4000/api/trails/upload-gpx \
  -F "gpxFile=@/path/to/file.gpx"
```

### Create Trail Example:
```bash
curl -X POST http://192.168.1.68:4000/api/trails \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "test-trail",
    "hikeName": "Test Trail",
    "description": "A test trail",
    "difficulty": "moderate",
    "activity": "hiking",
    "gpxFilePath": "/uploads/gpx/trail-route.gpx"
  }'
```

---

## Troubleshooting

### 500 Error on Trail Creation
- Check validation errors: All required fields must be present
- Verify enum values (difficulty, activity)
- Check if slug is unique

### 404 Error on Trail Not Found
- Verify the trail ID is correct
- Check if trail was actually created

### 401 Unauthorized
- Ensure JWT token is included in Authorization header
- Check if token has expired

### File Upload Failing
- Verify file size is under 10MB
- Check file format (.gpx for GPX files)
- Ensure Content-Type header is set correctly
