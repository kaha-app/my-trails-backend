# Trail Creation API Guide

## Complete Trail Creation with All Details and Files

### Endpoint
```
POST /trails/complete-with-files
```

### Authentication
Requires Bearer token in Authorization header

### Request Format
**Content-Type: multipart/form-data**

### Fields

#### Trail Basic Info (form fields - JSON string)
```json
{
  "slug": "mount-kilimanjaro",
  "hikeName": "Mount Kilimanjaro",
  "description": "A challenging trek to Africa's highest peak",
  "maxAltitudeM": 5895,
  "durationLabel": "5-6 days",
  "durationDays": 5.5,
  "difficulty": "difficult",
  "difficultyLabel": "Difficult",
  "difficultyRating": 4.5,
  "activity": "trekking",
  "distanceMinKm": 50,
  "distanceMaxKm": 65,
  "walkingTimeMinMinutes": 480,
  "walkingTimeMaxMinutes": 600,
  "groupSizeLimit": 12,
  "entryPermitRequired": true,
  "fitnessRequirement": "Good fitness level required",
  "bestTimeNotes": "Best visited during dry season (June-October)"
}
```

#### Location (required)
```json
{
  "region": "Kilimanjaro Region",
  "country": "Tanzania",
  "startPoint": "Marangu Gate",
  "endPoint": "Uhuru Peak",
  "distanceFromCityKm": 50,
  "latitude": -3.0674,
  "longitude": 37.3556
}
```

#### Transportation (optional)
```json
{
  "privateOption": "Private jeep from Moshi town",
  "publicOption": "Local bus from Dar es Salaam to Moshi",
  "returnOption": "Return transport available"
}
```

#### Itinerary Phases (optional - dynamic array)
```json
[
  {
    "phaseNumber": 1,
    "title": "Marangu Gate to Mandara Hut",
    "durationLabel": "4-5 hours",
    "durationMinutes": 300,
    "altitudeM": 2700,
    "sortOrder": 0,
    "details": [
      {
        "detail": "Meet porter and guide at Marangu Gate",
        "sortOrder": 0
      },
      {
        "detail": "Hike through rainforest trail",
        "sortOrder": 1
      },
      {
        "detail": "Arrive at Mandara Hut",
        "sortOrder": 2
      }
    ]
  },
  {
    "phaseNumber": 2,
    "title": "Mandara Hut to Horombo Hut",
    "durationLabel": "6-7 hours",
    "durationMinutes": 400,
    "altitudeM": 3700,
    "sortOrder": 1,
    "details": [...]
  }
]
```

#### Highlights (optional - dynamic array)
```json
[
  {
    "text": "Africa's highest peak at 5,895m",
    "sortOrder": 0
  },
  {
    "text": "Stunning snow-capped summit",
    "sortOrder": 1
  }
]
```

#### Points of Interest (optional - dynamic array)
```json
[
  {
    "name": "Mandara Hut",
    "description": "First overnight stop with basic facilities",
    "distanceKm": 8,
    "icon": "hut",
    "altitudeM": 2700,
    "latitude": -3.1234,
    "longitude": 37.4567,
    "facilities": ["Water", "Toilet", "Dining hall", "Emergency aid"],
    "images": ["https://example.com/mandara-1.jpg"],
    "sortOrder": 0
  },
  {
    "name": "Horombo Hut",
    "description": "Acclimatization point",
    "distanceKm": 18,
    "icon": "hut",
    "altitudeM": 3700,
    "facilities": ["Water", "Toilet", "Dining hall"],
    "sortOrder": 1
  }
]
```

#### Cost Items (optional - dynamic array)
```json
[
  {
    "type": "included",
    "text": "Professional mountain guide",
    "sortOrder": 0
  },
  {
    "type": "included",
    "text": "Porter service",
    "sortOrder": 1
  },
  {
    "type": "excluded",
    "text": "Meals and drinks",
    "sortOrder": 0
  }
]
```

#### Safety Items (optional - dynamic array)
```json
[
  {
    "type": "precaution",
    "text": "Acclimatize properly to prevent altitude sickness",
    "sortOrder": 0
  },
  {
    "type": "required_gear",
    "text": "Hiking boots suitable for snow",
    "sortOrder": 0
  }
]
```

#### Recommended Seasons (optional - dynamic array)
```json
[
  {
    "season": "June",
    "sortOrder": 0
  },
  {
    "season": "July",
    "sortOrder": 1
  }
]
```

#### Avoided Months (optional - dynamic array)
```json
[
  {
    "monthLabel": "April",
    "monthNumber": 4,
    "reason": "Heavy rainfall",
    "sortOrder": 0
  }
]
```

### File Uploads (optional)
- **gpxFile** - GPX route file (1 file max)
- **coverImage** - Trail cover image (1 file max)
- **routeImage** - Trail route map image (1 file max)
- **galleryImages** - Trail gallery images (up to 10 files)

### cURL Example

```bash
curl -X POST http://localhost:4000/trails/complete-with-files \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "slug=mount-kilimanjaro" \
  -F "hikeName=Mount Kilimanjaro" \
  -F "description=A challenging trek to Africa's highest peak" \
  -F "activity=trekking" \
  -F "maxAltitudeM=5895" \
  -F "durationLabel=5-6 days" \
  -F "durationDays=5.5" \
  -F "difficulty=difficult" \
  -F "location={\"region\":\"Kilimanjaro\",\"country\":\"Tanzania\",\"latitude\":-3.0674,\"longitude\":37.3556}" \
  -F "itineraryPhases=[{\"phaseNumber\":1,\"title\":\"Phase 1\",\"details\":[]}]" \
  -F "highlights=[{\"text\":\"Africa's highest peak\"}]" \
  -F "pointsOfInterest=[{\"name\":\"Hut 1\",\"facilities\":[\"Water\"]}]" \
  -F "costItems=[{\"type\":\"included\",\"text\":\"Guide\"}]" \
  -F "safetyItems=[{\"type\":\"precaution\",\"text\":\"Acclimatize\"}]" \
  -F "gpxFile=@route.gpx" \
  -F "coverImage=@cover.jpg" \
  -F "galleryImages=@photo1.jpg" \
  -F "galleryImages=@photo2.jpg"
```

### Response
Returns the complete trail object with all nested details:

```json
{
  "id": "8",
  "slug": "mount-kilimanjaro",
  "hikeName": "Mount Kilimanjaro",
  "description": "...",
  "routeFilePath": "/uploads/gpx/route.gpx",
  "routeFileType": "gpx",
  "maxAltitudeM": 5895,
  "activity": "trekking",
  "status": "draft",
  "createdAt": "2026-08-18T10:30:00Z",
  "location": {...},
  "transportation": {...},
  "itineraryPhases": [...],
  "highlights": [...],
  "pointsOfInterest": [...],
  "costItems": [...],
  "safetyItems": [...],
  "media": [...]
}
```

### Notes
- All nested arrays are optional and can have any number of items
- Use `sortOrder` to control the display order of items
- If `sortOrder` is not provided, items will be ordered by array position
- File uploads are optional - the endpoint works with or without files
- Media files will be stored and URLs will be generated automatically
- The trail is created in 'draft' status - use `/trails/{id}/publish` to make it active
