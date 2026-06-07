import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import profileRoutes from './routes/profileRoutes';
import errorHandler from './middleware/errorHandler';
import swaggerDocument from './config/swagger';
import { CustomError } from './types/github';

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors());

// HTTP Request Logging
app.use(morgan('dev'));

// Parse JSON and urlencoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting middleware (100 requests per 15 minutes per IP)
const limiter = rateLimit({
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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health Check / Landing Route
app.get('/', (req: Request, res: Response) => {
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
app.use('/api/profiles', profileRoutes);

// Catch-all route for unhandled resources
app.use((req: Request, res: Response, next: NextFunction) => {
  const err: CustomError = new Error(`Resource '${req.method} ${req.url}' not found`);
  err.statusCode = 404;
  next(err);
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
