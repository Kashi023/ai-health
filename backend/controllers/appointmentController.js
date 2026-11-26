
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const Doctor = require("../models/Doctor");

// Get authenticated user ID consistently
const getUserId = (req) => req.user?.id || req.user?._id;

// =====================================
// 1. USER SENDS APPOINTMENT REQUEST
// =====================================

const createAppointment = async (req, res) => {
  try {
    const patientId = getUserId(req);
    const { doctorId, appointmentDate, reason } = req.body;

    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid patient authentication"
      });
    }

    if (!doctorId || !appointmentDate || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide doctor, appointment date and reason"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID"
      });
    }

    // doctorId received from frontend must be Doctor collection ID
    const doctor = await Doctor.findById(doctorId);

    if (!doctor || doctor.available === false) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found or currently unavailable"
      });
    }

    // Get the doctor's linked User account
    const doctorUser = await User.findById(doctor.userId);

    if (!doctorUser || doctorUser.role !== "doctor") {
      return res.status(404).json({
        success: false,
        message: "Doctor login account not found"
      });
    }

    const date = new Date(appointmentDate);

    if (Number.isNaN(date.getTime()) || date <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid future appointment date"
      });
    }

    const appointment = await Appointment.create({
      patient: patientId,
      doctor: doctorUser._id,
      appointmentDate: date,
      reason: reason.trim(),
      status: "pending"
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("patient", "name email")
      .populate("doctor", "name email");

    return res.status(201).json({
      success: true,
      message: "Appointment request sent successfully",
      appointment: populatedAppointment
    });

  } catch (error) {
    console.error("Create appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create appointment",
      error: error.message
    });
  }
};


// =====================================
// 2. DOCTOR SEES INCOMING APPOINTMENTS
// =====================================

const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = getUserId(req);

    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid doctor authentication"
      });
    }

    const doctorUser = await User.findById(doctorId);

    if (!doctorUser || doctorUser.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can view these appointments"
      });
    }

    const appointments = await Appointment.find({
      doctor: doctorUser._id
    })
      .populate("patient", "name email")
      .populate("doctor", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: appointments.length,
      appointments
    });

  } catch (error) {
    console.error("Get doctor appointments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch doctor appointments",
      error: error.message
    });
  }
};


// =====================================
// 3. DOCTOR ACCEPTS OR REJECTS REQUEST
// =====================================

const updateAppointmentStatus = async (req, res) => {
  try {
    const doctorId = getUserId(req);
    const { status } = req.body;

    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid doctor authentication"
      });
    }

    if (!["accepted", "rejected", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID"
      });
    }

    const doctorUser = await User.findById(doctorId);

    if (!doctorUser || doctorUser.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can update appointments"
      });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctor: doctorUser._id
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    if (
      status === "completed" &&
      appointment.status !== "accepted"
    ) {
      return res.status(400).json({
        success: false,
        message: "Only accepted appointments can be completed"
      });
    }

    if (
      ["accepted", "rejected"].includes(status) &&
      appointment.status !== "pending"
    ) {
      return res.status(400).json({
        success: false,
        message: "This appointment has already been processed"
      });
    }

    appointment.status = status;
    await appointment.save();

    return res.status(200).json({
      success: true,
      message: `Appointment ${status} successfully`,
      appointment
    });

  } catch (error) {
    console.error("Update appointment status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update appointment status",
      error: error.message
    });
  }
};


// =====================================
// 4. USER SEES THEIR APPOINTMENTS
// =====================================

const getUserAppointments = async (req, res) => {
  try {
    const patientId = getUserId(req);

    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid patient authentication"
      });
    }

    const appointments = await Appointment.find({
      patient: patientId
    })
      .populate("doctor", "name email")
      .populate("patient", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: appointments.length,
      appointments
    });

  } catch (error) {
    console.error("Get user appointments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user appointments",
      error: error.message
    });
  }
};


// =====================================
// 5. USER CANCELS PENDING APPOINTMENT
// =====================================

const cancelAppointment = async (req, res) => {
  try {
    const patientId = getUserId(req);

    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid patient authentication"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID"
      });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patient: patientId
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    if (appointment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending appointments can be cancelled"
      });
    }

    await appointment.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully"
    });

  } catch (error) {
    console.error("Cancel appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel appointment",
      error: error.message
    });
  }
};


// =====================================
// EXPORT
// =====================================

module.exports = {
  createAppointment,
  getDoctorAppointments,
  updateAppointmentStatus,
  getUserAppointments,
  cancelAppointment
};
