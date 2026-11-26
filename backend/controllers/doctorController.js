
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Doctor = require("../models/Doctor");

// ==========================================
// REGISTER DOCTOR
// POST /api/doctors/register
// ==========================================

const registerDoctor = async (req, res) => {
  let createdUser = null;

  try {
    const {
      name,
      email,
      password,
      specialization,
      experience,
      qualification,
      hospital,
      consultationFee,
      bio,
    } = req.body;

    // 1. Validate required fields
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof specialization !== "string" ||
      typeof qualification !== "string" ||
      experience === undefined ||
      consultationFee === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    // 2. Normalize inputs
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedSpecialization = specialization.trim();
    const normalizedQualification = qualification.trim();

    if (
      !normalizedName ||
      !normalizedEmail ||
      !normalizedSpecialization ||
      !normalizedQualification
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields cannot be empty.",
      });
    }

    // 3. Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // 4. Validate password
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters.",
      });
    }

    // 5. Validate experience and consultation fee
    const parsedExperience = Number(experience);
    const parsedFee = Number(consultationFee);

    if (
      !Number.isFinite(parsedExperience) ||
      parsedExperience < 0 ||
      !Number.isFinite(parsedFee) ||
      parsedFee < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid experience and consultation fee.",
      });
    }

    // 6. Check existing account
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // 7. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 8. Create doctor login account
    createdUser = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "doctor",
    });

    // 9. Create doctor professional profile
    const doctor = await Doctor.create({
      userId: createdUser._id,
      name: normalizedName,
      specialization: normalizedSpecialization,
      experience: parsedExperience,
      qualification: normalizedQualification,
      hospital: typeof hospital === "string" ? hospital.trim() : "",
      consultationFee: parsedFee,
      bio: typeof bio === "string" ? bio.trim() : "",
      available: true,
    });

    // 10. Return successful response
    return res.status(201).json({
      success: true,
      message: "Doctor registered successfully.",
      doctor,
    });

  } catch (error) {
    console.error("Doctor registration error:", error);

    // Remove User account if Doctor profile creation failed
    if (createdUser?._id) {
      try {
        await User.findByIdAndDelete(createdUser._id);
      } catch (cleanupError) {
        console.error("Doctor registration cleanup error:", cleanupError);
      }
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Doctor registration failed.",
      error: error.message,
    });
  }
};


// ==========================================
// GET ALL DOCTORS
// GET /api/doctors
// ==========================================

const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({
      available: { $ne: false },
    })
      .populate("userId", "name email role profileImage")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: doctors.length,
      doctors,
    });

  } catch (error) {
    console.error("Get all doctors error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch doctors.",
      error: error.message,
    });
  }
};


// ==========================================
// GET LOGGED-IN DOCTOR PROFILE
// GET /api/doctors/profile
// ==========================================

const getDoctorProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid doctor authentication.",
      });
    }

    const user = await User.findById(userId).select(
      "name email role profileImage"
    );

    if (!user || user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Doctor account not found.",
      });
    }

    let doctor = await Doctor.findOne({
      userId: user._id,
    }).populate("userId", "name email role profileImage");

    // Create a basic profile only if it is missing
    if (!doctor) {
      doctor = await Doctor.create({
        userId: user._id,
        name: user.name,
        specialization: "General Physician",
        experience: 0,
        qualification: "Not specified",
        consultationFee: 0,
        available: true,
      });

      doctor = await Doctor.findById(doctor._id).populate(
        "userId",
        "name email role profileImage"
      );
    }

    return res.status(200).json({
      success: true,
      doctor,
    });

  } catch (error) {
    console.error("Get doctor profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch doctor profile.",
      error: error.message,
    });
  }
};


// ==========================================
// EXPORT FUNCTIONS
// ==========================================

module.exports = {
  registerDoctor,
  getAllDoctors,
  getDoctorProfile,
};
