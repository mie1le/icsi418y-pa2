
import { useEffect, useState } from "react";

const API = "http://localhost:9000";

const emptyForm = {
    title: "",
    description: "",
    priority: "Medium",
    status: "To Do",
    assigned_user_id: ""
};

const priorities = ["High", "Medium", "Low"];
const statuses = ["To Do", "In Progress", "Done"];

function ProjectBacklog() {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [members, setMembers] = useState([]);
    const [stories, setStories] = useState([]);

    const [form, setForm] = useState({ ...emptyForm });
    const [editingId, setEditingId] = useState(null);
    const [detailsId, setDetailsId] = useState(null);

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);

    async function request(path, options = {}) {
        const response = await fetch(`${API}${path}`, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Request failed");
        }

        return data;
    }

    useEffect(() => {
        let active = true;

        request("/projects")
            .then(data => {
                if (active) setProjects(data);
            })
            .catch(error => {
                if (active) setMessage(error.message);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!selectedProject) return;

        let active = true;

        Promise.all([
            request(`/projects/${selectedProject}/members`),
            request(`/projects/${selectedProject}/stories`)
        ])
            .then(([people, items]) => {
                if (!active) return;

                setMembers(people);
                setStories(items);
            })
            .catch(error => {
                if (active) setMessage(error.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [selectedProject]);

    async function refreshBacklog() {
        if (!selectedProject) return;

        const [people, items] = await Promise.all([
            request(`/projects/${selectedProject}/members`),
            request(`/projects/${selectedProject}/stories`)
        ]);

        setMembers(people);
        setStories(items);
    }

    function changeProject(projectId) {
        setSelectedProject(projectId);
        setMembers([]);
        setStories([]);
        setForm({ ...emptyForm });
        setEditingId(null);
        setDetailsId(null);
        setMessage("");
        setLoading(Boolean(projectId));
    }

    function startEditing(story) {
        setEditingId(story._id);

        setForm({
            title: story.title,
            description: story.description,
            priority: story.priority,
            status: story.status,
            assigned_user_id: story.assigned_user_id || ""
        });

        setDetailsId(null);
        setMessage("");
    }

    function cancelEditing() {
        setEditingId(null);
        setForm({ ...emptyForm });
        setMessage("");
    }

    async function saveStory(event) {
        event.preventDefault();

        if (!form.title.trim() || !form.description.trim()) {
            setMessage("Title and description are required");
            return;
        }

        setBusy(true);
        setMessage("");

        try {
            const path = editingId
                ? `/projects/${selectedProject}/stories/${editingId}`
                : `/projects/${selectedProject}/stories`;

            const body = {
                title: form.title.trim(),
                description: form.description.trim(),
                priority: form.priority,
                assigned_user_id: form.assigned_user_id || null
            };

            if (editingId) {
                body.status = form.status;
            }

            const result = await request(path, {
                method: editingId ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            await refreshBacklog();

            setEditingId(null);
            setForm({ ...emptyForm });
            setMessage(result.message);

        } catch (error) {
            setMessage(error.message);
        } finally {
            setBusy(false);
        }
    }

    async function deleteStory(story) {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${story.title}"?`
        );

        if (!confirmed) return;

        setBusy(true);
        setMessage("");

        try {
            const result = await request(
                `/projects/${selectedProject}/stories/${story._id}`,
                { method: "DELETE" }
            );

            if (editingId === story._id) {
                setEditingId(null);
                setForm({ ...emptyForm });
            }

            if (detailsId === story._id) {
                setDetailsId(null);
            }

            await refreshBacklog();
            setMessage(result.message);

        } catch (error) {
            setMessage(error.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="backlog-section">
            <h2>Project Backlog</h2>

            <p>
                Create and manage user stories for your projects.
            </p>

            <label htmlFor="project-select">
                Select Project
            </label>

            <select
                id="project-select"
                value={selectedProject}
                onChange={(event) =>
                    changeProject(event.target.value)
                }
            >
                <option value="">Select a project</option>

                {projects.map(project => (
                    <option
                        key={project._id}
                        value={project._id}
                    >
                        {project.name}
                    </option>
                ))}
            </select>

            {message && (
                <p className="backlog-message" role="status">
                    {message}
                </p>
            )}

            {selectedProject && (
                <>
                    <form
                        className="story-form"
                        onSubmit={saveStory}
                    >
                        <h3>
                            {editingId
                                ? "Edit User Story"
                                : "Create User Story"}
                        </h3>

                        <label htmlFor="story-title">
                            Title
                        </label>

                        <input
                            id="story-title"
                            type="text"
                            placeholder="User story title"
                            value={form.title}
                            required
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    title: event.target.value
                                })
                            }
                        />

                        <label htmlFor="story-description">
                            Description
                        </label>

                        <textarea
                            id="story-description"
                            placeholder="As a user, I want..., so that..."
                            value={form.description}
                            required
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    description: event.target.value
                                })
                            }
                        />

                        <div className="story-fields">
                            <div>
                                <label htmlFor="story-priority">
                                    Priority
                                </label>

                                <select
                                    id="story-priority"
                                    value={form.priority}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            priority: event.target.value
                                        })
                                    }
                                >
                                    {priorities.map(priority => (
                                        <option key={priority}>
                                            {priority}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {editingId && (
                                <div>
                                    <label htmlFor="story-status">
                                        Status
                                    </label>

                                    <select
                                        id="story-status"
                                        value={form.status}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                status: event.target.value
                                            })
                                        }
                                    >
                                        {statuses.map(status => (
                                            <option key={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label htmlFor="story-member">
                                    Assigned Member
                                </label>

                                <select
                                    id="story-member"
                                    value={form.assigned_user_id}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            assigned_user_id:
                                                event.target.value
                                        })
                                    }
                                >
                                    <option value="">
                                        Unassigned
                                    </option>

                                    {members.map(member => (
                                        <option
                                            key={member._id}
                                            value={member._id}
                                        >
                                            {member.f_name} {member.l_name}
                                            {" "}(@{member.username})
                                            {member.is_lead
                                                ? " - Project Lead"
                                                : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="story-actions">
                            <button type="submit" disabled={busy}>
                                {editingId
                                    ? "Save Changes"
                                    : "Create Story"}
                            </button>

                            {editingId && (
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={cancelEditing}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="backlog-list-heading">
                        <h3>Stories ({stories.length})</h3>

                        <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                                try {
                                    await refreshBacklog();
                                    setMessage("Backlog refreshed");
                                } catch (error) {
                                    setMessage(error.message);
                                }
                            }}
                        >
                            Refresh Backlog
                        </button>
                    </div>

                    {loading ? (
                        <p>Loading stories...</p>
                    ) : stories.length === 0 ? (
                        <p className="empty-stories">
                            No stories found for this project.
                        </p>
                    ) : (
                        <div className="story-list">
                            {stories.map(story => (
                                <div
                                    className="story-card"
                                    key={story._id}
                                >
                                    <div className="story-card-header">
                                        <h4>{story.title}</h4>

                                        <span
                                            className={
                                                `story-priority priority-${story.priority.toLowerCase()}`
                                            }
                                        >
                                            {story.priority}
                                        </span>
                                    </div>

                                    <p>
                                        <strong>Status:</strong>{" "}
                                        {story.status}
                                    </p>

                                    <p>
                                        <strong>Assigned:</strong>{" "}
                                        {story.assigned_member_name ||
                                            "Unassigned"}
                                    </p>

                                    {detailsId === story._id && (
                                        <p className="story-description">
                                            {story.description}
                                        </p>
                                    )}

                                    <div className="story-actions">
                                        <button
                                            type="button"
                                            className="secondary-button"
                                            onClick={() =>
                                                setDetailsId(
                                                    detailsId === story._id
                                                        ? null
                                                        : story._id
                                                )
                                            }
                                        >
                                            {detailsId === story._id
                                                ? "Hide Details"
                                                : "View Details"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                startEditing(story)
                                            }
                                        >
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            className="danger-button"
                                            disabled={busy}
                                            onClick={() =>
                                                deleteStory(story)
                                            }
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default ProjectBacklog;
