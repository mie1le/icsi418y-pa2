
import { useEffect, useState } from "react";

function ManageMembers() {
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedUser, setSelectedUser] = useState("");
    const [members, setMembers] = useState([]);
    const [message, setMessage] = useState("");

    async function loadProjects() {
        try {
            const response = await fetch("http://localhost:9000/projects");
            if (!response.ok) throw new Error();
            setProjects(await response.json());
        } catch {
            setMessage("Could not load projects");
        }
    }

    async function loadUsers() {
        try {
            const response = await fetch("http://localhost:9000/users");
            if (!response.ok) throw new Error();
            setUsers(await response.json());
        } catch {
            setMessage("Could not load users");
        }
    }

    async function loadMembers(projectId) {
        if (!projectId) {
            setMembers([]);
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:9000/projects/${projectId}/members`
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Could not load members");
            }

            setMembers(data);
        } catch (error) {
            setMembers([]);
            setMessage(error.message);
        }
    }

    useEffect(() => {
        loadProjects();
        loadUsers();
    }, []);

    useEffect(() => {
        loadMembers(selectedProject);
    }, [selectedProject]);

    async function addMember(event) {
        event.preventDefault();

        if (!selectedProject || !selectedUser) {
            setMessage("Please select a project and a user");
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:9000/projects/${selectedProject}/members`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        user_id: selectedUser
                    })
                }
            );

            const data = await response.json();
            setMessage(data.message);

            if (response.ok) {
                setSelectedUser("");
                await loadMembers(selectedProject);
            }
        } catch {
            setMessage("Could not connect to the server");
        }
    }

    async function removeMember(userId) {
        try {
            const response = await fetch(
                `http://localhost:9000/projects/${selectedProject}/members/${userId}`,
                {
                    method: "DELETE"
                }
            );

            const data = await response.json();
            setMessage(data.message);

            if (response.ok) {
                await loadMembers(selectedProject);
            }
        } catch {
            setMessage("Could not connect to the server");
        }
    }

    return (
        <div className="members-section">
            <h2>Manage Project Members</h2>

            <label>Select Project</label>
            <select
                value={selectedProject}
                onChange={(event) => {
                    setSelectedProject(event.target.value);
                    setSelectedUser("");
                    setMembers([]);
                    setMessage("");
                }}
            >
                <option value="">Select a project</option>
                {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                        {project.name}
                    </option>
                ))}
            </select>

            {selectedProject && (
                <>
                    <h3>Current Members</h3>

                    {members.length === 0 && (
                        <p>No members found.</p>
                    )}

                    <div className="members-list">
                        {members.map((member) => (
                            <div className="member-card" key={member._id}>
                                <div>
                                    <strong>
                                        {member.f_name} {member.l_name}
                                    </strong>
                                    <p>@{member.username}</p>
                                    {member.is_lead && (
                                        <span className="lead-label">
                                            Project Lead
                                        </span>
                                    )}
                                </div>

                                {!member.is_lead && (
                                    <button
                                        type="button"
                                        onClick={() => removeMember(member._id)}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <h3>Add Project Member</h3>

                    <form onSubmit={addMember}>
                        <select
                            value={selectedUser}
                            onChange={(event) =>
                                setSelectedUser(event.target.value)
                            }
                            required
                        >
                            <option value="">Select a user</option>
                            {users.map((user) => (
                                <option key={user._id} value={user._id}>
                                    {user.f_name} {user.l_name}
                                    {" "}({user.username})
                                </option>
                            ))}
                        </select>

                        <button type="submit">
                            Add Member
                        </button>
                    </form>
                </>
            )}

            {message && <p className="members-message">{message}</p>}
        </div>
    );
}

export default ManageMembers;
