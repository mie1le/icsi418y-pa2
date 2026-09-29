import Signup from "./components/Signup";
import Login from "./components/Login";
import "./App.css";

function App() {
    return (
        <div className="app">
            <div className="auth-container">
                <Signup />
                <Login />
            </div>
        </div>
    );
}

export default App;