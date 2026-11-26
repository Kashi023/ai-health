
const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const router = express.Router();

// Deployed Python ML service URL
const ML_URL = process.env.ML_SERVICE_URL;

// Image upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    cb(new Error("Only JPG, PNG, and WebP images are allowed."));
  },
});

// POST /api/analysis/image
router.post("/", (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a chest X-ray image.",
      });
    }

    try {
      // Check ML service configuration
      if (!ML_URL) {
        console.error("ML_SERVICE_URL is not configured");

        return res.status(500).json({
          success: false,
          message: "ML service URL is not configured on the server.",
        });
      }

      console.log("Sending image to deployed Python ML service");

      // Prepare multipart form data
      const form = new FormData();

      form.append("image", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      // Call deployed Flask image prediction endpoint
      const response = await axios.post(
        `${ML_URL.replace(/\/$/, "")}/predict-image`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 55000,
          maxBodyLength: Infinity,
        }
      );

      console.log("Image prediction response:", response.data);

      return res.status(200).json({
        success: true,
        ...response.data,
      });

    } catch (error) {
      console.error(
        "Image ML service error:",
        error.response?.status || "No HTTP status",
        error.response?.data || error.message
      );

      const status = error.response?.status === 400 ? 400 : 503;

      return res.status(status).json({
        success: false,
        message:
          error.response?.data?.message ||
          "Image analysis failed. Please check the Python ML service.",
      });
    }
  });
});

module.exports = router;
