require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();

app.use(express.json());
app.use(cors());

const client = new MongoClient(process.env.MONGO_URI);

async function connectDatabase() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Could not connect to MongoDB");
        console.error(error);
    }
}

connectDatabase();

const db = client.db("pa2");
const users = db.collection("users");

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Server is running"
    });
});

// SIGNUP
app.post("/signup", async (req, res) => {
    try {
        const { f_name, l_name, username, password } = req.body;

        // Check required fields
        if (!f_name || !l_name || !username || !password) {
            return res.status(400).json({
                message: "Required information is missing"
            });
        }

        // Check if username already exists
        const existingUser = await users.findOne({
            username: username
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

        // Create user
        await users.insertOne({
            f_name: f_name,
            l_name: l_name,
            username: username,
            password: password
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

        // Check required fields
        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        // Search for username
        const user = await users.findOne({
            username: username
        });

        // Username does not exist
        if (!user) {
            return res.status(401).json({
                message: "Username does not exist"
            });
        }

        // Password is incorrect
        if (user.password !== password) {
            return res.status(401).json({
                message: "Incorrect password"
            });
        }

        // Login successful
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

app.listen(9000, () => {
    console.log("Server running on port 9000");
});