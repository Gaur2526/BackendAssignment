import express from 'express';
import userRoutes from './routes/user.routes';
import teacherRoutes from './routes/teacher.routes';
import sessionRoutes from './routes/session.routes';
import errorHandler from './middleware/errorHandler';
import notFound from './middleware/notFound';

const app = express();
app.use(express.json({ limit: '100kb' }));
app.get('/health', (_req, res) => res.status(200).json({ success: true, data: { status: 'ok' } }));
app.use('/users', userRoutes);
app.use('/teachers', teacherRoutes);
app.use('/sessions', sessionRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
