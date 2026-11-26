
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import "./Appointments.css";
import API_URL from "../config";

const BASE_URL = API_URL.replace(/\/$/, "");

const Appointments = () => {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // Fetch available doctors
  const fetchDoctors = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);

      const response = await axios.get(
        `${BASE_URL}/api/doctors`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        }
      );

      const doctorData =
        response.data?.doctors ||
        response.data?.data ||
        response.data;

      setDoctors(Array.isArray(doctorData) ? doctorData : []);
    } catch (err) {
      console.error("Fetch doctors error:", err);
      setError(
        err.response?.data?.message ||
        "Unable to load doctors. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch user's appointments
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

      const appointmentData =
        response.data?.appointments ||
        response.data?.data ||
        response.data;

      setAppointments(
        Array.isArray(appointmentData) ? appointmentData : []
      );
    } catch (err) {
      console.error("Fetch appointments error:", err);
      setError(
        err.response?.data?.message ||
        "Unable to load your appointments."
      );
    }
  }, [token]);

  // Load data
  useEffect(() => {
    if (!token) {
      setError("Please log in to view appointments.");
      return;
    }

    if (role !== "user") {
      setError("Only users can book appointments.");
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

    if (Number.isNaN(selectedDate.getTime()) ||
        selectedDate <= new Date()) {
      setError("Please select a future appointment date and time.");
      return;
    }

    try {
      setBooking(true);

      await axios.post(
        `${BASE_URL}/api/appointments`,
        {
          doctorId: selectedDoctor,
          appointmentDate,
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

      setSuccess("Appointment booked successfully!");

      setSelectedDoctor("");
      setAppointmentDate("");
      setReason("");

      await fetchAppointments();
    } catch (err) {
      console.error("Booking error:", err);

      setError(
        err.response?.data?.message ||
        "Failed to book appointment. Please try again."
      );
    } finally {
      setBooking(false);
    }
  };

  // Cancel appointment
  const handleCancel = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

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
      console.error("Cancel appointment error:", err);

      setError(
        err.response?.data?.message ||
        "Unable to cancel appointment."
      );
    }
  };

  const formatDate = (date) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
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
          <h2>Only users can book appointments.</h2>
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
              >
                <option value="">Choose a doctor</option>

                {doctors.map((doctor) => (
                  <option
                    key={doctor._id}
                    value={doctor._id}
                  >
                    {doctor.name} - {doctor.specialization}
                  </option>
                ))}
              </select>

              {!loading && doctors.length === 0 && (
                <small>No doctors are currently available.</small>
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
                min={new Date(Date.now() + 60000)
                  .toISOString()
                  .slice(0, 16)}
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
              disabled={booking || loading || doctors.length === 0}
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
                const doctor =
                  appointment.doctorId &&
                  typeof appointment.doctorId === "object"
                    ? appointment.doctorId
                    : appointment.doctor || {};

                const status = appointment.status || "Pending";

                return (
                  <div
                    className="appointment-card"
                    key={appointment._id}
                  >
                    <div className="appointment-card-header">
                      <h3>
                        Dr. {doctor.name || "Doctor"}
                      </h3>

                      <span
                        className={`appointment-status ${status.toLowerCase()}`}
                      >
                        {status}
                      </span>
                    </div>

                    <p>
                      <strong>Specialization:</strong>{" "}
                      {doctor.specialization || "Not available"}
                    </p>

                    <p>
                      <strong>Doctor Email:</strong>{" "}
                      {doctor.email || "Not available"}
                    </p>

                    <p>
                      <strong>Date:</strong>{" "}
                      {formatDate(appointment.appointmentDate)}
                    </p>

                    <p>
                      <strong>Reason:</strong>{" "}
                      {appointment.reason || "Not provided"}
                    </p>

                    {status.toLowerCase() === "pending" && (
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
