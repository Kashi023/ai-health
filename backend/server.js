const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

require("dotenv").config();

const userRoutes = require("./routes/userRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const symptomRoutes = require("./routes/symptomRoutes");
const imageAnalysisRoutes = require("./routes/imageAnalysis");
const authRoutes = require("./routes/authRoutes");

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://ai-health-p8fh.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/ai-health-p8fh-[a-z0-9-]+-kashish23\.vercel\.app$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);


// Middleware
app.use(express.json());

// MongoDB connection
mongoose
.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.log("MongoDB connection failed");
    console.log(error.message);
  });
  
  // Root route
  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "Health AI Backend is running successfully!"
    });
  });
  
  // Existing API routes
  app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/symptoms", symptomRoutes);
app.use("/api/analysis/image", imageAnalysisRoutes);
// Server
const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});