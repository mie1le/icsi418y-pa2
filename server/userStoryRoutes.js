
const { ObjectId } = require("mongodb");

function installUserStoryRoutes(app, {
    users,
    projects,
    projectMemberships,
    userStories
}) {
    const priorities = ["High", "Medium", "Low"];
    const statuses = ["To Do", "In Progress", "Done"];

    function validId(value) {
        return typeof value === "string" &&
            /^[a-fA-F0-9]{24}$/.test(value);
    }

    function validText(value) {
        return typeof value === "string" &&
            value.trim().length > 0;
    }

    function sendError(res, status, message) {
        return res.status(status).json({ message });
    }

    function handleErrors(handler) {
        return async (req, res) => {
            try {
                await handler(req, res);
            } catch (error) {
                console.error(error);
                sendError(res, 500, "Server error");
            }
        };
    }

    async function getProject(req, res) {
        const { projectId } = req.params;

        if (!validId(projectId)) {
            sendError(res, 400, "Invalid project ID");
            return null;
        }

        const project = await projects.findOne({
            _id: new ObjectId(projectId)
        });

        if (!project) {
            sendError(res, 404, "Project does not exist");
            return null;
        }

        return project;
    }

    async function validateAssignment(userId, project) {
        if (
            userId === null ||
            userId === "" ||
            userId === undefined
        ) {
            return { id: null };
        }

        if (!validId(userId)) {
            return {
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
                status: 404,
                message: "Assigned user does not exist"
            };
        }

        const membership = await projectMemberships.findOne({
            project_id: project._id,
            user_id: assignedId
        });

        const isLead =
            project.project_lead_id.equals(assignedId);

        if (!membership && !isLead) {
            return {
                status: 400,
                message:
                    "Assigned user must belong to this project"
            };
        }

        return { id: assignedId };
    }

    function validateStory(body, editing = false) {
        if (
            !body ||
            !validText(body.title) ||
            !validText(body.description)
        ) {
            return "Title and description are required";
        }

        if (!priorities.includes(body.priority)) {
            return "Invalid priority";
        }

        if (editing && !statuses.includes(body.status)) {
            return "Invalid story status";
        }

        if (
            Object.prototype.hasOwnProperty.call(
                body,
                "project_id"
            )
        ) {
            return "Cannot change a story's project";
        }

        if (
            !editing &&
            body.status !== undefined &&
            body.status !== "To Do"
        ) {
            return "New stories must have To Do status";
        }

        return null;
    }

    // GET ALL STORIES FOR ONE PROJECT
    app.get(
        "/projects/:projectId/stories",
        handleErrors(async (req, res) => {
            const project = await getProject(req, res);

            if (!project) return;

            const stories = await userStories.find({
                project_id: project._id
            }).sort({ _id: -1 }).toArray();

            const populated = await Promise.all(
                stories.map(async (story) => {
                    let memberName = "Unassigned";
                    let memberUsername = null;

                    if (story.assigned_user_id) {
                        const user = await users.findOne({
                            _id: story.assigned_user_id
                        });

                        if (user) {
                            memberName =
                                `${user.f_name} ${user.l_name}`.trim() ||
                                user.username;

                            memberUsername = user.username;
                        }
                    }

                    return {
                        ...story,
                        assigned_member_name: memberName,
                        assigned_member_username: memberUsername
                    };
                })
            );

            return res.status(200).json(populated);
        })
    );

    // CREATE USER STORY
    app.post(
        "/projects/:projectId/stories",
        handleErrors(async (req, res) => {
            const project = await getProject(req, res);

            if (!project) return;

            const validation = validateStory(req.body);

            if (validation) {
                return sendError(res, 400, validation);
            }

            const assignment = await validateAssignment(
                req.body.assigned_user_id,
                project
            );

            if (assignment.status) {
                return sendError(
                    res,
                    assignment.status,
                    assignment.message
                );
            }

            const story = {
                project_id: project._id,
                title: req.body.title.trim(),
                description: req.body.description.trim(),
                priority: req.body.priority,
                status: "To Do",
                assigned_user_id: assignment.id
            };

            const result = await userStories.insertOne(story);

            return res.status(201).json({
                message: "Story created successfully",
                story_id: result.insertedId
            });
        })
    );

    // EDIT USER STORY
    app.put(
        "/projects/:projectId/stories/:storyId",
        handleErrors(async (req, res) => {
            const project = await getProject(req, res);

            if (!project) return;

            const { storyId } = req.params;

            if (!validId(storyId)) {
                return sendError(res, 400, "Invalid story ID");
            }

            const id = new ObjectId(storyId);

            const existingStory = await userStories.findOne({
                _id: id,
                project_id: project._id
            });

            if (!existingStory) {
                return sendError(
                    res,
                    404,
                    "Story does not exist in this project"
                );
            }

            const validation = validateStory(req.body, true);

            if (validation) {
                return sendError(res, 400, validation);
            }

            const assignment = await validateAssignment(
                req.body.assigned_user_id,
                project
            );

            if (assignment.status) {
                return sendError(
                    res,
                    assignment.status,
                    assignment.message
                );
            }

            const updatedStory = {
                title: req.body.title.trim(),
                description: req.body.description.trim(),
                priority: req.body.priority,
                status: req.body.status,
                assigned_user_id: assignment.id
            };

            const result = await userStories.updateOne(
                {
                    _id: id,
                    project_id: project._id
                },
                {
                    $set: updatedStory
                }
            );

            if (result.matchedCount === 0) {
                return sendError(
                    res,
                    404,
                    "Story does not exist"
                );
            }

            return res.status(200).json({
                message: "Story updated successfully"
            });
        })
    );

    // DELETE USER STORY
    app.delete(
        "/projects/:projectId/stories/:storyId",
        handleErrors(async (req, res) => {
            const project = await getProject(req, res);

            if (!project) return;

            const { storyId } = req.params;

            if (!validId(storyId)) {
                return sendError(res, 400, "Invalid story ID");
            }

            const result = await userStories.deleteOne({
                _id: new ObjectId(storyId),
                project_id: project._id
            });

            if (result.deletedCount === 0) {
                return sendError(
                    res,
                    404,
                    "Story does not exist"
                );
            }

            return res.status(200).json({
                message: "Story deleted successfully"
            });
        })
    );
}

module.exports = installUserStoryRoutes;
