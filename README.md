# Teacher Session Booking API

A REST API for creating users and teachers, publishing available teacher sessions, booking sessions, completing bookings, and viewing a user's session history.

## Technology

Node.js, TypeScript, Express 4, MongoDB, and Mongoose. Tests use Vitest, Supertest, and an in-memory MongoDB server.

## Requirements and setup

- Node.js 20 or newer and npm
- MongoDB 6 or newer (a local server or hosted MongoDB URI)

```sh
npm install
cp .env.example .env
# Edit MONGODB_URI in .env
npm run dev
```

The server connects to MongoDB before listening. `npm run build` compiles into `dist/`; `npm start` runs the compiled server. `npm test` runs the automated API suite.

### Environment variables

| Variable | Required | Default/example | Purpose |
| --- | --- | --- | --- |
| `PORT` | No | `3000` | HTTP port |
| `MONGODB_URI` | Yes | `mongodb://127.0.0.1:27017/backend_assignment` | MongoDB connection string |
| `NODE_ENV` | No | `development` | Runtime environment |

`.env` is ignored by Git; do not commit credentials.

## API

All successful responses use `{ "success": true, "data": ... }`. Errors use `{ "success": false, "error": { "message": "..." } }`. Invalid input is HTTP 400, absent records 404, duplicates or invalid state transitions 409, and successful creation 201.

### Create a user — `POST /users` (201)

```json
{ "fullName": "Akash Gaur", "email": "akash@example.com", "phone": "9876543210" }
```

Returns the created user with timestamps. Duplicate email returns 409.

### Create a teacher — `POST /teachers` (201)

```json
{ "fullName": "Ada Teacher", "email": "ada@example.com", "specialization": "Mathematics", "experience": 5 }
```

### Create a session — `POST /sessions` (201)

```json
{ "teacherId": "TEACHER_OBJECT_ID", "startTime": "2026-11-01T10:00:00.000Z", "endTime": "2026-11-01T11:00:00.000Z" }
```

The end must be later than the start. New sessions have status `AVAILABLE`, with `userId` and `completedAt` set to null.

### Available sessions — `GET /sessions/available?dateTimestamp=1793534400000` (200)

`dateTimestamp` is a Unix timestamp in milliseconds. The UTC calendar date containing that instant is used; the query includes `startTime >= 00:00:00 UTC` and `startTime < 00:00:00 UTC` on the next day. Response:

```json
{ "success": true, "data": [] }
```

This endpoint uses a MongoDB aggregation pipeline and sorts by start time.

### Book a session — `POST /sessions/:id/book` (200)

```json
{ "userId": "USER_OBJECT_ID" }
```

Only `AVAILABLE` sessions can be booked. An atomic conditional update prevents concurrent double booking. Missing users/sessions return 404; an already booked or completed session returns 409.

### Complete a session — `PATCH /sessions/:id/complete` (200)

No request body. Only `BOOKED` sessions can transition to `COMPLETED`; completion time is set on transition. Other states return 409.

### User session history — `GET /users/:id/sessions` (200)

Returns `{ "success": true, "data": { "upcomingSessions": [], "completedSessions": [] } }`. Upcoming means an associated `AVAILABLE` or `BOOKED` session with `startTime` later than the current server time. Completed sessions are sorted by completion time descending; upcoming sessions are sorted by start time ascending. Both groups include limited teacher details and are obtained with an aggregation pipeline and `$lookup`.

### Health — `GET /health` (200)

Returns `{ "success": true, "data": { "status": "ok" } }`.

## Postman

Import `postman/Backend-Assignment.postman_collection.json`. The collection uses `{{baseUrl}}` (default `http://localhost:3000`) and stores returned `userId`, `teacherId`, and `sessionId` values automatically. Run requests in order: create teacher, create user, create session, list available, book, complete, and inspect user history. You can run the collection with the Postman Collection Runner.

## Tests

`npm test` starts an ephemeral MongoDB instance through `mongodb-memory-server`; on a fresh setup, its MongoDB binary may need to be downloaded. If that download is unavailable, set up MongoDB locally and use a configured test URI by adapting the test bootstrap. The test suite covers user and teacher creation, duplicate email, session validation and filtering, booking conflicts, completion transitions, history, invalid IDs, and missing resources.

## State and date assumptions

Session states transition `AVAILABLE -> BOOKED -> COMPLETED`. A session cannot be booked more than once or completed before it is booked. The available-day endpoint interprets days in UTC, independent of host timezone. User history uses the server's current instant for the upcoming cutoff.
