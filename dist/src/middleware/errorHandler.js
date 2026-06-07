"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = errorHandler;
/**
 * Central Error Handling Middleware
 */
function errorHandler(err, req, res, _next) {
    // Log the error details for debugging
    console.error(`[Error] ${req.method} ${req.url} - ${err.message}`);
    if (process.env.NODE_ENV !== 'production' && err.stack) {
        console.error(err.stack);
    }
    const statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    // Format custom database error messages for users
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            status: 409,
            error: 'Conflict',
            message: 'Database Conflict: Profile already exists in our system.'
        });
    }
    if (err.code === 'ECONNREFUSED') {
        return res.status(500).json({
            success: false,
            status: 500,
            error: 'Database Error',
            message: 'Database connection failed. Please ensure the database server is running.'
        });
    }
    // Handle express validation or custom errors
    return res.status(statusCode).json({
        success: false,
        status: statusCode,
        error: getErrorName(statusCode),
        message
    });
}
/**
 * Return user-friendly error names based on HTTP status code
 */
function getErrorName(statusCode) {
    switch (statusCode) {
        case 400: return 'Bad Request';
        case 401: return 'Unauthorized';
        case 403: return 'Forbidden';
        case 404: return 'Not Found';
        case 409: return 'Conflict';
        case 422: return 'Unprocessable Entity';
        case 429: return 'Too Many Requests';
        case 503: return 'Service Unavailable';
        default: return 'Internal Server Error';
    }
}
