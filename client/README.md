# ICSI 418Y – Programming Assignment 3
## Projects and Project Memberships

This project is a full-stack web application developed using React, Express, Node.js, and MongoDB Atlas. It extends Programming Assignment 2 by allowing users to create projects and manage project memberships.

### Features

- Register new users and log in.
- Create projects with a name, description, status, and Project Lead.
- Select Project Leads from existing registered users.
- Display all projects and their Project Leads.
- Automatically add the Project Lead as a project member.
- View the members of each project.
- Add registered users to projects.
- Prevent duplicate memberships.
- Remove project members while protecting the Project Lead.
- Allow users to participate in multiple projects.

### Technologies Used

- React and Vite – Frontend
- Node.js and Express – Backend
- MongoDB Atlas – Database
- HTML and CSS – Interface design

### Project Structure

- `client/` – React frontend
- `client/src/CreateProject.jsx` – Project creation interface
- `client/src/ViewProjects.jsx` – Project listing interface
- `client/src/ManageMembers.jsx` – Membership management interface
- `server/server.js` – Backend API and MongoDB operations

### How to Run the Application

**Backend**

1. Open a terminal inside the `server` directory.
2. Run `npm install`.
3. Create a `.env` file containing `MONGO_URI=your_mongodb_connection_string`.
4. Run `node server.js`.

The backend runs at `http://localhost:9000`.

**Frontend**

1. Open another terminal inside the `client` directory.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:5173` in your browser.

### MongoDB Collections

**users:** Stores registered user information.

**projects:** Stores project names, descriptions, statuses, and Project Lead identifiers.

**projectMemberships:** Stores `project_id` and `user_id` as MongoDB ObjectId references to represent the many-to-many relationship between users and projects.

### Validation and Error Handling

The application checks for missing project information, invalid users or projects, duplicate memberships, and attempts to remove the Project Lead. Successful and unsuccessful operations display feedback to the user.

### Assignment

ICSI 418Y – Software Engineering

Programming Assignment 3: Projects and Project Memberships
