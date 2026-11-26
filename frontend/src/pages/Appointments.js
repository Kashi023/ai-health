
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import "./Appointments.css";
import API_URL from "../config";

const BASE_URL = API_URL.replace(/\/$/, "");

const Appointments = () => {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const role = (
    localStorage.getItem("role") || ""
  ).trim().toLowerCase();

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  // Get all registered doctors
  const fetchDoctors = useCallback(async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/doctors`,
        {
          headers: authHeaders,
          timeout: 30000,
        }
      );

      const data = response.data;

      const doctorList = Array.isArray(data)
        ? data
        : data?.doctors || data?.data || [];

      if (!Array.isArray(doctorList)) {
        throw new Error("Invalid doctor data received.");
      }

      setDoctors(doctorList);
    } catch (err) {
      console.error(
        "Doctor fetching error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          "Unable to load doctors. Please try again."
      );
    }
  }, [token]);

  // Get logged-in user's appointments
  const fetchAppointments = useCallback(async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/appointments/my`,
        {
          headers: authHeaders,
          timeout: 30000,
        }
      );

      const data = response.data;

      const appointmentList = Array.isArray(data)
        ? data
        : data?.appointments || data?.data || [];

      if (!Array.isArray(appointmentList)) {
        throw new Error("Invalid appointment data received.");
      }

      setAppointments(appointmentList);
    } catch (err) {
      console.error(
        "Appointments fetching error:",
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
    let isMounted = true;

    const loadData = async () => {
      if (!token || role !== "user") {
        setError("Please login as a user to view appointments.");
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        await Promise.all([
          fetchDoctors(),
          fetchAppointments(),
        ]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [token, role, fetchDoctors, fetchAppointments]);

  // Book appointment
  const handleBooking = async (e) => {
    e.preventDefault();

    if (!selectedDoctor || !appointmentDate || !reason.trim()) {
      alert("Please fill all appointment details.");
      return;
    }

    if (new Date(appointmentDate) <= new Date()) {
      alert("Please select a future appointment date and time.");
      return;
    }

    try {
      setBooking(true);

      await axios.post(
        `${BASE_URL}/api/appointments`,
        {
          doctorId: selectedDoctor._id,
          appointmentDate,
          reason: reason.trim(),
        },
        {
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      alert("Appointment request sent successfully!");

      setSelectedDoctor(null);
      setAppointmentDate("");
      setReason("");

      await fetchAppointments();
    } catch (err) {
      console.error(
        "Booking error:",
        err.response?.data || err.message
      );

      alert(
        err.response?.data?.message ||
          "Unable to book appointment. Please try again."
      );
    } finally {
      setBooking(false);
    }
  };

  // Cancel pending appointment
  const handleCancel = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to cancel this appointment?"
      )
    ) {
      return;
    }

    try {
      await axios.delete(
        `${BASE_URL}/api/appointments/${id}`,
        {
          headers: authHeaders,
          timeout: 30000,
        }
      );

      alert("Appointment cancelled successfully.");

      await fetchAppointments();
    } catch (err) {
      console.error(
        "Cancel error:",
        err.response?.data || err.message
      );

      alert(
        err.response?.data?.message ||
          "Unable to cancel appointment."
      );
    }
  };

  // Format appointment date
  const formatDate = (date) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="appointments-page">
          <h2>Loading appointments...</h2>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="appointments-page">
        <div className="appointment-header">
          <h1>Appointments</h1>
          <p>Find your doctor and book an appointment easily.</p>
        </div>

        {error && (
          <div className="appointment-error">
            {error}
          </div>
        )}

        {/* DOCTOR LIST */}
        <section className="doctor-list-section">
          <h2>Available Doctors</h2>

          <p className="section-description">
            Select a doctor to book your appointment.
          </p>

          {doctors.length === 0 ? (
            <p className="empty-message">No doctors found.</p>
          ) : (
            <div className="doctor-cards">
              {doctors.map((doctor) => (
                <div className="doctor-card" key={doctor._id}>
                  <div className="doctor-avatar">
                    {doctor.profileImage ? (
                      <img
                        src={doctor.profileImage}
                        alt={doctor.name || "Doctor"}
                      />
                    ) : (
                      <span>
                        {doctor.name?.charAt(0).toUpperCase() || "D"}
                      </span>
                    )}
                  </div>

                  <div className="doctor-info">
                    <h3>{doctor.name || "Doctor"}</h3>

                    <p>
                      <strong>Doctor ID:</strong>{" "}
                      {doctor._id}
                    </p>

                    <p>
                      <strong>Email:</strong>{" "}
                      {doctor.email || "Not available"}
                    </p>

                    <p>
                      <strong>Specialization:</strong>{" "}
                      {doctor.specialization || "Not specified"}
                    </p>

                    <button
                      className="book-doctor-btn"
                      type="button"
                      onClick={() => setSelectedDoctor(doctor)}
                    >
                      Book Appointment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* BOOKING FORM */}
        {selectedDoctor && (
          <section className="booking-form-section">
            <div className="booking-form-card">
              <h2>Book Appointment</h2>

              <p>
                Selected Doctor:{" "}
                <strong>{selectedDoctor.name || "Doctor"}</strong>
              </p>

              <p>
                Doctor ID:{" "}
                <strong>{selectedDoctor._id}</strong>
              </p>

              <form onSubmit={handleBooking}>
                <label>Appointment Date and Time</label>

                <input
                  type="datetime-local"
                  value={appointmentDate}
                  min={
                    new Date(
                      Date.now() -
                        new Date().getTimezoneOffset() * 60000
                    )
                      .toISOString()
                      .slice(0, 16)
                  }
                  onChange={(e) =>
                    setAppointmentDate(e.target.value)
                  }
                  required
                />

                <label>Reason for Appointment</label>

                <textarea
                  placeholder="Describe your reason for booking..."
                  value={reason}
                  onChange={(e) =>
                    setReason(e.target.value)
                  }
                  rows="4"
                  required
                />

                <div className="booking-buttons">
                  <button
                    type="submit"
                    className="confirm-booking-btn"
                    disabled={booking}
                  >
                    {booking
                      ? "Sending Request..."
                      : "Confirm Booking"}
                  </button>

                  <button
                    type="button"
                    className="close-booking-btn"
                    onClick={() => setSelectedDoctor(null)}
                    disabled={booking}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* MY APPOINTMENTS */}
        <section className="my-appointments-section">
          <h2>My Appointments</h2>

          <p className="section-description">
            Track your appointment requests and their status.
          </p>

          {appointments.length === 0 ? (
            <p className="empty-message">
              You have not booked any appointments yet.
            </p>
          ) : (
            <div className="my-appointment-cards">
              {appointments.map((appointment) => (
                <div
                  className="my-appointment-card"
                  key={appointment._id}
                >
                  <h3>
                    Dr. {appointment.doctor?.name || "Doctor"}
                  </h3>

                  <p>
                    <strong>Doctor ID:</strong>{" "}
                    {appointment.doctor?._id || "Not available"}
                  </p>

                  <p>
                    <strong>Email:</strong>{" "}
                    {appointment.doctor?.email || "Not available"}
                  </p>

                  <p>
                    <strong>Date:</strong>{" "}
                    {formatDate(appointment.appointmentDate)}
                  </p>

                  <p>
                    <strong>Reason:</strong>{" "}
                    {appointment.reason || "Not provided"}
                  </p>

                  <p>
                    <strong>Status:</strong>{" "}
                    <span className={`status ${appointment.status}`}>
                      {appointment.status?.toUpperCase() || "PENDING"}
                    </span>
                  </p>

                  {appointment.status === "pending" && (
                    <button
                      className="cancel-appointment-btn"
                      type="button"
                      onClick={() =>
                        handleCancel(appointment._id)
                      }
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default Appointments;
