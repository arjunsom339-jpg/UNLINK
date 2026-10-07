'use strict';

/**
 * MODELS INDEX
 * Central registry for all database models and associations.
 */

const { sequelize } = require('../config/database');

// ── Model Imports ──────────────────────────────────────────────────────────
const College             = require('./College');
const Department          = require('./Department');
const User                = require('./User');
const StudentProfile      = require('./StudentProfile');
const TeacherProfile      = require('./TeacherProfile');
const VerificationRequest = require('./VerificationRequest');
const RefreshToken        = require('./RefreshToken');
const AuditLog            = require('./AuditLog');
const HelpRequest         = require('./HelpRequest');
const Announcement        = require('./Announcement');
const Connection          = require('./Connection');
const Question            = require('./Question');
const Skill               = require('./Skill');
const StudentSkill        = require('./StudentSkill');
const Project             = require('./Project');
const ProjectMember       = require('./ProjectMember');
const Hackathon           = require('./Hackathon');
const HackathonMember     = require('./HackathonMember');
const ReputationLog       = require('./ReputationLog');
const Answer              = require('./Answer');
const Poll                = require('./Poll');
const PollVote            = require('./PollVote');
const QuestionVote        = require('./QuestionVote');
const Block               = require('./Block');
const Report              = require('./Report');
const HelpResponder       = require('./HelpResponder');
const HelpMessage         = require('./HelpMessage');
const HelpFeedback        = require('./HelpFeedback');
const Event               = require('./Event');
const EventRegistration   = require('./EventRegistration');
const EventBookmark       = require('./EventBookmark');
const Notification        = require('./Notification');
const Resource            = require('./Resource');
const ResourceBookmark    = require('./ResourceBookmark');
const AlumniProfile       = require('./AlumniProfile');
const MentorshipRequest   = require('./MentorshipRequest');
const MentorshipSession   = require('./MentorshipSession');
const MentorshipFeedback  = require('./MentorshipFeedback');
const MentorshipMessage   = require('./MentorshipMessage');
const AlumniBookmark      = require('./AlumniBookmark');
const Company             = require('./Company');
const Opportunity         = require('./Opportunity');
const OpportunityApplication = require('./OpportunityApplication');
const OpportunityBookmark = require('./OpportunityBookmark');
const PlacementInterview  = require('./PlacementInterview');
const PlacementProfile    = require('./PlacementProfile');
const Club                = require('./Club');
const ClubMembership      = require('./ClubMembership');
const ClubOfficer         = require('./ClubOfficer');
const ClubAnnouncement    = require('./ClubAnnouncement');
const ClubActivity        = require('./ClubActivity');
const ClubElection        = require('./ClubElection');
const ClubElectionPosition = require('./ClubElectionPosition');
const ClubCandidate       = require('./ClubCandidate');
const ClubVote            = require('./ClubVote');
const LostFoundItem        = require('./LostFoundItem');
const LostFoundClaim       = require('./LostFoundClaim');
const MarketplaceListing   = require('./MarketplaceListing');
const MarketplaceInquiry   = require('./MarketplaceInquiry');
const MarketplaceBookmark  = require('./MarketplaceBookmark');


// ── Associations ───────────────────────────────────────────────────────────

// 1. College <-> Department (1:M)
College.hasMany(Department, { foreignKey: 'collegeId', as: 'departments' });
Department.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

// 2. College <-> User (1:M)
College.hasMany(User, { foreignKey: 'collegeId', as: 'users' });
User.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

// 3. User <-> StudentProfile (1:1)
User.hasOne(StudentProfile, { foreignKey: 'userId', as: 'studentProfile', onDelete: 'CASCADE' });
StudentProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 4. User <-> TeacherProfile (1:1)
User.hasOne(TeacherProfile, { foreignKey: 'userId', as: 'teacherProfile', onDelete: 'CASCADE' });
TeacherProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 5. College <-> StudentProfile / TeacherProfile (1:M)
College.hasMany(StudentProfile, { foreignKey: 'collegeId', as: 'students' });
StudentProfile.belongsTo(College, { foreignKey: 'collegeId', as: 'collegeRef' });

College.hasMany(TeacherProfile, { foreignKey: 'collegeId', as: 'teachers' });
TeacherProfile.belongsTo(College, { foreignKey: 'collegeId', as: 'collegeRef' });

// 6. Department <-> StudentProfile / TeacherProfile (1:M)
Department.hasMany(StudentProfile, { foreignKey: 'departmentId', as: 'students' });
StudentProfile.belongsTo(Department, { foreignKey: 'departmentId', as: 'departmentRef' });

Department.hasMany(TeacherProfile, { foreignKey: 'departmentId', as: 'teachers' });
TeacherProfile.belongsTo(Department, { foreignKey: 'departmentId', as: 'departmentRef' });

// 7. User <-> VerificationRequest
User.hasMany(VerificationRequest, { foreignKey: 'userId', as: 'verificationsSubmitted' });
VerificationRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(VerificationRequest, { foreignKey: 'reviewedById', as: 'verificationsReviewed' });
VerificationRequest.belongsTo(User, { foreignKey: 'reviewedById', as: 'reviewer' });

// 8. User <-> RefreshToken (1:M)
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 9. User <-> AuditLog (1:M)
User.hasMany(AuditLog, { foreignKey: 'actorId', as: 'actionsInitiated' });
AuditLog.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

User.hasMany(AuditLog, { foreignKey: 'targetUserId', as: 'actionsTargeted' });
AuditLog.belongsTo(User, { foreignKey: 'targetUserId', as: 'targetUser' });

// 10. HelpRequest & Emergency Associations
User.hasMany(HelpRequest, { foreignKey: 'requesterId', as: 'helpRequestsMade' });
HelpRequest.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });

User.hasMany(HelpRequest, { foreignKey: 'helperId', as: 'helpRequestsAssisted' });
HelpRequest.belongsTo(User, { foreignKey: 'helperId', as: 'helper' });

User.hasMany(HelpRequest, { foreignKey: 'resolvedById', as: 'helpRequestsResolved' });
HelpRequest.belongsTo(User, { foreignKey: 'resolvedById', as: 'resolver' });

HelpRequest.hasMany(HelpResponder, { foreignKey: 'helpRequestId', as: 'responders', onDelete: 'CASCADE' });
HelpResponder.belongsTo(HelpRequest, { foreignKey: 'helpRequestId', as: 'helpRequest' });

User.hasMany(HelpResponder, { foreignKey: 'userId', as: 'helpResponsesOffered', onDelete: 'CASCADE' });
HelpResponder.belongsTo(User, { foreignKey: 'userId', as: 'responder' });

HelpRequest.hasMany(HelpMessage, { foreignKey: 'helpRequestId', as: 'messages', onDelete: 'CASCADE' });
HelpMessage.belongsTo(HelpRequest, { foreignKey: 'helpRequestId', as: 'helpRequest' });

User.hasMany(HelpMessage, { foreignKey: 'senderId', as: 'helpMessagesSent', onDelete: 'CASCADE' });
HelpMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

HelpRequest.hasOne(HelpFeedback, { foreignKey: 'helpRequestId', as: 'feedback', onDelete: 'CASCADE' });
HelpFeedback.belongsTo(HelpRequest, { foreignKey: 'helpRequestId', as: 'helpRequest' });

User.hasMany(HelpFeedback, { foreignKey: 'reviewerId', as: 'helpReviewsGiven', onDelete: 'CASCADE' });
HelpFeedback.belongsTo(User, { foreignKey: 'reviewerId', as: 'reviewer' });

User.hasMany(HelpFeedback, { foreignKey: 'helperId', as: 'helpReviewsReceived', onDelete: 'CASCADE' });
HelpFeedback.belongsTo(User, { foreignKey: 'helperId', as: 'helper' });

// 11. Announcement Associations
User.hasMany(Announcement, { foreignKey: 'authorId', as: 'announcements' });
Announcement.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

// 12. Connection Associations
User.hasMany(Connection, { foreignKey: 'requesterId', as: 'connectionsSent' });
User.hasMany(Connection, { foreignKey: 'receiverId', as: 'connectionsReceived' });
Connection.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });
Connection.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

// 13. Question Associations
User.hasMany(Question, { foreignKey: 'authorId', as: 'questions' });
Question.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

// 13b. Answer Associations
Question.hasMany(Answer, { foreignKey: 'questionId', as: 'answers', onDelete: 'CASCADE' });
Answer.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });

User.hasMany(Answer, { foreignKey: 'authorId', as: 'answers' });
Answer.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

// 13c. QuestionVote Associations
Question.hasMany(QuestionVote, { foreignKey: 'questionId', as: 'votes', onDelete: 'CASCADE' });
QuestionVote.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });

User.hasMany(QuestionVote, { foreignKey: 'userId', as: 'questionVotes', onDelete: 'CASCADE' });
QuestionVote.belongsTo(User, { foreignKey: 'userId', as: 'voter' });

// 13d. Poll & PollVote Associations
User.hasMany(Poll, { foreignKey: 'authorId', as: 'polls' });
Poll.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

Poll.hasMany(PollVote, { foreignKey: 'pollId', as: 'pollVotes', onDelete: 'CASCADE' });
PollVote.belongsTo(Poll, { foreignKey: 'pollId', as: 'poll' });

User.hasMany(PollVote, { foreignKey: 'userId', as: 'pollVotes', onDelete: 'CASCADE' });
PollVote.belongsTo(User, { foreignKey: 'userId', as: 'voter' });

// 14. Skill & StudentSkill Associations
StudentProfile.hasMany(StudentSkill, { foreignKey: 'studentProfileId', as: 'studentSkills', onDelete: 'CASCADE' });
StudentSkill.belongsTo(StudentProfile, { foreignKey: 'studentProfileId', as: 'studentProfile' });

Skill.hasMany(StudentSkill, { foreignKey: 'skillId', as: 'studentSkills', onDelete: 'CASCADE' });
StudentSkill.belongsTo(Skill, { foreignKey: 'skillId', as: 'skill' });

// 15. Project & ProjectMember Associations
User.hasMany(Project, { foreignKey: 'creatorId', as: 'createdProjects', onDelete: 'CASCADE' });
Project.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

College.hasMany(Project, { foreignKey: 'collegeId', as: 'projects' });
Project.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

Project.hasMany(ProjectMember, { foreignKey: 'projectId', as: 'members', onDelete: 'CASCADE' });
ProjectMember.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

User.hasMany(ProjectMember, { foreignKey: 'userId', as: 'projectMemberships', onDelete: 'CASCADE' });
ProjectMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 16. Hackathon & HackathonMember Associations
User.hasMany(Hackathon, { foreignKey: 'creatorId', as: 'createdHackathons', onDelete: 'CASCADE' });
Hackathon.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

College.hasMany(Hackathon, { foreignKey: 'collegeId', as: 'hackathons' });
Hackathon.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

Hackathon.hasMany(HackathonMember, { foreignKey: 'hackathonId', as: 'members', onDelete: 'CASCADE' });
HackathonMember.belongsTo(Hackathon, { foreignKey: 'hackathonId', as: 'hackathon' });

User.hasMany(HackathonMember, { foreignKey: 'userId', as: 'hackathonMemberships', onDelete: 'CASCADE' });
HackathonMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 17. ReputationLog Associations
User.hasMany(ReputationLog, { foreignKey: 'userId', as: 'reputationLogs', onDelete: 'CASCADE' });
ReputationLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ReputationLog, { foreignKey: 'actorId', as: 'endorsedReputations' });
ReputationLog.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

// 18. Block Associations
User.hasMany(Block, { foreignKey: 'blockerId', as: 'blocksInitiated', onDelete: 'CASCADE' });
User.hasMany(Block, { foreignKey: 'blockedId', as: 'blocksReceived', onDelete: 'CASCADE' });
Block.belongsTo(User, { foreignKey: 'blockerId', as: 'blocker' });
Block.belongsTo(User, { foreignKey: 'blockedId', as: 'blockedUser' });

// 19. Report Associations
User.hasMany(Report, { foreignKey: 'reporterId', as: 'reportsSubmitted', onDelete: 'CASCADE' });
User.hasMany(Report, { foreignKey: 'reportedUserId', as: 'reportsReceived', onDelete: 'CASCADE' });
Report.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
Report.belongsTo(User, { foreignKey: 'reportedUserId', as: 'reportedUser' });
Report.belongsTo(User, { foreignKey: 'reviewedById', as: 'reviewer' });

// 20. Event & Campus Activities Associations
College.hasMany(Event, { foreignKey: 'collegeId', as: 'events', onDelete: 'CASCADE' });
Event.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

User.hasMany(Event, { foreignKey: 'createdBy', as: 'createdEvents', onDelete: 'CASCADE' });
Event.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Department.hasMany(Event, { foreignKey: 'departmentId', as: 'events', onDelete: 'SET NULL' });
Event.belongsTo(Department, { foreignKey: 'departmentId', as: 'targetDepartment' });

Event.hasMany(EventRegistration, { foreignKey: 'eventId', as: 'registrations', onDelete: 'CASCADE' });
EventRegistration.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

User.hasMany(EventRegistration, { foreignKey: 'studentId', as: 'eventRegistrations', onDelete: 'CASCADE' });
EventRegistration.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

Event.hasMany(EventBookmark, { foreignKey: 'eventId', as: 'bookmarks', onDelete: 'CASCADE' });
EventBookmark.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

User.hasMany(EventBookmark, { foreignKey: 'userId', as: 'eventBookmarks', onDelete: 'CASCADE' });
EventBookmark.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 21. Notification Associations
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 22. Resource & Academic Repository Associations
College.hasMany(Resource, { foreignKey: 'collegeId', as: 'resources', onDelete: 'CASCADE' });
Resource.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

User.hasMany(Resource, { foreignKey: 'uploadedBy', as: 'uploadedResources', onDelete: 'CASCADE' });
Resource.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

Department.hasMany(Resource, { foreignKey: 'departmentId', as: 'resources', onDelete: 'SET NULL' });
Resource.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

User.hasMany(Resource, { foreignKey: 'moderatedById', as: 'moderatedResources', onDelete: 'SET NULL' });
Resource.belongsTo(User, { foreignKey: 'moderatedById', as: 'moderator' });

Resource.hasMany(ResourceBookmark, { foreignKey: 'resourceId', as: 'bookmarks', onDelete: 'CASCADE' });
ResourceBookmark.belongsTo(Resource, { foreignKey: 'resourceId', as: 'resource' });

User.hasMany(ResourceBookmark, { foreignKey: 'studentId', as: 'savedResources', onDelete: 'CASCADE' });
ResourceBookmark.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

Resource.hasMany(Report, { foreignKey: 'resourceId', as: 'reports', onDelete: 'CASCADE' });
Report.belongsTo(Resource, { foreignKey: 'resourceId', as: 'resource' });

// 23. Alumni & Mentorship Engine Associations
// AlumniProfile
User.hasOne(AlumniProfile, { foreignKey: 'userId', as: 'alumniProfile', onDelete: 'CASCADE' });
AlumniProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

College.hasMany(AlumniProfile, { foreignKey: 'collegeId', as: 'alumni', onDelete: 'CASCADE' });
AlumniProfile.belongsTo(College, { foreignKey: 'collegeId', as: 'collegeRef' });

Department.hasMany(AlumniProfile, { foreignKey: 'departmentId', as: 'alumni', onDelete: 'SET NULL' });
AlumniProfile.belongsTo(Department, { foreignKey: 'departmentId', as: 'departmentRef' });

AlumniProfile.belongsTo(User, { foreignKey: 'verifiedById', as: 'verifiedByAdmin' });

// MentorshipRequest
User.hasMany(MentorshipRequest, { foreignKey: 'studentId', as: 'mentorshipRequestsSent', onDelete: 'CASCADE' });
MentorshipRequest.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

User.hasMany(MentorshipRequest, { foreignKey: 'alumniId', as: 'mentorshipRequestsReceived', onDelete: 'CASCADE' });
MentorshipRequest.belongsTo(User, { foreignKey: 'alumniId', as: 'alumnus' });

AlumniProfile.hasMany(MentorshipRequest, { foreignKey: 'alumniProfileId', as: 'mentorshipRequests', onDelete: 'CASCADE' });
MentorshipRequest.belongsTo(AlumniProfile, { foreignKey: 'alumniProfileId', as: 'alumniProfile' });

College.hasMany(MentorshipRequest, { foreignKey: 'collegeId', as: 'mentorshipRequests', onDelete: 'CASCADE' });
MentorshipRequest.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

// MentorshipSession
MentorshipRequest.hasMany(MentorshipSession, { foreignKey: 'mentorshipRequestId', as: 'sessions', onDelete: 'CASCADE' });
MentorshipSession.belongsTo(MentorshipRequest, { foreignKey: 'mentorshipRequestId', as: 'mentorshipRequest' });

User.hasMany(MentorshipSession, { foreignKey: 'createdBy', as: 'sessionsCreated', onDelete: 'CASCADE' });
MentorshipSession.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// MentorshipFeedback
MentorshipRequest.hasMany(MentorshipFeedback, { foreignKey: 'mentorshipRequestId', as: 'feedbacks', onDelete: 'CASCADE' });
MentorshipFeedback.belongsTo(MentorshipRequest, { foreignKey: 'mentorshipRequestId', as: 'mentorshipRequest' });

User.hasMany(MentorshipFeedback, { foreignKey: 'reviewerId', as: 'feedbacksGiven', onDelete: 'CASCADE' });
MentorshipFeedback.belongsTo(User, { foreignKey: 'reviewerId', as: 'reviewer' });

User.hasMany(MentorshipFeedback, { foreignKey: 'targetUserId', as: 'feedbacksReceived', onDelete: 'CASCADE' });
MentorshipFeedback.belongsTo(User, { foreignKey: 'targetUserId', as: 'targetUser' });

// MentorshipMessage
MentorshipRequest.hasMany(MentorshipMessage, { foreignKey: 'mentorshipRequestId', as: 'messages', onDelete: 'CASCADE' });
MentorshipMessage.belongsTo(MentorshipRequest, { foreignKey: 'mentorshipRequestId', as: 'mentorshipRequest' });

User.hasMany(MentorshipMessage, { foreignKey: 'senderId', as: 'mentorshipMessagesSent', onDelete: 'CASCADE' });
MentorshipMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// AlumniBookmark
User.hasMany(AlumniBookmark, { foreignKey: 'studentId', as: 'alumniBookmarks', onDelete: 'CASCADE' });
AlumniBookmark.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

AlumniProfile.hasMany(AlumniBookmark, { foreignKey: 'alumniProfileId', as: 'bookmarks', onDelete: 'CASCADE' });
AlumniBookmark.belongsTo(AlumniProfile, { foreignKey: 'alumniProfileId', as: 'alumniProfile' });

// ── Placement Portal (TPC) Associations ────────────────────────────────────

// Company <-> College & User
College.hasMany(Company, { foreignKey: 'collegeId', as: 'companies' });
Company.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

User.hasMany(Company, { foreignKey: 'verifiedById', as: 'companiesVerified' });
Company.belongsTo(User, { foreignKey: 'verifiedById', as: 'verifier' });

// Opportunity <-> College, User & Company
College.hasMany(Opportunity, { foreignKey: 'collegeId', as: 'opportunities' });
Opportunity.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

User.hasMany(Opportunity, { foreignKey: 'createdBy', as: 'opportunitiesCreated' });
Opportunity.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Company.hasMany(Opportunity, { foreignKey: 'companyId', as: 'opportunities' });
Opportunity.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

// OpportunityApplication <-> College, User & Opportunity
College.hasMany(OpportunityApplication, { foreignKey: 'collegeId', as: 'opportunityApplications' });
OpportunityApplication.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

User.hasMany(OpportunityApplication, { foreignKey: 'studentId', as: 'jobApplications', onDelete: 'CASCADE' });
OpportunityApplication.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

Opportunity.hasMany(OpportunityApplication, { foreignKey: 'opportunityId', as: 'applications', onDelete: 'CASCADE' });
OpportunityApplication.belongsTo(Opportunity, { foreignKey: 'opportunityId', as: 'opportunity' });

// OpportunityBookmark <-> User & Opportunity
User.hasMany(OpportunityBookmark, { foreignKey: 'studentId', as: 'opportunityBookmarks', onDelete: 'CASCADE' });
OpportunityBookmark.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

Opportunity.hasMany(OpportunityBookmark, { foreignKey: 'opportunityId', as: 'bookmarks', onDelete: 'CASCADE' });
OpportunityBookmark.belongsTo(Opportunity, { foreignKey: 'opportunityId', as: 'opportunity' });

// PlacementInterview <-> Application, Opportunity, User, College
OpportunityApplication.hasMany(PlacementInterview, { foreignKey: 'applicationId', as: 'interviews', onDelete: 'CASCADE' });
PlacementInterview.belongsTo(OpportunityApplication, { foreignKey: 'applicationId', as: 'application' });

Opportunity.hasMany(PlacementInterview, { foreignKey: 'opportunityId', as: 'interviews', onDelete: 'CASCADE' });
PlacementInterview.belongsTo(Opportunity, { foreignKey: 'opportunityId', as: 'opportunity' });

User.hasMany(PlacementInterview, { foreignKey: 'studentId', as: 'placementInterviews', onDelete: 'CASCADE' });
PlacementInterview.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

College.hasMany(PlacementInterview, { foreignKey: 'collegeId', as: 'placementInterviews' });
PlacementInterview.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

// PlacementProfile <-> User & College
User.hasOne(PlacementProfile, { foreignKey: 'userId', as: 'placementProfile', onDelete: 'CASCADE' });
PlacementProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

College.hasMany(PlacementProfile, { foreignKey: 'collegeId', as: 'placementProfiles' });
PlacementProfile.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

// Opportunity <-> Report
Opportunity.hasMany(Report, { foreignKey: 'opportunityId', as: 'reports', onDelete: 'CASCADE' });
Report.belongsTo(Opportunity, { foreignKey: 'opportunityId', as: 'opportunity' });

// ── Club & Societies Associations ──────────────────────────────────────────

// Club <-> College & Department & User
College.hasMany(Club, { foreignKey: 'collegeId', as: 'clubs', onDelete: 'CASCADE' });
Club.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

Department.hasMany(Club, { foreignKey: 'departmentId', as: 'clubs', onDelete: 'SET NULL' });
Club.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

User.hasMany(Club, { foreignKey: 'createdBy', as: 'createdClubs', onDelete: 'CASCADE' });
Club.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(Club, { foreignKey: 'facultyAdvisorId', as: 'advisedClubs', onDelete: 'SET NULL' });
Club.belongsTo(User, { foreignKey: 'facultyAdvisorId', as: 'facultyAdvisor' });

// Club <-> ClubMembership
Club.hasMany(ClubMembership, { foreignKey: 'clubId', as: 'memberships', onDelete: 'CASCADE' });
ClubMembership.belongsTo(Club, { foreignKey: 'clubId', as: 'club' });

User.hasMany(ClubMembership, { foreignKey: 'studentId', as: 'clubMemberships', onDelete: 'CASCADE' });
ClubMembership.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

User.hasMany(ClubMembership, { foreignKey: 'approvedBy', as: 'approvedMemberships', onDelete: 'SET NULL' });
ClubMembership.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// Club <-> ClubOfficer
Club.hasMany(ClubOfficer, { foreignKey: 'clubId', as: 'officers', onDelete: 'CASCADE' });
ClubOfficer.belongsTo(Club, { foreignKey: 'clubId', as: 'club' });

User.hasMany(ClubOfficer, { foreignKey: 'studentId', as: 'officerPositions', onDelete: 'CASCADE' });
ClubOfficer.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

User.hasMany(ClubOfficer, { foreignKey: 'appointedBy', as: 'appointedOfficers', onDelete: 'SET NULL' });
ClubOfficer.belongsTo(User, { foreignKey: 'appointedBy', as: 'appointedByUser' });

// Club <-> ClubAnnouncement
Club.hasMany(ClubAnnouncement, { foreignKey: 'clubId', as: 'announcements', onDelete: 'CASCADE' });
ClubAnnouncement.belongsTo(Club, { foreignKey: 'clubId', as: 'club' });

User.hasMany(ClubAnnouncement, { foreignKey: 'authorId', as: 'clubAnnouncements', onDelete: 'CASCADE' });
ClubAnnouncement.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

// Club <-> ClubActivity
Club.hasMany(ClubActivity, { foreignKey: 'clubId', as: 'activities', onDelete: 'CASCADE' });
ClubActivity.belongsTo(Club, { foreignKey: 'clubId', as: 'club' });

User.hasMany(ClubActivity, { foreignKey: 'createdBy', as: 'createdClubActivities', onDelete: 'CASCADE' });
ClubActivity.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Club <-> ClubElection
Club.hasMany(ClubElection, { foreignKey: 'clubId', as: 'elections', onDelete: 'CASCADE' });
ClubElection.belongsTo(Club, { foreignKey: 'clubId', as: 'club' });

User.hasMany(ClubElection, { foreignKey: 'createdBy', as: 'createdElections', onDelete: 'CASCADE' });
ClubElection.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// ClubElection <-> ClubElectionPosition
ClubElection.hasMany(ClubElectionPosition, { foreignKey: 'electionId', as: 'positions', onDelete: 'CASCADE' });
ClubElectionPosition.belongsTo(ClubElection, { foreignKey: 'electionId', as: 'election' });

// ClubElectionPosition <-> ClubCandidate
ClubElectionPosition.hasMany(ClubCandidate, { foreignKey: 'electionPositionId', as: 'candidates', onDelete: 'CASCADE' });
ClubCandidate.belongsTo(ClubElectionPosition, { foreignKey: 'electionPositionId', as: 'position' });

User.hasMany(ClubCandidate, { foreignKey: 'studentId', as: 'clubCandidacies', onDelete: 'CASCADE' });
ClubCandidate.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

User.hasMany(ClubCandidate, { foreignKey: 'approvedBy', as: 'approvedCandidates', onDelete: 'SET NULL' });
ClubCandidate.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// ClubElection & ClubElectionPosition & ClubCandidate <-> ClubVote
ClubElection.hasMany(ClubVote, { foreignKey: 'electionId', as: 'votes', onDelete: 'CASCADE' });
ClubVote.belongsTo(ClubElection, { foreignKey: 'electionId', as: 'election' });

ClubElectionPosition.hasMany(ClubVote, { foreignKey: 'positionId', as: 'votes', onDelete: 'CASCADE' });
ClubVote.belongsTo(ClubElectionPosition, { foreignKey: 'positionId', as: 'position' });

ClubCandidate.hasMany(ClubVote, { foreignKey: 'candidateId', as: 'votes', onDelete: 'CASCADE' });
ClubVote.belongsTo(ClubCandidate, { foreignKey: 'candidateId', as: 'candidate' });

User.hasMany(ClubVote, { foreignKey: 'voterStudentId', as: 'castClubVotes', onDelete: 'CASCADE' });
ClubVote.belongsTo(User, { foreignKey: 'voterStudentId', as: 'voter' });

// Club <-> Event
Club.hasMany(Event, { foreignKey: 'clubId', as: 'events', onDelete: 'SET NULL' });
Event.belongsTo(Club, { foreignKey: 'clubId', as: 'club' });

// Club <-> Report
Club.hasMany(Report, { foreignKey: 'clubId', as: 'reports', onDelete: 'CASCADE' });
Report.belongsTo(Club, { foreignKey: 'clubId', as: 'club' });

// ── Lost & Found Associations ───────────────────────────────────────────────
College.hasMany(LostFoundItem, { foreignKey: 'collegeId', as: 'lostFoundItems', onDelete: 'CASCADE' });
LostFoundItem.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

User.hasMany(LostFoundItem, { foreignKey: 'reporterId', as: 'reportedLostFoundItems', onDelete: 'CASCADE' });
LostFoundItem.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
LostFoundItem.belongsTo(User, { foreignKey: 'resolvedBy', as: 'resolver' });

LostFoundItem.hasMany(LostFoundClaim, { foreignKey: 'itemId', as: 'claims', onDelete: 'CASCADE' });
LostFoundClaim.belongsTo(LostFoundItem, { foreignKey: 'itemId', as: 'item' });

User.hasMany(LostFoundClaim, { foreignKey: 'claimantId', as: 'lostFoundClaims', onDelete: 'CASCADE' });
LostFoundClaim.belongsTo(User, { foreignKey: 'claimantId', as: 'claimant' });

LostFoundItem.hasMany(Report, { foreignKey: 'lostFoundItemId', as: 'reports', onDelete: 'CASCADE' });
Report.belongsTo(LostFoundItem, { foreignKey: 'lostFoundItemId', as: 'lostFoundItem' });

// ── Campus Marketplace Associations ─────────────────────────────────────────
College.hasMany(MarketplaceListing, { foreignKey: 'collegeId', as: 'marketplaceListings', onDelete: 'CASCADE' });
MarketplaceListing.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

User.hasMany(MarketplaceListing, { foreignKey: 'sellerId', as: 'marketplaceListings', onDelete: 'CASCADE' });
MarketplaceListing.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

MarketplaceListing.hasMany(MarketplaceInquiry, { foreignKey: 'listingId', as: 'inquiries', onDelete: 'CASCADE' });
MarketplaceInquiry.belongsTo(MarketplaceListing, { foreignKey: 'listingId', as: 'listing' });

User.hasMany(MarketplaceInquiry, { foreignKey: 'buyerId', as: 'sentMarketplaceInquiries', onDelete: 'CASCADE' });
MarketplaceInquiry.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });

MarketplaceListing.hasMany(MarketplaceBookmark, { foreignKey: 'listingId', as: 'bookmarks', onDelete: 'CASCADE' });
MarketplaceBookmark.belongsTo(MarketplaceListing, { foreignKey: 'listingId', as: 'listing' });

User.hasMany(MarketplaceBookmark, { foreignKey: 'userId', as: 'marketplaceBookmarks', onDelete: 'CASCADE' });
MarketplaceBookmark.belongsTo(User, { foreignKey: 'userId', as: 'user' });

MarketplaceListing.hasMany(Report, { foreignKey: 'marketplaceListingId', as: 'reports', onDelete: 'CASCADE' });
Report.belongsTo(MarketplaceListing, { foreignKey: 'marketplaceListingId', as: 'marketplaceListing' });

module.exports = {
  sequelize,
  College,
  Department,
  User,
  StudentProfile,
  TeacherProfile,
  VerificationRequest,
  RefreshToken,
  AuditLog,
  HelpRequest,
  Announcement,
  Connection,
  Question,
  Answer,
  QuestionVote,
  Poll,
  PollVote,
  Skill,
  StudentSkill,
  Project,
  ProjectMember,
  Hackathon,
  HackathonMember,
  ReputationLog,
  Block,
  Report,
  HelpResponder,
  HelpMessage,
  HelpFeedback,
  Event,
  EventRegistration,
  EventBookmark,
  Notification,
  Resource,
  ResourceBookmark,
  AlumniProfile,
  MentorshipRequest,
  MentorshipSession,
  MentorshipFeedback,
  MentorshipMessage,
  AlumniBookmark,
  Company,
  Opportunity,
  OpportunityApplication,
  OpportunityBookmark,
  PlacementInterview,
  PlacementProfile,
  Club,
  ClubMembership,
  ClubOfficer,
  ClubAnnouncement,
  ClubActivity,
  ClubElection,
  ClubElectionPosition,
  ClubCandidate,
  ClubVote,
  LostFoundItem,
  LostFoundClaim,
  MarketplaceListing,
  MarketplaceInquiry,
  MarketplaceBookmark,
};
