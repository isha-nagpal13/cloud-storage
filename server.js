import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.post("/auth/signup", (req, res) => {
  const { username, email, password } = req.body;

  console.log("Signup request:", req.body);

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Missing fields"
    });
  }

  res.status(201).json({
    success: true,
    message: "Signup successful",
    user: {
      username,
      email
    }
  });
});

