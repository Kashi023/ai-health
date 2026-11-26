
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// ==========================================
// REGISTER PATIENT
// POST /api/auth/register
// ==========================================

const registerUser = async (req, res) => {
  try {
    const { name, email, password, age, gender } = req.body;

    // 1. Validate required fields
    if (
      !name ||
      !email ||
      !password ||
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid name, email and password"
      });
    }

    // 2. Normalize inputs
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Name and email cannot be empty"
      });
    }

    // 3. Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address"
      });
    }

    // 4. Validate password
    if (password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters"
      });
    }

    // 5. Validate age if provided
    let parsedAge;

    if (age !== undefined && age !== "") {
      parsedAge = Number(age);

      if (
        !Number.isInteger(parsedAge) ||
        parsedAge < 1 ||
        parsedAge > 120
      ) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid age between 1 and 120"
        });
      }
    }

    // 6. Validate gender if provided
    const allowedGenders = ["male", "female", "other"];

    let normalizedGender;

    if (gender !== undefined && gender !== "") {
      normalizedGender = String(gender).trim().toLowerCase();

      if (!allowedGenders.includes(normalizedGender)) {
        return res.status(400).json({
          success: false,
          message: "Please select a valid gender"
        });
      }
    }

    // 7. Check existing account
    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered. Please login."
      });
    }

    // 8. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 9. Create patient account
    const newUser = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      ...(parsedAge !== undefined && { age: parsedAge }),
      ...(normalizedGender && { gender: normalizedGender }),
      role: "user"
    });

    // 10. Send response without password
    return res.status(201).json({
      success: true,
      message: "Patient registration successful",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error("Patient registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message
    });
  }
};

module.exports = {
  registerUser
};
