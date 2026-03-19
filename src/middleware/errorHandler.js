'use strict';

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;

  console.error(err.stack);

  if (status >= 500 && process.env.NODE_ENV === 'production') {
    return res.status(status).json({ error: 'Internal server error' });
  }

  return res.status(status).json({
    error: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
