
import { useEffect, useState } from "react";

function ViewProjects() {
    const [projects, setProjects] = useState([]);
    const [message, setMessage] = useState("");

    async function loadProjects() {
        try {
            const response = await fetch("http://localhost:9000/projects");

            if (!response.ok) {
                throw new Error("Could not load projects");
            }

            const data = await response.json();
            setProjects(data);
            setMessage("");
        } catch (error) {
            setMessage("Error loading projects");
        }
    }

    useEffect(() => {
        loadProjects();
    }, []);

    return (
        <div className="projects-section">
            <h2>All Projects</h2>

            <button onClick={loadProjects}>
                Refresh Projects
            </button>

            {message && <p>{message}</p>}

            {projects.length === 0 && !message && (
                <p>No projects found.</p>
            )}

            <div className="projects-list">
                {projects.map((project) => (
                    <div className="project-card" key={project._id}>
                        <h3>{project.name}</h3>
                        <p>{project.description}</p>
                        <p><strong>Status:</strong> {project.status}</p>
                        <p>
                            <strong>Project Lead:</strong>{" "}
                            {project.project_lead_name}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ViewProjects;
