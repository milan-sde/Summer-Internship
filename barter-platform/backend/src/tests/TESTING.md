# API Testing Guide

This guide explains how to test the newly implemented **Portfolio catalogue** and **Instagram OAuth** APIs.

---

## 1. Automated Integration Tests

We have written a standalone TypeScript integration test that automatically spins up mock data, creates dummy files, checks database uploads, tests list retrieval/sorting, unlinks physical files, and cleans up the database.

### How to Run:
From the `backend/` directory, execute:
```bash
npx ts-node -r tsconfig-paths/register src/tests/test-portfolio.ts
```

---

## 2. Manual Testing with Postman

To test endpoints manually, you must first register and log in to obtain the JWT authentication cookie/token.

### Phase 2.1: Authentication (Pre-requisite)
1. **Register or Login** to your influencer account via your login endpoint (e.g., `POST /api/auth/login`).
2. Make sure your Postman client accepts cookies, or copy the JWT token and add it to the headers:
   * **Header Key**: `Authorization`
   * **Header Value**: `Bearer YOUR_JWT_TOKEN`

---

### Phase 2.2: Portfolio APIs

All portfolio routes are mounted under `/api/portfolio`.

#### A. Upload Portfolio Item (`POST /api/portfolio`)
* **Endpoint**: `http://localhost:3000/api/portfolio`
* **Method**: `POST`
* **Authentication**: Required (`INFLUENCER` role only)
* **Headers**: 
  * `Content-Type: multipart/form-data`
* **Body Type**: `form-data`
* **Fields**:
  * `file` (Change key type from *Text* to *File* in the hover dropdown): Select an image (`.jpg`/`.png`) or video (`.mp4`) from your computer.
  * `title` (Text, optional): `My Fashion Shoot`
  * `description` (Text, optional): `Product unboxing shoot for cosmetic brand.`
* **Expected Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Portfolio item uploaded and saved successfully",
    "data": {
      "portfolioItem": {
        "userId": "60c72b2f9b1d8a23c8f8b8a1",
        "title": "My Fashion Shoot",
        "description": "Product unboxing shoot for cosmetic brand.",
        "mediaUrl": "/static/portfolio/portfolio-1718612345.mp4",
        "mediaType": "video",
        "mimeType": "video/mp4",
        "fileSize": 1048576,
        "id": "60c72b2f9b1d8a23c8f8b8b2",
        "createdAt": "2026-06-08T08:00:00.000Z",
        "updatedAt": "2026-06-08T08:00:00.000Z"
      }
    }
  }
  ```

#### B. Fetch My Own Portfolio (`GET /api/portfolio/me`)
* **Endpoint**: `http://localhost:3000/api/portfolio/me`
* **Method**: `GET`
* **Authentication**: Required
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "portfolio": [
        {
          "id": "60c72b2f9b1d8a23c8f8b8b2",
          "userId": "60c72b2f9b1d8a23c8f8b8a1",
          "title": "My Fashion Shoot",
          "mediaUrl": "/static/portfolio/portfolio-1718612345.mp4",
          "mediaType": "video",
          "mimeType": "video/mp4",
          "fileSize": 1048576
        }
      ]
    }
  }
  ```

#### C. Fetch Another Influencer's Portfolio (`GET /api/portfolio/:influencerId`)
* **Endpoint**: `http://localhost:3000/api/portfolio/60c72b2f9b1d8a23c8f8b8a1` (replace with influencer's user ObjectId).
* **Method**: `GET`
* **Authentication**: Required
* **Expected Response (`200 OK`)**: Returns the array of portfolio items of the specified user.

#### D. Delete a Portfolio Item (`DELETE /api/portfolio/:id`)
* **Endpoint**: `http://localhost:3000/api/portfolio/60c72b2f9b1d8a23c8f8b8b2` (replace with portfolio item's document ID).
* **Method**: `DELETE`
* **Authentication**: Required (Owner only)
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Portfolio item and physical file deleted successfully"
  }
  ```
  *(Verify that the file is gone from the `backend/src/static/portfolio` directory on the server).*

---

## 3. Manual Testing with cURL (CLI)

Ensure you replace `YOUR_JWT_TOKEN` with your active JWT, and `PORTFOLIO_ID` or `INFLUENCER_ID` with real database values.

### 1. Upload Portfolio Item
```bash
curl -X POST http://localhost:3000/api/portfolio \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/your/image.jpg" \
  -F "title=Outdoor Shoot" \
  -F "description=Summer campaign"
```

### 2. Get My Portfolio
```bash
curl -X GET http://localhost:3000/api/portfolio/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Delete Portfolio Item
```bash
curl -X DELETE http://localhost:3000/api/portfolio/PORTFOLIO_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 4. Testing Instagram OAuth & Sync Flow

All Instagram connection and sync routes are mounted under `/api/instagram`.

### 1. Start Authorization (`GET /api/instagram/auth`)
* **Endpoint**: `http://localhost:3000/api/instagram/auth?origin=settings` (or `origin=onboarding`)
* **Method**: `GET`
* **Authorization**: Required
* **How to Test in Browser**:
  Because this initiates an HTTP 302 redirect, pasting this endpoint directly into a browser tab while logged in is the best way to test it.
  * Paste `http://localhost:3000/api/instagram/auth?origin=settings` in the address bar.
  * Hit enter.
  * It will redirect you to Facebook Login.
  * After logging in and granting permissions, Meta will redirect back to your callback URL on localhost, which will handle the code and redirect you to:
    `http://localhost:8100/profile/settings?instagram=connected` (or with error parameters if credentials are placeholder/invalid).

### 2. Trigger Instagram Sync (`POST /api/instagram/sync`)
* **Endpoint**: `http://localhost:3000/api/instagram/sync`
* **Method**: `POST`
* **Authorization**: Required (`INFLUENCER` role only)
* **Headers**:
  * `Authorization: Bearer YOUR_JWT_TOKEN`
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Instagram follower count and media feed synced successfully"
  }
  ```
  *(Verify that the database now contains the synced documents in the `instagrammedias` collection, and the influencer profile has an updated `instagram.followersCount`).*

---

## 4.5. Testing Unified Influencer Profile API

This endpoint compiles the influencer's profile, synced Instagram feed, and uploaded portfolio in one payload (intended for brands visiting the profile).

### Get Unified Profile (`GET /api/influencers/:id`)
* **Endpoint**: `http://localhost:3000/api/influencers/INFLUENCER_USER_ID` (replace with influencer's User ObjectId)
* **Method**: `GET`
* **Authorization**: Required
* **Headers**:
  * `Authorization: Bearer YOUR_JWT_TOKEN`
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "profile": {
        "id": "60c72b...",
        "userId": "60c72b...",
        "fullName": "Jane Doe",
        "bio": "Lifestyle and Fashion",
        "role": "INFLUENCER",
        "instagram": {
          "instagramId": "178414...",
          "username": "instagram_tester_jane",
          "followersCount": 8900
        }
      },
      "instagramMedia": [
        {
          "id": "60d13c...",
          "instagramMediaId": "ig_post_1001",
          "mediaType": "IMAGE",
          "mediaUrl": "https://...",
          "permalink": "https://..."
        }
      ],
      "portfolioMedia": [
        {
          "id": "60d54f...",
          "mediaUrl": "/static/portfolio/portfolio-1718612345.mp4",
          "mediaType": "video"
        }
      ]
    }
  }
  ```

---

## 5. Directory Verification
Static portfolio files are served on the `/static` path.
Verify files are saved correctly under:
`backend/src/static/portfolio/`

Access files directly in your web browser:
`http://localhost:3000/static/portfolio/portfolio-1718612345.jpg`
