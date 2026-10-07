'use strict';

const admin = require('firebase-admin');
const logger = require('../utils/logger');

let firebaseApp = null;

const initializeFirebase = () => {
  if (firebaseApp) return firebaseApp;

  try {
    // Parse the private key correctly (env vars escape newlines)
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });

    logger.info('Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error) {
    logger.error('Firebase Admin SDK initialization failed:', error);
    // Don't crash the server — Firebase may not be configured in local dev
    return null;
  }
};

/**
 * Verify a Firebase ID token (used for Google OAuth + Phone OTP)
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<admin.auth.DecodedIdToken>}
 */
const verifyFirebaseToken = async (idToken) => {
  if (!firebaseApp) {
    throw new Error('Firebase Admin SDK is not initialized');
  }
  return admin.auth().verifyIdToken(idToken);
};

module.exports = { initializeFirebase, verifyFirebaseToken };
