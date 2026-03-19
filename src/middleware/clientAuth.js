'use strict';

const jwt = require('jsonwebtoken');
const prisma = require('../db/client');

const clientAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (payload.role !== 'client') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await prisma.client.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, businessName: true, clientCode: true, currency: true, isActive: true },
    });

    if (!client || !client.isActive) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.client = client;
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = clientAuth;
