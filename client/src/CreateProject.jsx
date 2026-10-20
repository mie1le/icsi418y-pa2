import { useEffect, useState } from "react";

function CreateProject() {
    const [users, setUsers] = useState([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("Planning");
    const [projectLead, setProjectLead] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("http://localhost:9000/users")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Could not load users");
                }
                return response.json();
            })
            .then((data) => setUsers(data))
            .catch(() => setMessage("Error loading users"));
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();
        setMessage("");

        try {
            const response = await fetch("http://localhost:9000/projects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    description,
                    status,
                    project_lead_id: projectLead
                })
            });

            const data = await response.json();
            setMessage(data.message || "Request completed");

            if (response.ok) {
                setName("");
                setDescription("");
                setStatus("Planning");
                setProjectLead("");
            }
        } catch (error) {
            setMessage("Could not connect to the server");
        }
    }

    return (
        <div>
            <h2>Create Project</h2>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Project Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />

                <textarea
                    placeholder="Project Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                />

                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                </select>

                <select
                    value={projectLead}
                    onChange={(e) => setProjectLead(e.target.value)}
                    required
                >
                    <option value="">Select Project Lead</option>
                    {users.map((user) => (
                        <option key={user._id} value={user._id}>
                            {user.f_name} {user.l_name} ({user.username})
                        </option>
                    ))}
                </select>

                <button type="submit">Create Project</button>
            </form>

            <p>{message}</p>
        </div>
    );
}

export default CreateProject;
