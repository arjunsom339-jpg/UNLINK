'use strict';

const { Op } = require('sequelize');
const { Connection, User, StudentProfile, ReputationLog, Block } = require('../models');

/**
 * Send a connection request to a student peer
 */
const sendRequest = async (requesterId, receiverId, message = '') => {
  if (requesterId === receiverId) {
    const error = new Error('You cannot connect with yourself.');
    error.statusCode = 400;
    throw error;
  }

  // Ensure receiver exists and is an active student
  const receiver = await User.findOne({
    where: { id: receiverId, role: 'student', accountStatus: 'active' },
    include: [{ model: StudentProfile, as: 'studentProfile' }],
  });

  if (!receiver) {
    const error = new Error('Target student not found or account is not active.');
    error.statusCode = 404;
    throw error;
  }

  // Check if either party has blocked the other
  const isBlocked = await Block.findOne({
    where: {
      [Op.or]: [
        { blockerId: requesterId, blockedId: receiverId },
        { blockerId: receiverId, blockedId: requesterId },
      ],
    },
  });
  if (isBlocked) {
    const error = new Error('Cannot connect with this user.');
    error.statusCode = 403;
    throw error;
  }

  // Check if a relationship already exists in either direction
  const existing = await Connection.findOne({
    where: {
      [Op.or]: [
        { requesterId, receiverId },
        { requesterId: receiverId, receiverId: requesterId },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'accepted') {
      const error = new Error('You are already connected with this student.');
      error.statusCode = 409;
      throw error;
    }
    if (existing.status === 'pending') {
      const error = new Error(
        existing.requesterId === requesterId
          ? 'You already have a pending connection request to this student.'
          : 'This student has already sent you a connection request. Check your incoming requests.'
      );
      error.statusCode = 409;
      throw error;
    }
    if (existing.status === 'blocked') {
      const error = new Error('Cannot connect with this user.');
      error.statusCode = 403;
      throw error;
    }

    // If previously rejected, cancelled, or removed, reset to pending with new message
    await existing.update({
      requesterId,
      receiverId,
      status: 'pending',
      message: message ? message.trim().slice(0, 300) : null,
      respondedAt: null,
    });
    return existing;
  }

  const newConnection = await Connection.create({
    requesterId,
    receiverId,
    status: 'pending',
    message: message ? message.trim().slice(0, 300) : null,
  });

  return newConnection;
};

/**
 * Accept an incoming connection request
 */
const acceptRequest = async (connectionId, currentUserId) => {
  const connection = await Connection.findByPk(connectionId);

  if (!connection) {
    const error = new Error('Connection request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (connection.receiverId !== currentUserId) {
    const error = new Error('You are not authorized to respond to this request.');
    error.statusCode = 403;
    throw error;
  }

  if (connection.status !== 'pending') {
    const error = new Error(`Request cannot be accepted because its status is '${connection.status}'.`);
    error.statusCode = 400;
    throw error;
  }

  await connection.update({
    status: 'accepted',
    respondedAt: new Date(),
  });

  // Increment connectionsCount on both profiles
  await Promise.all([
    StudentProfile.increment('connectionsCount', { by: 1, where: { userId: connection.requesterId } }),
    StudentProfile.increment('connectionsCount', { by: 1, where: { userId: connection.receiverId } }),
  ]);

  // Award reputation points for completing a peer connection (+10 points)
  try {
    await Promise.all([
      ReputationLog.create({
        userId: connection.requesterId,
        actorId: connection.receiverId,
        points: 10,
        actionType: 'skill_exchange',
        reason: 'Connected with peer for academic collaboration',
        sourceId: connection.id,
      }),
      ReputationLog.create({
        userId: connection.receiverId,
        actorId: connection.requesterId,
        points: 10,
        actionType: 'skill_exchange',
        reason: 'Connected with peer for academic collaboration',
        sourceId: connection.id,
      }),
      StudentProfile.increment('reputationScore', { by: 10, where: { userId: connection.requesterId } }),
      StudentProfile.increment('reputationScore', { by: 10, where: { userId: connection.receiverId } }),
    ]);
  } catch (err) {
    console.error('Error logging reputation points for connection:', err.message);
  }

  return connection;
};

/**
 * Reject an incoming connection request
 */
const rejectRequest = async (connectionId, currentUserId) => {
  const connection = await Connection.findByPk(connectionId);

  if (!connection) {
    const error = new Error('Connection request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (connection.receiverId !== currentUserId) {
    const error = new Error('You are not authorized to respond to this request.');
    error.statusCode = 403;
    throw error;
  }

  await connection.update({
    status: 'rejected',
    respondedAt: new Date(),
  });

  return connection;
};

/**
 * Cancel a sent connection request
 */
const cancelRequest = async (connectionId, currentUserId) => {
  const connection = await Connection.findByPk(connectionId);

  if (!connection) {
    const error = new Error('Connection request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (connection.requesterId !== currentUserId) {
    const error = new Error('You can only cancel requests you have initiated.');
    error.statusCode = 403;
    throw error;
  }

  if (connection.status !== 'pending') {
    const error = new Error('Only pending requests can be cancelled.');
    error.statusCode = 400;
    throw error;
  }

  await connection.update({
    status: 'cancelled',
  });

  return connection;
};

/**
 * Remove an existing accepted connection
 */
const removeConnection = async (connectionId, currentUserId) => {
  const connection = await Connection.findByPk(connectionId);

  if (!connection) {
    const error = new Error('Connection record not found.');
    error.statusCode = 404;
    throw error;
  }

  if (connection.requesterId !== currentUserId && connection.receiverId !== currentUserId) {
    const error = new Error('You are not a party in this connection.');
    error.statusCode = 403;
    throw error;
  }

  const wasAccepted = connection.status === 'accepted';

  await connection.update({
    status: 'removed',
  });

  if (wasAccepted) {
    // Decrement connectionsCount safely
    await Promise.all([
      StudentProfile.decrement('connectionsCount', { by: 1, where: { userId: connection.requesterId } }),
      StudentProfile.decrement('connectionsCount', { by: 1, where: { userId: connection.receiverId } }),
    ]);
  }

  return connection;
};

/**
 * Get active connections for a student
 */
const getAcceptedConnections = async (userId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  const { count, rows } = await Connection.findAndCountAll({
    where: {
      status: 'accepted',
      [Op.or]: [{ requesterId: userId }, { receiverId: userId }],
    },
    limit,
    offset,
    order: [['updatedAt', 'DESC']],
    include: [
      {
        model: User,
        as: 'requester',
        attributes: ['id', 'email'],
        include: [{ model: StudentProfile, as: 'studentProfile' }],
      },
      {
        model: User,
        as: 'receiver',
        attributes: ['id', 'email'],
        include: [{ model: StudentProfile, as: 'studentProfile' }],
      },
    ],
  });

  // Normalize partner profile
  const connections = rows.map((conn) => {
    const isRequester = conn.requesterId === userId;
    const partnerUser = isRequester ? conn.receiver : conn.requester;
    return {
      connectionId: conn.id,
      connectedSince: conn.respondedAt || conn.updatedAt,
      partner: {
        userId: partnerUser.id,
        email: partnerUser.email,
        profile: partnerUser.studentProfile,
      },
    };
  });

  return { total: count, page, limit, connections };
};

/**
 * Get pending incoming and outgoing connection requests
 */
const getPendingRequests = async (userId) => {
  const [received, sent] = await Promise.all([
    Connection.findAll({
      where: { receiverId: userId, status: 'pending' },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'email'],
          include: [{ model: StudentProfile, as: 'studentProfile' }],
        },
      ],
    }),
    Connection.findAll({
      where: { requesterId: userId, status: 'pending' },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'email'],
          include: [{ model: StudentProfile, as: 'studentProfile' }],
        },
      ],
    }),
  ]);

  return { received, sent };
};

/**
 * Check connection relationship status between two students
 */
const getConnectionStatus = async (userAId, userBId) => {
  if (userAId === userBId) return 'self';

  // Check if either party blocked the other
  const block = await Block.findOne({
    where: {
      [Op.or]: [
        { blockerId: userAId, blockedId: userBId },
        { blockerId: userBId, blockedId: userAId },
      ],
    },
  });
  if (block) {
    return block.blockerId === userAId ? 'blocked_by_me' : 'blocked';
  }

  const connection = await Connection.findOne({
    where: {
      [Op.or]: [
        { requesterId: userAId, receiverId: userBId },
        { requesterId: userBId, receiverId: userAId },
      ],
    },
  });

  if (!connection) return 'none';

  if (connection.status === 'accepted') return 'accepted';
  if (connection.status === 'pending') {
    return connection.requesterId === userAId ? 'pending_sent' : 'pending_received';
  }
  return 'none';
};

module.exports = {
  sendRequest,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  removeConnection,
  getAcceptedConnections,
  getPendingRequests,
  getConnectionStatus,
};
