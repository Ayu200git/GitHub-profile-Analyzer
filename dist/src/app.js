"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = require("express-rate-limit");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const profileRoutes_1 = __importDefault(require("./routes/profileRoutes"));
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
const swagger_1 = __importDefault(require("./config/swagger"));
const app = (0, express_1.default)();
// Enable Cross-Origin Resource Sharing
app.use((0, cors_1.default)());
// HTTP Request Logging
app.use((0, morgan_1.default)('dev'));
// Parse JSON and urlencoded request bodies
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Apply rate limiting middleware (100 requests per 15 minutes per IP)
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        status: 429,
        error: 'Too Many Requests',
        message: 'Too many requests from this IP. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
// API Documentation Dashboard
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.default));
// Health Check / Landing Route
app.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'GitHub Profile Analyzer API is running.',
        documentation: '/api-docs',
        endpoints: {
            analyze: 'POST /api/profiles/analyze',
            getAll: 'GET /api/profiles',
            getSingle: 'GET /api/profiles/:username',
            reanalyze: 'PUT /api/profiles/:username/reanalyze',
            delete: 'DELETE /api/profiles/:username'
        }
    });
});
// API Routes
app.use('/api/profiles', profileRoutes_1.default);
// Catch-all route for unhandled resources
app.use((req, _res, next) => {
    const err = new Error(`Resource '${req.method} ${req.url}' not found`);
    err.statusCode = 404;
    next(err);
});
// Centralized Error Handling Middleware
app.use(errorHandler_1.default);
exports.default = app;
