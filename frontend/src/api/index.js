import api from './client';

export const authApi = {
  registerStudent: (data) => api.post('/auth/register/student', data),
  registerTeacher: (data) => api.post('/auth/register/teacher', data),
  login:           (data) => api.post('/auth/login', data),
  loginStudent:    (data) => api.post('/auth/login/student', data),
  loginTeacher:    (data) => api.post('/auth/login/teacher', data),
  loginAdmin:      (data) => api.post('/auth/login/admin', data),
  firebaseLogin:   (data) => api.post('/auth/firebase', data),
  refresh:         (data) => api.post('/auth/refresh', data),
  logout:          (data) => api.post('/auth/logout', data),
  forgotPassword:  (data) => api.post('/auth/forgot-password', data),
  resetPassword:   (data) => api.post('/auth/reset-password', data),
  verifyEmail:     (data) => api.post('/auth/verify-email', data),
  getMe:           ()     => api.get('/auth/me'),
};

export const studentApi = {
  // Profile
  getProfile:          ()               => api.get('/student/profile'),
  updateProfile:       (data)           => api.patch('/student/profile', data),
  getProfileById:      (id)             => api.get(`/student/profile/${id}`),

  // Skills
  getSkills:           ()               => api.get('/student/skills'),
  addSkill:            (data)           => api.post('/student/skills', data),
  removeSkill:         (id)             => api.delete(`/student/skills/${id}`),

  // Learn & Connect
  getLearnConnectDashboard: ()          => api.get('/student/learn-connect/dashboard'),
  discoverStudents:    (params)         => api.get('/student/learn-connect/discover', { params }),
  findPeopleToLearnFrom: (params)       => api.get('/student/learn-connect/learn-from', { params }),
  getSkillExchangeMatches: (params)     => api.get('/student/learn-connect/matches', { params }),

  // Projects & Hackathons Collaboration
  getProjects:         (params)         => api.get('/student/projects', { params }),
  createProject:       (data)           => api.post('/student/projects', data),
  joinProject:         (id, data)       => api.post(`/student/projects/${id}/join`, data),
  acceptProjectMember: (projectId, memberId) => api.patch(`/student/projects/${projectId}/members/${memberId}/accept`),
  rejectProjectMember: (projectId, memberId) => api.patch(`/student/projects/${projectId}/members/${memberId}/reject`),
  getHackathons:       (params)         => api.get('/student/hackathons', { params }),
  createHackathon:     (data)           => api.post('/student/hackathons', data),
  joinHackathon:       (id, data)       => api.post(`/student/hackathons/${id}/join`, data),
  acceptHackathonMember: (hackathonId, memberId) => api.patch(`/student/hackathons/${hackathonId}/members/${memberId}/accept`),
  rejectHackathonMember: (hackathonId, memberId) => api.patch(`/student/hackathons/${hackathonId}/members/${memberId}/reject`),

  // Blocking & Reporting
  blockStudent:        (data)           => api.post('/student/blocks', data),
  unblockStudent:      (userId)         => api.delete(`/student/blocks/${userId}`),
  getBlockedStudents:  ()               => api.get('/student/blocks'),
  reportStudent:       (data)           => api.post('/student/reports', data),

  // Reputation & Academic
  getReputation:       ()               => api.get('/student/reputation'),
  getDashboard:        ()               => api.get('/student/dashboard'),
  getAnnouncements:    (params)         => api.get('/student/announcements', { params }),
  getHelpRequests:     ()               => api.get('/student/help-requests'),
  createHelpRequest:   (data)           => api.post('/student/help-requests', data),
  respondHelpRequest:  (id, action)     => api.patch(`/student/help-requests/${id}/respond`, { action }),
  getQuestions:        (params)         => api.get('/student/questions', { params }),
  createQuestion:      (data)           => api.post('/student/questions', data),
  getPeers:            ()               => api.get('/student/peers'),
};

export const connectionApi = {
  sendRequest:         (data)           => api.post('/connections/request', data),
  acceptRequest:       (id)             => api.patch(`/connections/${id}/accept`),
  rejectRequest:       (id)             => api.patch(`/connections/${id}/reject`),
  cancelRequest:       (id)             => api.delete(`/connections/${id}/cancel`),
  removeConnection:    (id)             => api.delete(`/connections/${id}`),
  getConnections:      (params)         => api.get('/connections', { params }),
  getRequests:         ()               => api.get('/connections/requests'),
};

export const skillApi = {
  getCatalog:          (params)         => api.get('/skills', { params }),
};

export const communityApi = {
  // Announcements
  getAnnouncements:    (params)         => api.get('/community/announcements', { params }),

  // Q&A
  getQuestions:        (params)         => api.get('/community/questions', { params }),
  createQuestion:      (data)           => api.post('/community/questions', data),
  voteQuestion:        (id)             => api.post(`/community/questions/${id}/vote`),
  getAnswers:          (qId)            => api.get(`/community/questions/${qId}/answers`),
  postAnswer:          (qId, data)      => api.post(`/community/questions/${qId}/answers`, data),
  acceptAnswer:        (qId, aId)       => api.patch(`/community/questions/${qId}/answers/${aId}/accept`),

  // Polls
  getPolls:            ()               => api.get('/community/polls'),
  createPoll:          (data)           => api.post('/community/polls', data),
  votePoll:            (id, optionIndex)=> api.post(`/community/polls/${id}/vote`, { optionIndex }),
};

export const teacherApi = {
  getProfile:          ()               => api.get('/teacher/profile'),
  updateProfile:       (data)           => api.patch('/teacher/profile', data),
  getDashboard:        ()               => api.get('/teacher/dashboard'),
  createAnnouncement:  (data)           => api.post('/teacher/announcements', data),
  getAnnouncements:    ()               => api.get('/teacher/announcements'),
  getEvents:           (params)         => api.get('/teacher/events', { params }),
  getResources:        (params)         => api.get('/teacher/resources', { params }),
  getResourceStats:    ()               => api.get('/teacher/resources/stats'),
};

export const adminApi = {
  getDashboard:        ()                 => api.get('/admin/dashboard'),
  getUsers:            (params)           => api.get('/admin/users', { params }),
  updateStatus:        (id, status, reason)=> api.patch(`/admin/users/${id}/status`, { status, reason }),
  verifyTeacher:       (id)               => api.patch(`/admin/users/${id}/verify`),
  getVerifications:    (params)           => api.get('/admin/verifications', { params }),
  approveVerification: (id, data)         => api.patch(`/admin/verifications/${id}/approve`, data),
  rejectVerification:  (id, data)         => api.patch(`/admin/verifications/${id}/reject`, data),
  getAuditLogs:        (params)           => api.get('/admin/audit-logs', { params }),
  createAdmin:         (data)             => api.post('/admin/create-admin', data),
  createAnnouncement:  (data)             => api.post('/admin/announcements', data),
  getHelpRequests:     (params)           => api.get('/admin/help/requests', { params }),
  getHelpStats:        ()                 => api.get('/admin/help/stats'),
  moderateHelpRequest: (id, data)         => api.patch(`/admin/help/requests/${id}/moderate`, data),
  getEvents:           (params)           => api.get('/admin/events', { params }),
  getEventStats:       ()                 => api.get('/admin/events/stats'),
  moderateEvent:       (id, data)         => api.patch(`/admin/events/${id}/moderate`, data),
  deleteEvent:         (id)               => api.delete(`/admin/events/${id}`),
  getResources:        (params)           => api.get('/admin/resources', { params }),
  getPendingResources: (params)           => api.get('/admin/resources/pending', { params }),
  getResourceStats:    ()                 => api.get('/admin/resources/stats'),
  moderateResource:    (id, data)         => api.patch(`/admin/resources/${id}/moderate`, data),
  deleteResource:      (id)               => api.delete(`/admin/resources/${id}`),
  getAlumni:           (params)           => api.get('/admin/alumni', { params }),
  getAlumniStats:      ()                 => api.get('/admin/alumni/stats'),
  verifyAlumni:        (id, data)         => api.patch(`/admin/alumni/${id}/verify`, data),
  suspendAlumni:       (id, data)         => api.patch(`/admin/alumni/${id}/suspend`, data),
};

export const helpApi = {
  createRequest:       (data)             => api.post('/help/requests', data),
  getRequests:         (params)           => api.get('/help/requests', { params }),
  getRequestById:      (id)               => api.get(`/help/requests/${id}`),
  getNearbyRequests:   (params)           => api.get('/help/nearby', { params }),
  respondToRequest:    (id, data)         => api.post(`/help/requests/${id}/respond`, data),
  selectPrimaryHelper: (id, data)         => api.patch(`/help/requests/${id}/select-helper`, data),
  updateLocation:      (id, data)         => api.patch(`/help/requests/${id}/location`, data),
  getLiveLocation:     (id)               => api.get(`/help/requests/${id}/location`),
  getMessages:         (id)               => api.get(`/help/requests/${id}/messages`),
  sendMessage:         (id, data)         => api.post(`/help/requests/${id}/messages`, data),
  resolveRequest:      (id)               => api.patch(`/help/requests/${id}/resolve`),
  cancelRequest:       (id, data)         => api.delete(`/help/requests/${id}/cancel`, { data }),
  submitFeedback:      (id, data)         => api.post(`/help/requests/${id}/feedback`, data),
  getHistory:          ()                 => api.get('/help/history'),
  updateAvailability:  (data)             => api.patch('/help/availability', data),
};

export const eventsApi = {
  getEvents:           (params)           => api.get('/events', { params }),
  getEventById:        (id)               => api.get(`/events/${id}`),
  createEvent:         (data)             => api.post('/events', data),
  updateEvent:         (id, data)         => api.patch(`/events/${id}`, data),
  deleteEvent:         (id)               => api.delete(`/events/${id}`),
  publishEvent:        (id)               => api.post(`/events/${id}/publish`),
  cancelEvent:         (id, data)         => api.post(`/events/${id}/cancel`, data),
  registerForEvent:    (id, data)         => api.post(`/events/${id}/register`, data),
  cancelRegistration:  (id)               => api.delete(`/events/${id}/register`),
  getMyRegistrations:  (params)           => api.get('/events/my-registrations', { params }),
  getBookmarks:        (params)           => api.get('/events/bookmarks', { params }),
  bookmarkEvent:       (id)               => api.post(`/events/${id}/bookmark`),
  unbookmarkEvent:     (id)               => api.delete(`/events/${id}/bookmark`),
  getParticipants:     (id, params)       => api.get(`/events/${id}/participants`, { params }),
  markAttendance:      (eventId, studentId, data) => api.patch(`/events/${eventId}/participants/${studentId}/attendance`, data),
  getEventStats:       (id)               => api.get(`/events/${id}/stats`),
  getTeacherMyEvents:  (params)           => api.get('/events/teacher/my-events', { params }),
};

export const resourcesApi = {
  getResources:         (params)           => api.get('/resources', { params }),
  getResourceById:      (id)               => api.get(`/resources/${id}`),
  createResource:       (formData)         => api.post('/resources', formData, {
    headers: formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  updateResource:       (id, formData)     => api.patch(`/resources/${id}`, formData, {
    headers: formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  deleteResource:       (id)               => api.delete(`/resources/${id}`),
  submitForReview:      (id)               => api.post(`/resources/${id}/submit-review`),
  publishResource:      (id)               => api.post(`/resources/${id}/publish`),
  archiveResource:      (id)               => api.post(`/resources/${id}/archive`),
  getSavedResources:    (params)           => api.get('/resources/saved', { params }),
  bookmarkResource:     (id)               => api.post(`/resources/${id}/bookmark`),
  unbookmarkResource:   (id)               => api.delete(`/resources/${id}/bookmark`),
  recordView:           (id)               => api.post(`/resources/${id}/view`),
  getDownloadUrl:       (id)               => `${api.defaults.baseURL}/resources/${id}/download`,
  downloadResource:     (id)               => api.get(`/resources/${id}/download`, { responseType: 'blob' }),
  reportResource:       (id, data)         => api.post(`/resources/${id}/report`, data),
};

export const alumniApi = {
  getMyProfile:         ()                 => api.get('/alumni/me'),
  createProfile:        (data)             => api.post('/alumni/profile', data),
  updateProfile:        (data)             => api.patch('/alumni/profile', data),
  submitVerification:   ()                 => api.post('/alumni/verification'),
  getVerificationStatus:()                 => api.get('/alumni/verification/status'),
  discoverAlumni:       (params)           => api.get('/alumni', { params }),
  getAlumniById:        (id)               => api.get(`/alumni/${id}`),
  bookmarkAlumni:       (id)               => api.post(`/alumni/${id}/bookmark`),
  unbookmarkAlumni:     (id)               => api.delete(`/alumni/${id}/bookmark`),
  getSavedAlumni:       (params)           => api.get('/alumni/saved', { params }),
  getAlumniMentorships: (params)           => api.get('/alumni/mentorships', { params }),
};

export const mentorshipApi = {
  createRequest:        (data)             => api.post('/mentorship/requests', data),
  getRequests:          (params)           => api.get('/mentorship/requests', { params }),
  getRequestById:       (id)               => api.get(`/mentorship/requests/${id}`),
  acceptRequest:        (id)               => api.patch(`/mentorship/requests/${id}/accept`),
  declineRequest:       (id, data)         => api.patch(`/mentorship/requests/${id}/decline`, data),
  cancelRequest:        (id, data)         => api.patch(`/mentorship/requests/${id}/cancel`, data),
  startMentorship:      (id)               => api.patch(`/mentorship/requests/${id}/start`),
  completeMentorship:   (id)               => api.patch(`/mentorship/requests/${id}/complete`),
  scheduleSession:      (id, data)         => api.post(`/mentorship/requests/${id}/sessions`, data),
  getSessions:          (id)               => api.get(`/mentorship/requests/${id}/sessions`),
  updateSession:        (sessionId, data)  => api.patch(`/mentorship/sessions/${sessionId}`, data),
  sendMessage:          (id, data)         => api.post(`/mentorship/requests/${id}/messages`, data),
  getMessages:          (id)               => api.get(`/mentorship/requests/${id}/messages`),
  submitFeedback:       (id, data)         => api.post(`/mentorship/requests/${id}/feedback`, data),
};

export const placementsApi = {
  // Stats
  getStats:               ()                => api.get('/placements/stats'),

  // Opportunities
  getOpportunities:       (params)          => api.get('/placements/opportunities', { params }),
  getOpportunityById:     (id)              => api.get(`/placements/opportunities/${id}`),
  createOpportunity:      (data)            => api.post('/placements/opportunities', data),
  updateOpportunity:      (id, data)        => api.patch(`/placements/opportunities/${id}`, data),
  publishOpportunity:     (id)              => api.post(`/placements/opportunities/${id}/publish`),
  closeOpportunity:       (id)              => api.post(`/placements/opportunities/${id}/close`),
  cancelOpportunity:      (id, data)        => api.post(`/placements/opportunities/${id}/cancel`, data),
  applyOpportunity:       (id, data)        => api.post(`/placements/opportunities/${id}/apply`, data),
  withdrawOpportunity:    (id)              => api.delete(`/placements/opportunities/${id}/apply`),
  bookmarkOpportunity:    (id)              => api.post(`/placements/opportunities/${id}/bookmark`),
  unbookmarkOpportunity:  (id)              => api.delete(`/placements/opportunities/${id}/bookmark`),
  getSavedOpportunities:  (params)          => api.get('/placements/saved', { params }),
  reportOpportunity:      (id, data)        => api.post(`/placements/opportunities/${id}/report`, data),

  // Applications
  getApplications:        (params)          => api.get('/placements/applications', { params }),
  getApplicationById:     (id)              => api.get(`/placements/applications/${id}`),
  withdrawApplication:    (id)              => api.post(`/placements/applications/${id}/withdraw`),
  updateApplicationStage: (id, data)        => api.patch(`/placements/applications/${id}/stage`, data),
  shortlistApplication:   (id, data)        => api.patch(`/placements/applications/${id}/shortlist`, data),
  rejectApplication:      (id, data)        => api.patch(`/placements/applications/${id}/reject`, data),
  selectApplication:      (id, data)        => api.patch(`/placements/applications/${id}/select`, data),

  // Interviews
  getInterviews:          (params)          => api.get('/placements/interviews', { params }),
  scheduleInterview:      (data)            => api.post('/placements/interviews', data),
  updateInterview:        (id, data)        => api.patch(`/placements/interviews/${id}`, data),

  // Profile & Resume
  getPlacementProfile:    (params)          => api.get('/placements/profile', { params }),
  updatePlacementProfile: (data)            => api.patch('/placements/profile', data),
  uploadResume:           (formData)        => api.post('/placements/profile/resume', formData, {
    headers: formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  getResumeDownloadUrl:   (filename)        => `${api.defaults.baseURL}/placements/resumes/${filename}`,
  downloadResume:         (filename)        => api.get(`/placements/resumes/${filename}`, { responseType: 'blob' }),

  // Companies
  getCompanies:           (params)          => api.get('/placements/companies', { params }),
  createCompany:          (data)            => api.post('/placements/companies', data),
  verifyCompany:          (id, data)        => api.patch(`/placements/companies/${id}/verify`, data),
};

export const clubsApi = {
  // Discovery & Overview
  getClubs:                  (params)          => api.get('/clubs', { params }),
  getClubById:               (id)              => api.get(`/clubs/${id}`),
  getMyClubs:                ()                => api.get('/clubs/my'),
  createClub:                (data)            => api.post('/clubs', data),
  updateClub:                (id, data)        => api.patch(`/clubs/${id}`, data),

  // Memberships
  joinClub:                  (id)              => api.post(`/clubs/${id}/join`),
  leaveClub:                 (id)              => api.delete(`/clubs/${id}/join`),
  getClubMembers:            (id, params)      => api.get(`/clubs/${id}/members`, { params }),
  getMembershipRequests:     (id)              => api.get(`/clubs/${id}/membership-requests`),
  approveMembershipRequest:  (id)              => api.patch(`/clubs/membership-requests/${id}/approve`),
  rejectMembershipRequest:   (id, data)        => api.patch(`/clubs/membership-requests/${id}/reject`, data),
  suspendMember:             (id, data)        => api.patch(`/clubs/members/${id}/suspend`, data),
  promoteMember:             (id, data)        => api.patch(`/clubs/members/${id}/promote`, data),

  // Leadership & Officers
  getClubLeadership:         (id)              => api.get(`/clubs/${id}/leadership`),
  appointOfficer:            (id, data)        => api.post(`/clubs/${id}/officers`, data),
  removeOfficer:             (id)              => api.delete(`/clubs/officers/${id}`),

  // Announcements
  getAnnouncements:          (id, params)      => api.get(`/clubs/${id}/announcements`, { params }),
  createAnnouncement:        (id, data)        => api.post(`/clubs/${id}/announcements`, data),
  updateAnnouncement:        (id, data)        => api.patch(`/clubs/announcements/${id}`, data),
  deleteAnnouncement:        (id)              => api.delete(`/clubs/announcements/${id}`),

  // Internal Activities
  getActivities:             (id, params)      => api.get(`/clubs/${id}/activities`, { params }),
  createActivity:            (id, data)        => api.post(`/clubs/${id}/activities`, data),
  updateActivity:            (id, data)        => api.patch(`/clubs/activities/${id}`, data),
  deleteActivity:            (id)              => api.delete(`/clubs/activities/${id}`),

  // Elections & Voting
  getElections:              (id, params)      => api.get(`/clubs/${id}/elections`, { params }),
  getElectionById:           (id)              => api.get(`/clubs/elections/${id}`),
  createElection:            (id, data)        => api.post(`/clubs/${id}/elections`, data),
  addElectionPosition:       (electionId, data)=> api.post(`/clubs/elections/${electionId}/positions`, data),
  nominateCandidate:         (positionId, data)=> api.post(`/clubs/elections/positions/${positionId}/nominate`, data),
  approveCandidate:          (candidateId)     => api.patch(`/clubs/elections/candidates/${candidateId}/approve`),
  openElection:              (electionId)      => api.post(`/clubs/elections/${electionId}/open`),
  closeElection:             (electionId)      => api.post(`/clubs/elections/${electionId}/close`),
  publishElectionResults:    (electionId)      => api.post(`/clubs/elections/${electionId}/publish`),
  vote:                      (electionId, data)=> api.post(`/clubs/elections/${electionId}/vote`, data),
  getElectionResults:        (electionId)      => api.get(`/clubs/elections/${electionId}/results`),

  // Moderation Reporting
  reportClub:                (id, data)        => api.post(`/clubs/${id}/report`, data),

  // Admin Controls
  getAdminClubs:             (params)          => api.get('/admin/clubs', { params }),
  getAdminClubAnalytics:     ()                => api.get('/admin/clubs/analytics'),
  approveClub:               (id)              => api.patch(`/admin/clubs/${id}/approve`),
  rejectClub:                (id, data)        => api.patch(`/admin/clubs/${id}/reject`, data),
  suspendClub:               (id, data)        => api.patch(`/admin/clubs/${id}/suspend`, data),
  archiveClub:               (id)              => api.patch(`/admin/clubs/${id}/archive`),
  cancelElectionAdmin:       (id, data)        => api.post(`/admin/clubs/elections/${id}/cancel`, data),
};

export const campusExchangeApi = {
  // Marketplace
  getMarketplaceListings:       (params)           => api.get('/campus-exchange/marketplace', { params }),
  getMarketplaceListingById:   (id)               => api.get(`/campus-exchange/marketplace/${id}`),
  createMarketplaceListing:    (data)             => api.post('/campus-exchange/marketplace', data),
  updateMarketplaceListing:    (id, data)         => api.patch(`/campus-exchange/marketplace/${id}`, data),
  deleteMarketplaceListing:    (id, data)         => api.delete(`/campus-exchange/marketplace/${id}`, { data }),
  bookmarkMarketplaceListing:  (id)               => api.post(`/campus-exchange/marketplace/${id}/bookmark`),
  removeMarketplaceBookmark:   (id)               => api.delete(`/campus-exchange/marketplace/${id}/bookmark`),
  getSavedMarketplaceListings: (params)           => api.get('/campus-exchange/marketplace/saved', { params }),
  getMyMarketplaceListings:    (params)           => api.get('/campus-exchange/marketplace/my-listings', { params }),
  getMyMarketplaceInquiries:   (params)           => api.get('/campus-exchange/marketplace/my-inquiries', { params }),
  createMarketplaceInquiry:    (id, data)         => api.post(`/campus-exchange/marketplace/${id}/inquiries`, data),
  getListingInquiries:         (id)               => api.get(`/campus-exchange/marketplace/${id}/inquiries`),
  respondToInquiry:            (id, data)         => api.patch(`/campus-exchange/marketplace/inquiries/${id}/respond`, data),
  reserveMarketplaceListing:   (id)               => api.patch(`/campus-exchange/marketplace/${id}/reserve`),
  markMarketplaceListingSold:  (id)               => api.patch(`/campus-exchange/marketplace/${id}/sold`),

  // Lost & Found
  getLostFoundItems:           (params)           => api.get('/campus-exchange/lost-found', { params }),
  getLostFoundItemById:        (id)               => api.get(`/campus-exchange/lost-found/${id}`),
  createLostFoundItem:         (data)             => api.post('/campus-exchange/lost-found', data),
  updateLostFoundItem:         (id, data)         => api.patch(`/campus-exchange/lost-found/${id}`, data),
  deleteLostFoundItem:         (id, data)         => api.delete(`/campus-exchange/lost-found/${id}`, { data }),
  createLostFoundClaim:        (id, data)         => api.post(`/campus-exchange/lost-found/${id}/claim`, data),
  getMyLostFoundReports:       (params)           => api.get('/campus-exchange/lost-found/my-reports', { params }),
  getMyLostFoundClaims:        (params)           => api.get('/campus-exchange/lost-found/my-claims', { params }),
  acceptLostFoundClaim:        (id)               => api.patch(`/campus-exchange/lost-found/claims/${id}/accept`),
  rejectLostFoundClaim:        (id, data)         => api.patch(`/campus-exchange/lost-found/claims/${id}/reject`, data),
  markLostFoundResolved:       (id)               => api.patch(`/campus-exchange/lost-found/${id}/resolve`),
  getLostFoundMatches:         (id)               => api.get(`/campus-exchange/lost-found/${id}/matches`),

  // Image Upload
  uploadImage:                 (formData)         => api.post('/campus-exchange/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Reporting
  reportItem:                  (type, id, data)   => api.post(`/campus-exchange/${type}/${id}/report`, data),

  // Admin Moderation & Analytics
  getAdminMarketplace:         (params)           => api.get('/campus-exchange/admin/marketplace', { params }),
  getAdminLostFound:           (params)           => api.get('/campus-exchange/admin/lost-found', { params }),
  adminRemoveMarketplace:      (id, data)         => api.delete(`/campus-exchange/admin/marketplace/${id}`, { data }),
  adminArchiveLostFound:       (id, data)         => api.patch(`/campus-exchange/admin/lost-found/${id}/archive`, data),
  getAdminAnalytics:           ()                 => api.get('/campus-exchange/admin/analytics'),
};


