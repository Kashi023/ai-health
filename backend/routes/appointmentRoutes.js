
const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

// Authentication and authorization middleware
const {
  protect,
  authorizeRole,
} = require("../middleware/authMiddleware");

// Appointment controller functions
const {
  createAppointment,
  getDoctorAppointments,
  updateAppointmentStatus,
  getUserAppointments,
  cancelAppointment,
} = require("../controllers/appointmentController");

// Validate appointment ID
const validateAppointmentId = (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment ID",
    });
  }

  next();
};

// ==========================================
// PATIENT ROUTES
// ==========================================

// Create a new appointment
router.post(
  "/",
  protect,
  authorizeRole("user"),
  createAppointment
);

// Get logged-in patient's appointments
router.get(
  "/my",
  protect,
  authorizeRole("user"),
  getUserAppointments
);

// Cancel a pending appointment
router.delete(
  "/:id",
  protect,
  authorizeRole("user"),
  validateAppointmentId,
  cancelAppointment
);

// ==========================================
// DOCTOR ROUTES
// ==========================================

// Get appointments received by logged-in doctor
router.get(
  "/doctor",
  protect,
  authorizeRole("doctor"),
  getDoctorAppointments
);

// Accept, reject, or complete an appointment
router.patch(
  "/:id/status",
  protect,
  authorizeRole("doctor"),
  validateAppointmentId,
  updateAppointmentStatus
);

module.exports = router;
