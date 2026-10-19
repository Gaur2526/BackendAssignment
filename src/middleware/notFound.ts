import { RequestHandler } from 'express';

const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ success: false, error: { message: `Route ${req.method} ${req.originalUrl} not found` } });
};
export default notFound;
