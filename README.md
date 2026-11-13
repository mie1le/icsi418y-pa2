
# ICSI 418Y – Programming Assignment 4
## User Stories and Project Backlog

This project is a full-stack web application developed using React, Node.js, Express, and MongoDB Atlas.

It builds on Programming Assignments 2 and 3 by adding user stories and project backlogs. Users can create projects, manage project memberships, and organize user stories within each project.

## Features

### User Management
- Register new users and log in.
- View registered users.

### Project Management
- Create projects with a name, description, status, and Project Lead.
- Display all projects and their Project Leads.
- Automatically add the Project Lead as a project member.
- Add registered users to projects.
- Prevent duplicate memberships.
- Remove project members while protecting the Project Lead.
- Allow users to participate in multiple projects.

### User Stories and Project Backlog
- Create user stories for individual projects.
- Enter a title and description for each story.
- Set story priority to High, Medium, or Low.
- Automatically assign new stories the status To Do.
- Change story status to To Do, In Progress, or Done.
- Assign stories to project members or leave them unassigned.
- View the backlog for each project separately.
- Edit existing user stories.
- Delete user stories.
- Save all changes in MongoDB Atlas.

### Validation
- Prevent creating stories with missing required information.
- Prevent assigning stories to users who are not members of the project.
- Prevent removing a project member who still has assigned stories.
- Prevent removing the Project Lead.
- Display error messages for invalid operations.

## Technologies Used

- React and Vite – Frontend
- Node.js and Express – Backend
- MongoDB Atlas – Database
- HTML and CSS – Interface design
- JavaScript – Application logic

## Project Structure

- `client/` – React frontend
- `client/src/App.jsx` – Main application interface
- `client/src/CreateProject.jsx` – Project creation interface
- `client/src/ViewProjects.jsx` – Project listing interface
- `client/src/ManageMembers.jsx` – Project membership management
- `client/src/ProjectBacklog.jsx` – User story and backlog management
- `client/src/pa4.css` – Styling for PA4 features
- `server/server.js` – Backend API and MongoDB operations
- `server/userStoryRoutes.js` – Additional user story route file

## How to Run the Application

### 1. Backend Setup

Open a terminal inside the `server` directory.

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the `server` directory containing:

```env
MONGO_URI=your_mongodb_connection_string
```

Replace the placeholder with your MongoDB Atlas connection string.

Start the backend:

```bash
node server.js
```

The backend runs at:

`http://localhost:9000`

A successful connection displays:

```text
Connected to MongoDB
Server running on port 9000
```

### 2. Frontend Setup

Open a second terminal inside the `client` directory.

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Open the local URL displayed in the terminal, usually:

`http://localhost:5173`

Both the frontend and backend must be running for the application to work.

## MongoDB Collections

### users
Stores registered user information.

### projects
Stores project names, descriptions, statuses, and Project Lead identifiers.

### projectMemberships
Stores project membership information using `project_id` and `user_id` as MongoDB ObjectId references.

### UserStories
Stores the user stories associated with projects.

Each user story contains:

- `_id` – Unique MongoDB ObjectId
- `project_id` – ObjectId referencing the associated project
- `title` – User story title
- `description` – User story description
- `priority` – High, Medium, or Low
- `status` – To Do, In Progress, or Done
- `assigned_user_id` – ObjectId of the assigned member, or null if unassigned

## User Story API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/:projectId/stories` | Retrieve stories for a project |
| POST | `/projects/:projectId/stories` | Create a new story |
| PUT | `/projects/:projectId/stories/:storyId` | Update an existing story |
| DELETE | `/projects/:projectId/stories/:storyId` | Delete a story |

The React frontend communicates with the Express backend through HTTP requests.

The backend validates the requests, performs database operations, and returns responses to the frontend.

## Test Data and Testing Instructions

The application should be tested with at least three registered users, two projects, and five user stories distributed across the projects.

### Example Users

- Aya Grefi
- Sarah Smith
- Alex Johnson

### Example Projects

**Study Buddy**

A study management application that helps students organize assignments and collaborate on projects.

**Campus Planner**

An application that helps students organize campus events and activities.

### Example User Stories

| Project | Story | Priority | Status | Assigned To |
|---------|-------|----------|--------|-------------|
| Study Buddy | Student Login | High | To Do | Sarah Smith |
| Study Buddy | Assignment Tracker | Medium | In Progress | Aya Grefi |
| Study Buddy | Study Group Creation | Low | Done | Unassigned |
| Campus Planner | Browse Events | High | In Progress | Project member |
| Campus Planner | Save Favorite Events | Low | To Do | Unassigned |

These are example records that can be created for testing.

### Testing Steps

1. Register at least three users.
2. Create two projects with Project Leads.
3. Add at least one additional member to a project.
4. Create at least five stories across the projects.
5. Verify that each project displays only its own stories.
6. Edit a story's priority, status, and assigned member.
7. Delete a story and confirm it is removed.
8. Refresh the application to verify that changes persist.
9. Attempt to create a story without a required field.
10. Attempt to assign a story to a non-member.
11. Attempt to remove a member with assigned stories.
12. Verify that invalid operations are rejected.

## Assignment Information

**Course:** ICSI 418Y – Software Engineering

**Assignment:** Programming Assignment 4 – User Stories and Project Backlog

**Submission Requirements:**
- GitHub repository containing the completed application.
- Updated README with setup and testing instructions.
- A 3–5 minute Zoom demonstration showing the PA4 features, validation, MongoDB data, and relevant code.

## GitHub Repository

https://github.com/mie1le/icsi418y-pa2
