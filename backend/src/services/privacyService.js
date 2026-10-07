'use strict';

const connectionService = require('./connectionService');

/**
 * Filter and sanitize student profile data based on privacy rules and connection status
 *
 * @param {object} profile - StudentProfile instance or plain object
 * @param {object} viewer - { id, role, collegeId }
 * @param {string} forcedConnectionStatus - optional pre-calculated connection status
 */
const sanitizeStudentProfile = async (profile, viewer, forcedConnectionStatus = null) => {
  if (!profile) return null;

  const raw = profile.toJSON ? profile.toJSON() : { ...profile };
  const isOwner = viewer && viewer.id === raw.userId;
  const isAdmin = viewer && viewer.role === 'admin';

  // Owners and Admins always receive complete access
  if (isOwner || isAdmin) {
    return {
      ...raw,
      connectionStatus: isOwner ? 'self' : 'admin_view',
      isRestricted: false,
    };
  }

  // Determine connection status with viewer
  const connStatus = forcedConnectionStatus !== null
    ? forcedConnectionStatus
    : await connectionService.getConnectionStatus(viewer.id, raw.userId);

  const isConnected = connStatus === 'accepted';
  const isSameCollege = viewer && viewer.collegeId && raw.collegeId && viewer.collegeId === raw.collegeId;

  // Rule 0: Blocked user relationship
  if (connStatus === 'blocked' || connStatus === 'blocked_by_me') {
    return {
      id: raw.id,
      userId: raw.userId,
      fullName: connStatus === 'blocked_by_me' ? raw.fullName : 'UniLink Student',
      profilePhoto: null,
      department: raw.department,
      semester: null,
      college: raw.college,
      skillsKnown: [],
      skillsWanted: [],
      interests: [],
      reputationScore: 0,
      connectionsCount: 0,
      connectionStatus: connStatus,
      isRestricted: true,
      restrictionReason: connStatus === 'blocked_by_me' ? 'You have blocked this student.' : 'This profile is not accessible.',
    };
  }

  // Evaluate profile visibility setting
  const visibility = raw.profileVisibility || 'campus';

  // Rule 1: 'connections' only visibility
  if (visibility === 'connections' && !isConnected) {
    return {
      id: raw.id,
      userId: raw.userId,
      fullName: raw.fullName,
      profilePhoto: raw.profilePhoto,
      department: raw.department,
      semester: raw.semester,
      college: raw.college,
      skillsKnown: raw.skillsKnown || [],
      skillsWanted: raw.skillsWanted || [],
      interests: raw.interests || [],
      reputationScore: raw.reputationScore,
      connectionsCount: raw.connectionsCount,
      connectionStatus: connStatus,
      isRestricted: true,
      restrictionReason: 'This student has set their profile visibility to Connections Only. Send a connection request to view their full portfolio, bio, and achievements.',
    };
  }

  // Rule 2: 'campus' only visibility with external visitor
  if (visibility === 'campus' && !isSameCollege && !isConnected) {
    return {
      id: raw.id,
      userId: raw.userId,
      fullName: raw.fullName,
      profilePhoto: raw.profilePhoto,
      department: raw.department,
      semester: raw.semester,
      college: raw.college,
      skillsKnown: raw.skillsKnown || [],
      reputationScore: raw.reputationScore,
      connectionStatus: connStatus,
      isRestricted: true,
      restrictionReason: 'This profile is limited to members of the same college campus.',
    };
  }

  // Base profile for visible users
  const sanitized = {
    ...raw,
    connectionStatus: connStatus,
    isRestricted: false,
  };

  // Enforce phone privacy
  if (!raw.showPhone && !isConnected) {
    sanitized.phone = null;
  }

  // Enforce location privacy
  if (!raw.showLocation && !raw.locationEnabled) {
    sanitized.lastLatitude = null;
    sanitized.lastLongitude = null;
    sanitized.lastLocationUpdate = null;
  }

  return sanitized;
};

module.exports = {
  sanitizeStudentProfile,
};
