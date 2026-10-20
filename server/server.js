
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();

app.use(express.json());
app.use(cors());

// MongoDB connection
const client = new MongoClient(process.env.MONGO_URI);
const db = client.db("pa2");

// Collections
const users = db.collection("users");
const projects = db.collection("projects");
const projectMemberships = db.collection("projectMemberships");

// TEST ROUTE
app.get("/", (req, res) => {
    res.json({
        message: "Server is running"
    });
});

// GET ALL REGISTERED USERS
app.get("/users", async (req, res) => {
    try {
        const allUsers = await users.find(
            {},
            { projection: { password: 0 } }
        ).toArray();

        return res.status(200).json(allUsers);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

// SIGNUP
app.post("/signup", async (req, res) => {
    try {
        const { f_name, l_name, username, password } = req.body;

        if (!f_name || !l_name || !username || !password) {
            return res.status(400).json({
                message: "Required information is missing"
            });
        }

        const existingUser = await users.findOne({ username });

        if (existingUser) {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

        await users.insertOne({
            f_name,
            l_name,
            username,
            password
        });

        return res.status(201).json({
            message: "User created successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

// LOGIN
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const user = await users.findOne({ username });

        if (!user) {
            return res.status(401).json({
                message: "Username does not exist"
            });
        }

        if (user.password !== password) {
            return res.status(401).json({
                message: "Incorrect password"
            });
        }

        return res.status(200).json({
            message: "Login successful"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

// CREATE PROJECT
app.post("/projects", async (req, res) => {
    try {
        const { name, description, status, project_lead_id } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof description !== "string" ||
            !description.trim() ||
            !["Planning", "Active", "Completed"].includes(status) ||
            !project_lead_id
        ) {
            return res.status(400).json({
                message: "All project fields are required"
            });
        }

        if (
            typeof project_lead_id !== "string" ||
            !ObjectId.isValid(project_lead_id)
        ) {
            return res.status(400).json({
                message: "Invalid project lead ID"
            });
        }

        const leadId = new ObjectId(project_lead_id);

        const lead = await users.findOne({ _id: leadId });

        if (!lead) {
            return res.status(404).json({
                message: "Project lead does not exist"
            });
        }

        const result = await projects.insertOne({
            name: name.trim(),
            description: description.trim(),
            status,
            project_lead_id: leadId
        });

        // Automatically add Project Lead as a member
        try {
            await projectMemberships.insertOne({
                project_id: result.insertedId,
                user_id: leadId
            });
        } catch (membershipError) {
            await projects.deleteOne({
                _id: result.insertedId
            });
            throw membershipError;
        }

        return res.status(201).json({
            message: "Project created successfully",
            project_id: result.insertedId
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

// GET ALL PROJECTS
app.get("/projects", async (req, res) => {
    try {
        const allProjects = await projects.find().toArray();

        const projectsWithLeads = await Promise.all(
            allProjects.map(async (project) => {
                const lead = await users.findOne({
                    _id: project.project_lead_id
                });

                return {
                    ...project,
                    project_lead_name: lead
                        ? `${lead.f_name} ${lead.l_name}`
                        : "Unknown User"
                };
            })
        );

        return res.status(200).json(projectsWithLeads);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

// GET PROJECT MEMBERS
app.get("/projects/:projectId/members", async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!ObjectId.isValid(projectId)) {
            return res.status(400).json({
                message: "Invalid project ID"
            });
        }

        const id = new ObjectId(projectId);

        const project = await projects.findOne({ _id: id });

        if (!project) {
            return res.status(404).json({
                message: "Project does not exist"
            });
        }

        const memberships = await projectMemberships.find({
            project_id: id
        }).toArray();

        const members = await Promise.all(
            memberships.map(async (membership) => {
                const user = await users.findOne({
                    _id: membership.user_id
                });

                if (!user) return null;

                return {
                    _id: user._id,
                    f_name: user.f_name,
                    l_name: user.l_name,
                    username: user.username,
                    is_lead: user._id.equals(project.project_lead_id)
                };
            })
        );

        return res.status(200).json(members.filter(Boolean));
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

// ADD MEMBER TO PROJECT
app.post("/projects/:projectId/members", async (req, res) => {
    try {
        const { projectId } = req.params;
        const { user_id } = req.body;

        if (
            !ObjectId.isValid(projectId) ||
            typeof user_id !== "string" ||
            !ObjectId.isValid(user_id)
        ) {
            return res.status(400).json({
                message: "Invalid project or user ID"
            });
        }

        const projectIdObject = new ObjectId(projectId);
        const userIdObject = new ObjectId(user_id);

        const project = await projects.findOne({
            _id: projectIdObject
        });

        if (!project) {
            return res.status(404).json({
                message: "Project does not exist"
            });
        }

        const user = await users.findOne({
            _id: userIdObject
        });

        if (!user) {
            return res.status(404).json({
                message: "User does not exist"
            });
        }

        const existingMembership = await projectMemberships.findOne({
            project_id: projectIdObject,
            user_id: userIdObject
        });

        if (existingMembership) {
            return res.status(409).json({
                message: "User is already a member of this project"
            });
        }

        await projectMemberships.insertOne({
            project_id: projectIdObject,
            user_id: userIdObject
        });

        return res.status(201).json({
            message: "Member added successfully"
        });
    } catch (error) {
        console.error(error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "User is already a member of this project"
            });
        }

        return res.status(500).json({
            message: "Server error"
        });
    }
});

// REMOVE MEMBER FROM PROJECT
app.delete("/projects/:projectId/members/:userId", async (req, res) => {
    try {
        const { projectId, userId } = req.params;

        if (
            !ObjectId.isValid(projectId) ||
            !ObjectId.isValid(userId)
        ) {
            return res.status(400).json({
                message: "Invalid project or user ID"
            });
        }

        const projectIdObject = new ObjectId(projectId);
        const userIdObject = new ObjectId(userId);

        const project = await projects.findOne({
            _id: projectIdObject
        });

        if (!project) {
            return res.status(404).json({
                message: "Project does not exist"
            });
        }

        const user = await users.findOne({
            _id: userIdObject
        });

        if (!user) {
            return res.status(404).json({
                message: "User does not exist"
            });
        }

        if (project.project_lead_id.equals(userIdObject)) {
            return res.status(403).json({
                message: "Cannot remove the Project Lead"
            });
        }

        const result = await projectMemberships.deleteOne({
            project_id: projectIdObject,
            user_id: userIdObject
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "User is not a member of this project"
            });
        }

        return res.status(200).json({
            message: "Member removed successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

// CONNECT TO MONGODB AND START SERVER
async function startServer() {
    try {
        await client.connect();

        // Prevent duplicate memberships at the database level
        await projectMemberships.createIndex(
            { project_id: 1, user_id: 1 },
            { unique: true }
        );

        console.log("Connected to MongoDB");

        app.listen(9000, () => {
            console.log("Server running on port 9000");
        });
    } catch (error) {
        console.error("Could not connect to MongoDB");
        console.error(error);
        process.exit(1);
    }
}

startServer();
