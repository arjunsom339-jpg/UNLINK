'use strict';

const { Notification } = require('../models');

/**
 * NOTIFICATION SERVICE
 * Manages in-app notifications and event reminders.
 * Provides hooks for future FCM / WebSocket delivery without claiming fake push.
 */

/**
 * Dispatch an in-app notification to a user
 */
const createNotification = async ({ userId, type, title, message, data = null }) => {
  if (!userId || !type || !title || !message) {
    return null;
  }

  try {
    const notification = await Notification.create({
      userId,
      type,
      title: title.trim().slice(0, 255),
      message: message.trim(),
      data: data || {},
      isRead: false,
    });

    // NOTE: Future FCM / WebSocket broadcast can hook in here cleanly
    return notification;
  } catch (err) {
    console.error('Failed to create in-app notification:', err.message);
    return null;
  }
};

/**
 * Retrieve notifications for a user with pagination
 */
const getUserNotifications = async (userId, { unreadOnly = false, page = 1, limit = 20 } = {}) => {
  const where = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }

  const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, Math.max(1, parseInt(limit, 10)));
  const pageLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const { rows, count } = await Notification.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: pageLimit,
    offset,
  });

  return {
    notifications: rows,
    total: count,
    page: parseInt(page, 10) || 1,
    totalPages: Math.ceil(count / pageLimit),
  };
};

/**
 * Mark a specific notification as read
 */
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    const error = new Error('Notification not found.');
    error.statusCode = 404;
    throw error;
  }

  await notification.update({ isRead: true });
  return notification;
};

/**
 * Mark all unread notifications as read for a user
 */
const markAllAsRead = async (userId) => {
  const [updatedCount] = await Notification.update(
    { isRead: true },
    { where: { userId, isRead: false } }
  );
  return updatedCount;
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
