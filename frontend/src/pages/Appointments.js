
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Appointments.css";
import API_URL from "../config";

const BASE_URL = API_URL.replace(/\/$/, "");

const getLocalDateTime = (date = new Date()) => {
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
};

const Appointments = () => {
  const location = useLocation();

  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [selectedDoctor, setSelectedDoctor] = useState(
    location.state?.doctorId || ""
  );

  const [appointmentDate, setAppointmentDate] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "")
    .trim()
    .toLowerCase();

  // Update selected doctor when navigating from Doctors page
  useEffect(() => {
    if (location.state?.doctorId) {
      setSelectedDoctor(location.state.doctorId);
    }
  }, [location.state]);

  // Fetch registered doctors
  const fetchDoctors = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${BASE_URL}/api/doctors`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        }
      );

      const data = response.data;

      const doctorData = Array.isArray(data)
        ? data
        : data?.doctors || data?.data || [];

      if (!Array.isArray(doctorData)) {
        throw new Error("Invalid doctor data received.");
      }

      setDoctors(doctorData);
    } catch (err) {
      console.error(
        "Fetch doctors error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
        "Unable to load doctors. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch patient's appointments
  const fetchAppointments = useCallback(async () => {
    if (!token) return;

    try {
      const response = await axios.get(
        `${BASE_URL}/api/appointments/my`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        }
      );

      const data = response.data;

      const appointmentData = Array.isArray(data)
        ? data
        : data?.appointments || data?.data || [];

      if (!Array.isArray(appointmentData)) {
        throw new Error("Invalid appointment data received.");
      }

      setAppointments(appointmentData);
    } catch (err) {
      console.error(
        "Fetch appointments error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
        "Unable to load your appointments."
      );
    }
  }, [token]);

  // Load doctors and appointments
  useEffect(() => {
    if (!token) {
      setError("Please log in to view appointments.");
      return;
    }

    if (role !== "user") {
      setError("Only patients can book appointments.");
      return;
    }

    fetchDoctors();
    fetchAppointments();
  }, [token, role, fetchDoctors, fetchAppointments]);

  // Book appointment
  const handleBooking = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedDoctor || !appointmentDate || !reason.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    const selectedDate = new Date(appointmentDate);

    if (
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate <= new Date()
    ) {
      setError("Please select a future appointment date and time.");
      return;
    }

    const doctor = doctors.find(
      (item) => item._id === selectedDoctor
    );

    if (!doctor) {
      setError("Please select a valid doctor.");
      return;
    }

    if (doctor.available === false) {
      setError("This doctor is currently unavailable.");
      return;
    }

    try {
      setBooking(true);

      const response = await axios.post(
        `${BASE_URL}/api/appointments`,
        {
          doctorId: selectedDoctor,
          appointmentDate: selectedDate.toISOString(),
          reason: reason.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Appointment booking failed."
        );
      }

      setSuccess(
        response.data?.message ||
        "Appointment booked successfully!"
      );

      setSelectedDoctor("");
      setAppointmentDate("");
      setReason("");

      await fetchAppointments();
    } catch (err) {
      console.error(
        "Booking error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to book appointment. Please try again."
      );
    } finally {
      setBooking(false);
    }
  };

  // Cancel appointment
  const handleCancel = async (appointmentId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await axios.delete(
        `${BASE_URL}/api/appointments/${appointmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        }
      );

      setSuccess("Appointment cancelled successfully!");

      await fetchAppointments();
    } catch (err) {
      console.error(
        "Cancel appointment error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
        "Unable to cancel appointment."
      );
    }
  };

  // Format appointment date
  const formatDate = (date) => {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Invalid date";
    }

    return parsedDate.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Get doctor details from populated appointment
  const getDoctorInfo = (appointment) => {
    const doctor =
      appointment.doctor && typeof appointment.doctor === "object"
        ? appointment.doctor
        : appointment.doctorId &&
          typeof appointment.doctorId === "object"
        ? appointment.doctorId
        : {};

    return {
      name: doctor.name || "Doctor",
      email: doctor.email || "Not available",
      specialization: doctor.specialization || "Not available",
    };
  };

  if (!token) {
    return (
      <>
        <Navbar />
        <div className="appointments-container">
          <h2>Please log in to continue.</h2>
        </div>
      </>
    );
  }

  if (role !== "user") {
    return (
      <>
        <Navbar />
        <div className="appointments-container">
          <h2>Only patients can book appointments.</h2>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="appointments-container">
        <div className="appointments-header">
          <h1>Appointments</h1>
          <p>Book and manage your doctor appointments.</p>
        </div>

        {error && (
          <div className="appointment-message error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="appointment-message success-message">
            {success}
          </div>
        )}

        {/* Booking Form */}
        <div className="appointment-form-section">
          <h2>Book an Appointment</h2>

          <form onSubmit={handleBooking}>
            <div className="form-group">
              <label htmlFor="doctor">Select Doctor</label>

              <select
                id="doctor"
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                required
                disabled={loading}
              >
                <option value="">Choose a doctor</option>

                {doctors
                  .filter((doctor) => doctor.available !== false)
                  .map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor.name || "Doctor"} -{" "}
                      {doctor.specialization || "General"}
                    </option>
                  ))}
              </select>

              {!loading && doctors.length === 0 && (
                <small>No registered doctors found.</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="appointmentDate">
                Appointment Date and Time
              </label>

              <input
                id="appointmentDate"
                type="datetime-local"
                value={appointmentDate}
                min={getLocalDateTime(new Date(Date.now() + 60000))}
                onChange={(e) => setAppointmentDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reason">Reason for Appointment</label>

              <textarea
                id="reason"
                rows="4"
                placeholder="Describe your symptoms or reason for consultation"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="book-appointment-btn"
              disabled={
                booking ||
                loading ||
                doctors.filter((doctor) => doctor.available !== false)
                  .length === 0
              }
            >
              {booking ? "Booking..." : "Book Appointment"}
            </button>
          </form>
        </div>

        {/* Appointment List */}
        <div className="appointment-list-section">
          <h2>My Appointments</h2>

          {appointments.length === 0 ? (
            <p className="no-appointments">
              No appointments found.
            </p>
          ) : (
            <div className="appointments-list">
              {appointments.map((appointment) => {
                const doctor = getDoctorInfo(appointment);

                const status = (
                  appointment.status || "pending"
                ).toLowerCase();

                return (
                  <div
                    className="appointment-card"
                    key={appointment._id}
                  >
                    <div className="appointment-card-header">
                      <h3>Dr. {doctor.name}</h3>

                      <span
                        className={`appointment-status ${status}`}
                      >
                        {status.charAt(0).toUpperCase() +
                          status.slice(1)}
                      </span>
                    </div>

                    <p>
                      <strong>Specialization:</strong>{" "}
                      {doctor.specialization}
                    </p>

                    <p>
                      <strong>Doctor Email:</strong>{" "}
                      {doctor.email}
                    </p>

                    <p>
                      <strong>Date:</strong>{" "}
                      {formatDate(appointment.appointmentDate)}
                    </p>

                    <p>
                      <strong>Reason:</strong>{" "}
                      {appointment.reason || "Not provided"}
                    </p>

                    {status === "pending" && (
                      <button
                        type="button"
                        className="cancel-appointment-btn"
                        onClick={() => handleCancel(appointment._id)}
                      >
                        Cancel Appointment
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Appointments;
