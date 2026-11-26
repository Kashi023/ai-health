
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API_URL from "../config";
import "./DoctorAppointments.css";

const BASE_URL = API_URL.replace(/\/$/, "");

function DoctorAppointments() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);

  // Get authentication headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // FETCH DOCTOR APPOINTMENTS
  const fetchAppointments = useCallback(async () => {
    const token = localStorage.getItem("token");
    const role = (localStorage.getItem("role") || "")
      .trim()
      .toLowerCase();

    if (!token) {
      setError("Login session not found. Please login again.");
      setAppointments([]);
      setLoading(false);
      setRefreshing(false);
      navigate("/login", { replace: true });
      return;
    }

    if (role !== "doctor") {
      setError("Only doctors can access these appointments.");
      setAppointments([]);
      setLoading(false);
      setRefreshing(false);
      navigate("/dashboard", { replace: true });
      return;
    }

    try {
      setError("");
      setRefreshing(true);

      const response = await axios.get(
        `${BASE_URL}/api/appointments/doctor`,
        {
          headers: getAuthHeaders(),
          timeout: 30000,
        }
      );

      const appointmentData =
        response.data?.appointments ??
        response.data?.data?.appointments ??
        response.data?.data ??
        response.data;

      if (!Array.isArray(appointmentData)) {
        throw new Error(
          "Invalid appointment data received from server."
        );
      }

      setAppointments(appointmentData);
    } catch (err) {
      console.error(
        "Fetch appointments error:",
        err.response?.data || err.message
      );

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("user");

        navigate("/login", { replace: true });
        return;
      }

      if (err.response?.status === 403) {
        setError("Only doctors can access these appointments.");
      } else if (err.code === "ECONNABORTED") {
        setError("Request timed out. Please try refreshing.");
      } else if (!err.response) {
        setError(
          "Cannot connect to the server. Please check your backend deployment and API URL."
        );
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to fetch appointment requests."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // UPDATE APPOINTMENT STATUS
  const updateStatus = async (appointmentId, status) => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Login session not found. Please login again.");
      navigate("/login", { replace: true });
      return;
    }

    try {
      setUpdatingId(appointmentId);
      setError("");

      await axios.patch(
        `${BASE_URL}/api/appointments/${appointmentId}/status`,
        { status },
        {
          headers: getAuthHeaders(),
          timeout: 30000,
        }
      );

      // Refresh list after successful update
      await fetchAppointments();
    } catch (err) {
      console.error(
        "Update status error:",
        err.response?.data || err.message
      );

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("user");

        navigate("/login", { replace: true });
        return;
      }

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to update appointment status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // DATE FORMATTING
  const formatDate = (date) => {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Invalid date";
    }

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // FILTER APPOINTMENTS
  const filteredAppointments = appointments.filter((appointment) => {
    if (filter === "all") return true;
    return appointment.status === filter;
  });

  // APPOINTMENT STATISTICS
  const pending = appointments.filter(
    (a) => a.status === "pending"
  ).length;

  const accepted = appointments.filter(
    (a) => a.status === "accepted"
  ).length;

  const rejected = appointments.filter(
    (a) => a.status === "rejected"
  ).length;

  const completed = appointments.filter(
    (a) => a.status === "completed"
  ).length;

  // UI
  return (
    <>
      <Navbar />

      <main className="doctor-appointments-page">
        {/* Page Heading */}
        <section className="appointments-heading">
          <div>
            <p className="appointments-subtitle">DOCTOR PORTAL</p>

            <h1>Patient Appointments</h1>

            <p>
              View patient requests and manage appointment status.
            </p>
          </div>

          <button
            type="button"
            className="refresh-appointments-btn"
            onClick={fetchAppointments}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
        </section>

        {/* Appointment Statistics */}
        <section className="appointment-summary">
          <div className="summary-card">
            <h2>{appointments.length}</h2>
            <p>Total Requests</p>
          </div>

          <div className="summary-card pending-card">
            <h2>{pending}</h2>
            <p>Pending</p>
          </div>

          <div className="summary-card accepted-card">
            <h2>{accepted}</h2>
            <p>Accepted</p>
          </div>

          <div className="summary-card rejected-card">
            <h2>{rejected}</h2>
            <p>Rejected</p>
          </div>

          <div className="summary-card completed-card">
            <h2>{completed}</h2>
            <p>Completed</p>
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <div className="appointments-error" role="alert">
            {error}
          </div>
        )}

        {/* Appointment Requests */}
        <section className="appointments-content">
          <div className="appointments-filter">
            <h2>Appointment Requests</h2>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Appointments</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {loading ? (
            <div className="appointments-empty">
              <h3>Loading appointments...</h3>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="appointments-empty">
              <div className="empty-calendar">📅</div>

              <h3>No Appointments Found</h3>

              <p>
                Patient appointment requests will appear here
                when someone books an appointment with you.
              </p>
            </div>
          ) : (
            <div className="doctor-requests-list">
              {filteredAppointments.map((appointment) => (
                <article
                  className="doctor-request-card"
                  key={appointment._id}
                >
                  {/* Patient Information */}
                  <div className="request-top">
                    <div className="patient-info">
                      <div className="patient-avatar">
                        {appointment.patient?.name
                          ?.charAt(0)
                          ?.toUpperCase() || "P"}
                      </div>

                      <div>
                        <h3>
                          {appointment.patient?.name ||
                            "Unknown Patient"}
                        </h3>

                        <p>
                          {appointment.patient?.email ||
                            "Email unavailable"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`appointment-status ${appointment.status}`}
                    >
                      {appointment.status || "pending"}
                    </span>
                  </div>

                  {/* Appointment Details */}
                  <div className="request-details">
                    <div>
                      <span>Appointment Date</span>
                      <strong>
                        {formatDate(appointment.appointmentDate)}
                      </strong>
                    </div>

                    <div>
                      <span>Request Submitted</span>
                      <strong>
                        {formatDate(appointment.createdAt)}
                      </strong>
                    </div>

                    <div className="reason-detail">
                      <span>Reason for Appointment</span>
                      <strong>
                        {appointment.reason || "Not specified"}
                      </strong>
                    </div>
                  </div>

                  {/* Pending Appointment Actions */}
                  {appointment.status === "pending" && (
                    <div className="request-actions">
                      <button
                        type="button"
                        className="accept-appointment-btn"
                        disabled={updatingId === appointment._id}
                        onClick={() =>
                          updateStatus(appointment._id, "accepted")
                        }
                      >
                        {updatingId === appointment._id
                          ? "Updating..."
                          : "✓ Accept Request"}
                      </button>

                      <button
                        type="button"
                        className="reject-appointment-btn"
                        disabled={updatingId === appointment._id}
                        onClick={() =>
                          updateStatus(appointment._id, "rejected")
                        }
                      >
                        {updatingId === appointment._id
                          ? "Updating..."
                          : "✕ Reject Request"}
                      </button>
                    </div>
                  )}

                  {/* Accepted Appointment Action */}
                  {appointment.status === "accepted" && (
                    <div className="request-actions">
                      <button
                        type="button"
                        className="complete-appointment-btn"
                        disabled={updatingId === appointment._id}
                        onClick={() =>
                          updateStatus(appointment._id, "completed")
                        }
                      >
                        {updatingId === appointment._id
                          ? "Updating..."
                          : "Mark as Completed"}
                      </button>
                    </div>
                  )}

                  {/* Rejected Status */}
                  {appointment.status === "rejected" && (
                    <p className="final-status-message">
                      This appointment request was rejected.
                    </p>
                  )}

                  {/* Completed Status */}
                  {appointment.status === "completed" && (
                    <p className="final-status-message">
                      This appointment has been completed.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default DoctorAppointments;
