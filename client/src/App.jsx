
import Signup from "./components/Signup";
import Login from "./components/Login";
import CreateProject from "./CreateProject";
import ViewProjects from "./ViewProjects";
import ManageMembers from "./ManageMembers";
import "./App.css";

function App() {
    return (
        <div className="app">
            <div className="auth-container">
                <Signup />
                <Login />
            </div>

            <CreateProject />

            <ViewProjects />

            <ManageMembers />
        </div>
    );
}

export default App;
