# Joineazy – Student Assignment Management System

## 1. Project Overview

Joineazy is a web-based student assignment management system designed to help professors distribute assignments and monitor submission progress across student groups.

The platform provides separate dashboards for students and administrators. Students can create groups, access assignments, and confirm submissions. Administrators can create and manage assignments, assign work to groups, and monitor submission progress.

## 2. Features

### Student Features
- Student registration and login.
- JWT-based authentication.
- Create student groups.
- Add members to groups using their email address.
- View assignments assigned to their groups.
- Access assignment resources through OneDrive links.
- Confirm assignment submissions through a two-step confirmation process.
- View submission status.

### Admin / Professor Features
- Admin authentication and role-based access.
- Create, edit, and view assignments.
- Add assignment descriptions, deadlines, and OneDrive links.
- Assign work to all students or selected groups.
- View all student groups.
- Track group-wise assignment submissions.
- Monitor assignment completion using progress bars and summary counts.

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL 16 |
| Authentication | JSON Web Tokens (JWT) |
| Password Security | bcrypt |
| API Requests | Axios |
| Database Deployment | Docker Compose |

## 4. Project Structure

```text
joineazy/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   ├── assignmentController.js
│   │   │   ├── authController.js
│   │   │   ├── groupController.js
│   │   │   └── submissionController.js
│   │   ├── database/
│   │   │   └── schema.sql
│   │   ├── middleware/
│   │   │   └── authMiddleware.js
│   │   ├── routes/
│   │   │   ├── assignmentRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── groupRoutes.js
│   │   │   └── submissionRoutes.js
│   │   └── server.js
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── AdminDashboard.jsx
│   │   │   └── StudentDashboard.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

## 5. Installation and Setup

### Prerequisites

Install the following before running the application:

- Node.js and npm
- Docker Desktop
- Git

### Step 1: Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd joineazy
```

### Step 2: Start PostgreSQL

```bash
docker compose up -d postgres
```

Check the database container:

```bash
docker ps
```

### Step 3: Configure the backend

Navigate to the backend directory:

```bash
cd backend
npm install
```

Create a `.env` file inside the backend directory:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_DATABASE_PASSWORD@localhost:5432/joineazy
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

Replace the database password with the password configured for PostgreSQL in Docker Compose.

### Step 4: Initialize the database

Execute the SQL statements in:

```text
backend/src/database/schema.sql
```

Run the schema against the `joineazy` PostgreSQL database. This creates the tables required by the application.

### Step 5: Start the backend

From the backend directory:

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:5000
```

### Step 6: Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

Open the frontend URL in your browser.

## 6. API Endpoints

All API endpoints use the base URL:

```text
http://localhost:5000/api
```

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a student |
| POST | `/auth/login` | Login |

### Groups

| Method | Endpoint | Description |
|---|---|---|
| POST | `/groups` | Create a group |
| GET | `/groups/my-groups` | Get groups belonging to the logged-in student |
| POST | `/groups/:groupId/members` | Add a member to a group |
| GET | `/groups/all` | Get all groups (admin only) |

### Assignments

| Method | Endpoint | Description |
|---|---|---|
| POST | `/assignments` | Create an assignment (admin only) |
| GET | `/assignments/student` | Get assignments for the logged-in student |
| GET | `/assignments/admin` | Get assignments created by the admin |
| PUT | `/assignments/:assignmentId` | Update an assignment (admin only) |

### Submissions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/submissions/:assignmentId/confirm` | Confirm an assignment submission |
| GET | `/submissions/my-submissions` | Get the student's submissions |
| GET | `/submissions/:assignmentId` | View assignment submissions (admin only) |

Protected endpoints require a valid JWT access token in the request header:

```text
Authorization: Bearer YOUR_JWT_TOKEN
```

## 7. Database Design

The application uses PostgreSQL with the following tables:

| Table | Purpose |
|---|---|
| `users` | Stores student and admin account information |
| `groups` | Stores student group information |
| `group_members` | Maintains group membership |
| `assignments` | Stores assignment details |
| `assignment_groups` | Maps assignments to selected groups |
| `submissions` | Stores group submission confirmations |

### Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ GROUPS : creates
    USERS ||--o{ GROUP_MEMBERS : joins
    GROUPS ||--o{ GROUP_MEMBERS : contains
    USERS ||--o{ ASSIGNMENTS : creates
    ASSIGNMENTS ||--o{ ASSIGNMENT_GROUPS : targets
    GROUPS ||--o{ ASSIGNMENT_GROUPS : receives
    ASSIGNMENTS ||--o{ SUBMISSIONS : has
    GROUPS ||--o{ SUBMISSIONS : submits

    USERS {
        int id PK
        string name
        string email
        string password
        string role
    }

    GROUPS {
        int id PK
        string group_name
        int created_by FK
    }

    GROUP_MEMBERS {
        int id PK
        int group_id FK
        int user_id FK
    }

    ASSIGNMENTS {
        int id PK
        string title
        string description
        string onedrive_link
        timestamp deadline
        boolean target_all_students
        int created_by FK
    }

    ASSIGNMENT_GROUPS {
        int id PK
        int assignment_id FK
        int group_id FK
    }

    SUBMISSIONS {
        int id PK
        int assignment_id FK
        int group_id FK
        int confirmed_by FK
        timestamp confirmed_at
        string status
    }
```

## 8. Application Architecture

Joineazy follows a client-server architecture.

1. The React frontend provides student and admin interfaces.
2. Axios sends API requests to the Express backend.
3. Express routes direct requests to the appropriate controllers.
4. JWT middleware verifies authentication and admin permissions.
5. Controllers execute PostgreSQL queries through the database connection.
6. PostgreSQL stores user, group, assignment, and submission data.
7. The backend returns JSON responses to the frontend.

## 9. Security

- Passwords are hashed using bcrypt.
- JWT is used for user authentication.
- Role-based middleware restricts administrator operations.
- Protected API routes require authentication.
- Database credentials and JWT secrets are configured through environment variables.

## 10. Design Decisions

- React and Vite provide a component-based frontend and a development server.
- Express.js separates routing, business logic, and authentication middleware.
- PostgreSQL provides relational storage for groups, assignments, and submissions.
- JWT supports authenticated API access and role-based authorization.
- Docker Compose provides a repeatable PostgreSQL development environment.
- Group-based assignment tracking makes submission progress visible to administrators.

## 11. Future Improvements

- Deployment to a cloud hosting platform.
- Automated testing.
- Additional reporting and analytics.
- Improved production security and monitoring.

## 12. Project Links

- GitHub Repository: To be added
- Working Demo: To be added
- Project Demonstration Video: To be added

---

**Project:** Joineazy – Student Assignment Management System  
**Stack:** React, Node.js, Express.js, PostgreSQL, Docker
