
import { useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import "./SymptomChecker.css";
import API_URL from "../config";

const BASE_URL = API_URL.replace(/\/$/, "");

export default function SymptomChecker() {
  const [symptoms, setSymptoms] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const availableSymptoms = [
    "fever",
    "cough",
    "body ache",
    "fatigue",
    "headache",
    "nausea",
    "sneezing",
    "runny nose",
    "sore throat",
    "chills",
    "itchy eyes",
    "light sensitivity",
  ];

  const handleSymptomChange = (symptom) => {
    setSymptoms((previous) =>
      previous.includes(symptom)
        ? previous.filter((item) => item !== symptom)
        : [...previous, symptom]
    );

    setError("");
    setResult(null);
  };

  const checkSymptoms = async () => {
    if (symptoms.length === 0) {
      setError("Please select at least one symptom.");
      setResult(null);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${BASE_URL}/api/symptoms/check`,
        {
          symptoms,
        },
        {
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : {}),
          },
          timeout: 60000,
        }
      );

      const data = response.data;

      console.log("Backend response:", data);

      // Validate backend response
      if (
        data?.success !== true ||
        !Array.isArray(data.results)
      ) {
        throw new Error(
          data?.message ||
          "Unexpected response from the backend. Please check the API response."
        );
      }

      if (data.results.length === 0) {
        throw new Error(
          "No prediction was returned. Try selecting different symptoms."
        );
      }

      const prediction = data.results[0];

      if (
        !prediction ||
        typeof prediction.condition !== "string"
      ) {
        throw new Error(
          "The backend returned an invalid prediction."
        );
      }

      setResult({
        prediction: prediction.condition,
        message:
          prediction.advice ||
          "Educational demonstration only. This is not a medical diagnosis.",
        demo: true,
        matchedSymptoms: Array.isArray(
          prediction.matchedSymptoms
        )
          ? prediction.matchedSymptoms
          : [],
        unmatchedSymptoms: Array.isArray(
          prediction.unmatchedSymptoms
        )
          ? prediction.unmatchedSymptoms
          : [],
      });
    } catch (err) {
      console.error(
        "Symptom checker error:",
        err.response?.data || err.message
      );

      let errorMessage =
        "Unable to analyze symptoms. Please try again.";

      if (err.response) {
        errorMessage =
          err.response.data?.message ||
          `Backend error: ${err.response.status}`;
      } else if (err.code === "ECONNABORTED") {
        errorMessage =
          "The request timed out. Your backend or ML service may be taking too long.";
      } else if (err.message === "Network Error") {
        errorMessage =
          "Cannot connect to the backend. Check your Render backend URL, service status, and CORS settings.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="symptom-page">
        <div className="symptom-container">
          <h1>AI Symptom Checker</h1>

          <p className="subtitle">
            Select your symptoms to test the HealthAI ML service.
          </p>

          <section className="symptom-card">
            <h2>Select Your Symptoms</h2>

            <div className="symptom-list">
              {availableSymptoms.map((symptom) => (
                <label
                  className="symptom-option"
                  key={symptom}
                >
                  <input
                    type="checkbox"
                    checked={symptoms.includes(symptom)}
                    onChange={() =>
                      handleSymptomChange(symptom)
                    }
                    disabled={loading}
                  />

                  <span>{symptom}</span>
                </label>
              ))}
            </div>

            <button
              type="button"
              className="check-button"
              onClick={checkSymptoms}
              disabled={loading}
            >
              {loading
                ? "Analyzing..."
                : "Analyze Symptoms"}
            </button>

            {loading && (
              <div
                className="loading-message"
                role="status"
              >
                <div className="spinner"></div>

                <p>
                  Please wait while we analyze your symptoms...
                </p>
              </div>
            )}

            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
          </section>

          {result && (
            <section className="results-section">
              <h2>ML Demonstration Result</h2>

              <article className="result-card">
                <h3>
                  {result.prediction.replace(/_/g, " ")}
                </h3>

                <p>{result.message}</p>

                <p>
                  <strong>Matched symptoms:</strong>{" "}
                  {result.matchedSymptoms.length > 0
                    ? result.matchedSymptoms.join(", ")
                    : "None"}
                </p>

                {result.unmatchedSymptoms.length > 0 && (
                  <p>
                    <strong>
                      Not recognized by the model:
                    </strong>{" "}
                    {result.unmatchedSymptoms.join(", ")}
                  </p>
                )}

                <p>
                  <strong>Demo mode:</strong>{" "}
                  {result.demo ? "Yes" : "No"}
                </p>

                <p className="result-disclaimer">
                  This is a software integration demonstration,
                  not a medical diagnosis. Do not use this
                  prediction to make healthcare decisions.
                </p>
              </article>
            </section>
          )}

          <p className="medical-disclaimer">
            This tool is for software testing and educational
            purposes only. Its model is not medically validated.
            It cannot diagnose diseases or replace professional
            medical advice.
          </p>
        </div>
      </main>
    </>
  );
}
