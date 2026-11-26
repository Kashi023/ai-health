
import React, { useEffect, useState, useCallback } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import API_URL from "../config";
import "./DoctorDashboard.css";

const BASE_URL = API_URL.replace(/\/$/, "");

function DoctorDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "")
    .trim()
    .toLowerCase();

  // ==========================================
  // FETCH DOCTOR PROFILE AND APPOINTMENTS
  // ==========================================

  const fetchDoctorData = useCallback(async () => {
    const currentToken = localStorage.getItem("token");
    const currentRole = (localStorage.getItem("role") || "")
      .trim()
      .toLowerCase();

    if (!currentToken || currentRole !== "doctor") {
      setLoading(false);
      navigate("/login", { replace: true });
      return;
    }

    try {
      setError("");
      setRefreshing(true);

      const config = {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
        timeout: 60000,
      };

      // Fetch profile and appointments independently
      const [profileResult, appointmentResult] =
        await Promise.allSettled([
          axios.get(
            `${BASE_URL}/api/doctors/profile`,
            config
          ),
          axios.get(
            `${BASE_URL}/api/appointments/doctor`,
            config
          ),
        ]);

      // Handle authentication errors
      const failedResult = [profileResult, appointmentResult].find(
        (result) =>
          result.status === "rejected" &&
          result.reason?.response?.status === 401
      );

      if (failedResult) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("user");

        navigate("/login", { replace: true });
        return;
      }

      // ==========================================
      // DOCTOR PROFILE
      // ==========================================

      if (profileResult.status === "fulfilled") {
        const profileData = profileResult.value.data;

        const doctor =
          profileData?.doctor ||
          profileData?.user ||
          profileData?.data ||
          profileData;

        if (doctor && doctor.name) {
          setUser(doctor);
        } else {
          setError("Doctor profile information was not found.");
        }
      } else {
        const profileError = profileResult.reason;

        console.error(
          "Doctor profile error:",
          profileError.response?.data || profileError.message
        );

        setError(
          profileError.response?.data?.message ||
          (profileError.code === "ERR_NETWORK"
            ? "Cannot connect to the backend. Please check your Render service."
            : "Unable to load doctor profile.")
        );
      }

      // ==========================================
      // DOCTOR APPOINTMENTS
      // ==========================================

      if (appointmentResult.status === "fulfilled") {
        const appointmentResponse = appointmentResult.value.data;

        const appointmentData =
          appointmentResponse?.appointments ??
          appointmentResponse?.data ??
          appointmentResponse;

        if (Array.isArray(appointmentData)) {
          setAppointments(appointmentData);
        } else {
          setAppointments([]);
          setError("Invalid appointment data received from server.");
        }
      } else {
        const appointmentError = appointmentResult.reason;

        console.error(
          "Doctor appointments error:",
          appointmentError.response?.data ||
          appointmentError.message
        );

        setAppointments([]);

        setError((previousError) =>
          previousError
            ? `${previousError} Appointments could not be loaded.`
            : appointmentError.response?.data?.message ||
              (appointmentError.code === "ERR_NETWORK"
                ? "Cannot connect to the appointment service. Check your backend and CORS settings."
                : "Unable to load appointments.")
        );
      }
    } catch (err) {
      console.error(
        "Doctor dashboard error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
        "Unable to load doctor dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDoctorData();
  }, [fetchDoctorData]);

  // ==========================================
  // UPDATE APPOINTMENT STATUS
  // ==========================================

  const updateAppointment = async (appointmentId, status) => {
    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
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
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      await fetchDoctorData();
    } catch (err) {
      console.error(
        "Appointment update error:",
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
        (err.code === "ERR_NETWORK"
          ? "Cannot connect to the backend."
          : "Unable to update appointment.")
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (date, includeTime = true) => {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return includeTime
      ? parsedDate.toLocaleString("en-IN")
      : parsedDate.toLocaleDateString("en-IN");
  };

  // ==========================================
  // AUTHENTICATION CHECK
  // ==========================================

  if (!token || role !== "doctor") {
    return <Navigate to="/login" replace />;
  }

  // ==========================================
  // LOADING STATE
  // ==========================================

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="dashboard doctor-dashboard">
          <h2>Loading doctor dashboard...</h2>
        </main>
      </>
    );
  }

  // ==========================================
  // PROFILE ERROR STATE
  // ==========================================

  if (!user) {
    return (
      <>
        <Navbar />

        <main className="dashboard doctor-dashboard">
          <div className="doctor-error">
            {error || "Unable to load your doctor profile."}
          </div>

          <button
            type="button"
            onClick={fetchDoctorData}
            disabled={refreshing}
          >
            {refreshing ? "Loading..." : "Try Again"}
          </button>
        </main>
      </>
    );
  }

  // ==========================================
  // APPOINTMENT STATISTICS
  // ==========================================

  const pendingCount = appointments.filter(
    (item) => item.status?.toLowerCase() === "pending"
  ).length;

  const acceptedCount = appointments.filter(
    (item) => item.status?.toLowerCase() === "accepted"
  ).length;

  const rejectedCount = appointments.filter(
    (item) => item.status?.toLowerCase() === "rejected"
  ).length;

  const completedCount = appointments.filter(
    (item) => item.status?.toLowerCase() === "completed"
  ).length;

  // ==========================================
  // DASHBOARD UI
  // ==========================================

  return (
    <>
      <Navbar />

      <main className="dashboard doctor-dashboard">

        {/* Welcome Section */}
        <section className="welcome-section">
          <div>
            <p className="small-title">
              DOCTOR PORTAL
            </p>

            <h1>
              Welcome,{" "}
              <span>Dr. {user.name || "Doctor"}.</span>
            </h1>

            <p className="welcome-text">
              Manage your healthcare activities, connect with
              patients, and review appointment requests through
              HealthAI.
            </p>

            <a
              href="#patient-appointments"
              className="check-btn"
            >
              View Appointment Requests →
            </a>
          </div>

          <div className="ai-card">
            <div className="ai-icon">⚕</div>

            <h2>HealthAI Doctor Portal</h2>

            <p>
              Your healthcare management workspace.
            </p>

            <div className="online">
              <span></span>
              Portal Active
            </div>
          </div>
        </section>

        {/* Appointment Statistics */}
        <section className="doctor-appointment-stats">
          <div className="doctor-stat-card">
            <h2>{appointments.length}</h2>
            <p>Total Requests</p>
          </div>

          <div className="doctor-stat-card">
            <h2>{pendingCount}</h2>
            <p>Pending Requests</p>
          </div>

          <div className="doctor-stat-card">
            <h2>{acceptedCount}</h2>
            <p>Accepted</p>
          </div>

          <div className="doctor-stat-card">
            <h2>{rejectedCount}</h2>
            <p>Rejected</p>
          </div>

          <div className="doctor-stat-card">
            <h2>{completedCount}</h2>
            <p>Completed</p>
          </div>
        </section>

        {/* Patient Appointment Requests */}
        <section
          className="doctor-requests-section"
          id="patient-appointments"
        >
          <div className="doctor-section-heading">
            <div>
              <h2>Patient Appointment Requests</h2>

              <p>
                View and manage requests sent by patients.
              </p>
            </div>

            <button
              type="button"
              className="doctor-refresh-btn"
              onClick={fetchDoctorData}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {error && (
            <div className="doctor-error" role="alert">
              {error}
            </div>
          )}

          {appointments.length === 0 ? (
            <div className="doctor-no-appointments">
              <div className="empty-icon">📅</div>

              <h3>No Appointment Requests Yet</h3>

              <p>
                When a patient books an appointment with you,
                their request will appear here.
              </p>
            </div>
          ) : (
            <div className="doctor-appointment-list">
              {appointments.map((appointment) => (
                <article
                  className="doctor-appointment-card"
                  key={appointment._id}
                >
                  {/* Patient Information */}
                  <div className="doctor-appointment-header">
                    <div>
                      <h3>
                        {appointment.patient?.name ||
                          "Unknown Patient"}
                      </h3>

                      <p>
                        {appointment.patient?.email ||
                          "Email not available"}
                      </p>
                    </div>

                    <span
                      className={`doctor-status ${appointment.status}`}
                    >
                      {appointment.status}
                    </span>
                  </div>

                  {/* Appointment Details */}
                  <div className="doctor-appointment-details">
                    <p>
                      <strong>Appointment Date:</strong>{" "}
                      {formatDate(appointment.appointmentDate)}
                    </p>

                    <p>
                      <strong>Reason:</strong>{" "}
                      {appointment.reason || "Not specified"}
                    </p>

                    <p>
                      <strong>Request Submitted:</strong>{" "}
                      {formatDate(appointment.createdAt, false)}
                    </p>
                  </div>

                  {/* Pending Appointment Actions */}
                  {appointment.status?.toLowerCase() === "pending" && (
                    <div className="doctor-action-buttons">
                      <button
                        type="button"
                        className="doctor-accept-btn"
                        disabled={updatingId === appointment._id}
                        onClick={() =>
                          updateAppointment(
                            appointment._id,
                            "accepted"
                          )
                        }
                      >
                        {updatingId === appointment._id
                          ? "Updating..."
                          : "Accept Request"}
                      </button>

                      <button
                        type="button"
                        className="doctor-reject-btn"
                        disabled={updatingId === appointment._id}
                        onClick={() =>
                          updateAppointment(
                            appointment._id,
                            "rejected"
                          )
                        }
                      >
                        {updatingId === appointment._id
                          ? "Updating..."
                          : "Reject Request"}
                      </button>
                    </div>
                  )}

                  {/* Accepted Appointment Action */}
                  {appointment.status?.toLowerCase() === "accepted" && (
                    <button
                      type="button"
                      className="doctor-complete-btn"
                      disabled={updatingId === appointment._id}
                      onClick={() =>
                        updateAppointment(
                          appointment._id,
                          "completed"
                        )
                      }
                    >
                      {updatingId === appointment._id
                        ? "Updating..."
                        : "Mark as Completed"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Doctor Services */}
        <section className="quick-section">
          <div className="section-heading">
            <h2>Doctor Services</h2>
            <p>Manage your activities</p>
          </div>

          <div className="cards">
            <a
              href="#patient-appointments"
              className="health-card"
            >
              <div className="card-icon">📅</div>

              <h3>Appointments</h3>

              <p>
                View and manage patient appointment requests.
              </p>

              <span>View Requests →</span>
            </a>

            <Link
              to="/doctor/appointments"
              className="health-card"
            >
              <div className="card-icon">📋</div>

              <h3>All Appointments</h3>

              <p>
                Open the dedicated appointment management page.
              </p>

              <span>View All →</span>
            </Link>
          </div>
        </section>

        {/* Bottom Section */}
        <section className="bottom-section">
          <div className="activity-card">
            <div className="card-heading">
              <h2>Patient Activity</h2>
            </div>

            <div className="activity">
              <div className="activity-icon">📋</div>

              <div>
                <h4>Appointment Management</h4>
                <p>Check your appointment requests.</p>
              </div>
            </div>
          </div>

          <div className="tip-card">
            <div className="tip-icon">💡</div>

            <h2>Healthcare Reminder</h2>

            <p>
              Review patient information carefully and
              maintain appropriate patient confidentiality.
            </p>
          </div>
        </section>

      </main>
    </>
  );
}

export default DoctorDashboard;
