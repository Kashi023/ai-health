
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

const protect = (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error",
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token required",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization header",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id || decoded._id || decoded.userId;

    if (
      !userId ||
      !mongoose.Types.ObjectId.isValid(userId) ||
      !decoded.role
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid token: User information missing",
      });
    }

    req.user = {
      ...decoded,
      id: userId.toString(),
      role: decoded.role,
    };

    next();

  } catch (error) {
    console.error("Authentication error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};


// ==========================================
// ROLE AUTHORIZATION MIDDLEWARE
// ==========================================

const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this resource",
      });
    }

    next();
  };
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
  protect,
  authorizeRole,
};
