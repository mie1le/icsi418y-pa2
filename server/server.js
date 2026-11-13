
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

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
const userStories = db.collection("UserStories");

// Valid story values
const validPriorities = ["High", "Medium", "Low"];
const validStatuses = ["To Do", "In Progress", "Done"];

// Helper functions
function isValidId(id) {
    return (
        typeof id === "string" &&
        /^[a-fA-F0-9]{24}$/.test(id)
    );
}

function isValidText(value) {
    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
}

async function validateAssignedMember(project, userId) {
    if (userId === null || userId === "" || userId === undefined) {
        return { valid: true, assignedId: null };
    }

    if (!isValidId(userId)) {
        return {
            valid: false,
            status: 400,
            message: "Invalid assigned user ID"
        };
    }

    const assignedId = new ObjectId(userId);

    const user = await users.findOne({
        _id: assignedId
    });

    if (!user) {
        return {
            valid: false,
            status: 404,
            message: "Assigned user does not exist"
        };
    }

    const membership = await projectMemberships.findOne({
        project_id: project._id,
        user_id: assignedId
    });

    const isLead = project.project_lead_id.equals(assignedId);

    if (!membership && !isLead) {
        return {
            valid: false,
            status: 400,
            message: "Assigned user must be a member of this project"
        };
    }

    return {
        valid: true,
        assignedId
    };
}

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

        if (!isValidId(project_lead_id)) {
            return res.status(400).json({
                message: "Invalid project lead ID"
            });
        }

        const leadId = new ObjectId(project_lead_id);

        const lead = await users.findOne({
            _id: leadId
        });

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

        if (!isValidId(projectId)) {
            return res.status(400).json({
                message: "Invalid project ID"
            });
        }

        const id = new ObjectId(projectId);

        const project = await projects.findOne({
            _id: id
        });

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
            !isValidId(projectId) ||
            !isValidId(user_id)
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
            !isValidId(projectId) ||
            !isValidId(userId)
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

        // Project Lead cannot be removed
        if (project.project_lead_id.equals(userIdObject)) {
            return res.status(403).json({
                message: "Cannot remove the Project Lead"
            });
        }

        // PA4: Members with assigned stories cannot be removed
        const assignedStory = await userStories.findOne({
            project_id: projectIdObject,
            assigned_user_id: userIdObject
        });

        if (assignedStory) {
            return res.status(409).json({
                message:
                    "Cannot remove member. This member has assigned user stories. Reassign, unassign, or delete those stories first."
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

// ======================================================
// PA4 - USER STORIES AND PROJECT BACKLOG
// ======================================================

// GET ALL USER STORIES FOR A PROJECT
app.get("/projects/:projectId/stories", async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!isValidId(projectId)) {
            return res.status(400).json({
                message: "Invalid project ID"
            });
        }

        const projectIdObject = new ObjectId(projectId);

        const project = await projects.findOne({
            _id: projectIdObject
        });

        if (!project) {
            return res.status(404).json({
                message: "Project does not exist"
            });
        }

        const stories = await userStories.find({
            project_id: projectIdObject
        }).sort({ _id: -1 }).toArray();

        const storiesWithMembers = await Promise.all(
            stories.map(async (story) => {
                let memberName = "Unassigned";
                let memberUsername = null;

                if (story.assigned_user_id) {
                    const member = await users.findOne({
                        _id: story.assigned_user_id
                    });

                    if (member) {
                        memberName =
                            `${member.f_name} ${member.l_name}`.trim();

                        memberUsername = member.username;
                    }
                }

                return {
                    ...story,
                    assigned_member_name: memberName,
                    assigned_member_username: memberUsername
                };
            })
        );

        return res.status(200).json(storiesWithMembers);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

// CREATE USER STORY
app.post("/projects/:projectId/stories", async (req, res) => {
    try {
        const { projectId } = req.params;

        const {
            title,
            description,
            priority,
            assigned_user_id,
            status
        } = req.body || {};

        if (!isValidId(projectId)) {
            return res.status(400).json({
                message: "Invalid project ID"
            });
        }

        const projectIdObject = new ObjectId(projectId);

        const project = await projects.findOne({
            _id: projectIdObject
        });

        if (!project) {
            return res.status(404).json({
                message: "Project does not exist"
            });
        }

        if (!isValidText(title) || !isValidText(description)) {
            return res.status(400).json({
                message: "Title and description are required"
            });
        }

        if (!validPriorities.includes(priority)) {
            return res.status(400).json({
                message: "Priority must be High, Medium, or Low"
            });
        }

        // All newly created stories start as To Do
        if (status !== undefined && status !== "To Do") {
            return res.status(400).json({
                message: "New stories must start with To Do status"
            });
        }

        const assignment = await validateAssignedMember(
            project,
            assigned_user_id
        );

        if (!assignment.valid) {
            return res.status(assignment.status).json({
                message: assignment.message
            });
        }

        const newStory = {
            project_id: projectIdObject,
            title: title.trim(),
            description: description.trim(),
            priority,
            status: "To Do",
            assigned_user_id: assignment.assignedId
        };

        const result = await userStories.insertOne(newStory);

        return res.status(201).json({
            message: "Story created successfully",
            story_id: result.insertedId
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

// UPDATE USER STORY
app.put("/projects/:projectId/stories/:storyId", async (req, res) => {
    try {
        const { projectId, storyId } = req.params;

        const {
            title,
            description,
            priority,
            status,
            assigned_user_id
        } = req.body || {};

        if (
            !isValidId(projectId) ||
            !isValidId(storyId)
        ) {
            return res.status(400).json({
                message: "Invalid project or story ID"
            });
        }

        const projectIdObject = new ObjectId(projectId);
        const storyIdObject = new ObjectId(storyId);

        const project = await projects.findOne({
            _id: projectIdObject
        });

        if (!project) {
            return res.status(404).json({
                message: "Project does not exist"
            });
        }

        const existingStory = await userStories.findOne({
            _id: storyIdObject,
            project_id: projectIdObject
        });

        if (!existingStory) {
            return res.status(404).json({
                message: "Story does not exist in this project"
            });
        }

        if (!isValidText(title) || !isValidText(description)) {
            return res.status(400).json({
                message: "Title and description are required"
            });
        }

        if (!validPriorities.includes(priority)) {
            return res.status(400).json({
                message: "Invalid priority"
            });
        }

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        // Prevent moving a story to another project
        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "project_id"
            )
        ) {
            return res.status(400).json({
                message: "Cannot change a story's project"
            });
        }

        const assignment = await validateAssignedMember(
            project,
            assigned_user_id
        );

        if (!assignment.valid) {
            return res.status(assignment.status).json({
                message: assignment.message
            });
        }

        await userStories.updateOne(
            {
                _id: storyIdObject,
                project_id: projectIdObject
            },
            {
                $set: {
                    title: title.trim(),
                    description: description.trim(),
                    priority,
                    status,
                    assigned_user_id: assignment.assignedId
                }
            }
        );

        return res.status(200).json({
            message: "Story updated successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

// DELETE USER STORY
app.delete("/projects/:projectId/stories/:storyId", async (req, res) => {
    try {
        const { projectId, storyId } = req.params;

        if (
            !isValidId(projectId) ||
            !isValidId(storyId)
        ) {
            return res.status(400).json({
                message: "Invalid project or story ID"
            });
        }

        const projectIdObject = new ObjectId(projectId);
        const storyIdObject = new ObjectId(storyId);

        const project = await projects.findOne({
            _id: projectIdObject
        });

        if (!project) {
            return res.status(404).json({
                message: "Project does not exist"
            });
        }

        const result = await userStories.deleteOne({
            _id: storyIdObject,
            project_id: projectIdObject
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Story does not exist in this project"
            });
        }

        return res.status(200).json({
            message: "Story deleted successfully"
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

        // Prevent duplicate project memberships
        await projectMemberships.createIndex(
            { project_id: 1, user_id: 1 },
            { unique: true }
        );

        // PA4 indexes
        await userStories.createIndex({
            project_id: 1
        });

        await userStories.createIndex({
            project_id: 1,
            assigned_user_id: 1
        });

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
