# UniLink 🎓 — Campus-Focused Digital Ecosystem

> **Learn + Connect + Collaborate + Participate + Help**

UniLink is an integrated digital ecosystem connecting students, teachers, and administrators within a collegiate institution. Built with modern web standards, strict role-based access control (RBAC), and clean design aesthetics.

---

## 🚀 Key Portals & Features

### 1. 🧑‍🎓 Student Portal (`/student`)
* **Learn & Connect Hub**:
  * **Smart Skill Swap**: Algorithmic matching between students based on skills known vs. skills wanted.
  * **Study Circles**: Subject-based peer learning groups (DSA, GATE, GenAI, Web3).
  * **Teammate Finder**: Assemble teams for Smart India Hackathon (SIH), IEEE events, and capstone projects.
  * **Alumni Networking & Mentorship Engine (`/student/mentorship`)**: Discover verified graduates from your college, review industry roles, view deterministic compatibility match scores, send mentorship requests, manage private messaging, schedule 1-on-1 sessions, and award Reputation Karma via 5-star reviews.
  * **Campus Placement & Internship Portal (`/student/placements`)**: Centralized career ecosystem for verified students. Discover campus placement drives & internships, evaluate eligibility server-side in real-time (department, semester, graduation year, CGPA, backlogs, required skills), submit applications with private resume snapshots, track recruitment stages (Applied -> Screening -> Shortlisted -> Assessment -> Interview -> Selected -> Offer Decision), view scheduled technical/HR interviews, save bookmarks, and maintain a private Placement Profile with access-controlled resume hosting.
  * **Campus Clubs, Student Chapters & Societies (`/student/clubs`)**: Discover institutional societies across technical (ACM, IEEE, GDSC), professional, cultural, and sports domains. View society profiles, apply for memberships, cancel pending requests, leave clubs, read pinned bulletins, view member-only activities & official campus events, view officer rosters, cast anonymous encrypted election ballots, and propose new campus societies for admin approval.
  * **Club Leadership Console (`/student/clubs/:id/manage`)**: Dedicated governance console for student presidents, VPs, and officers to review pending applicant rosters, post announcements with member notifications, schedule internal meetings & workshops, appoint officers, initiate elections, review candidates, open ballots, and publish election outcomes.
  * **Resource Vault (`/student/resources`)**: Discover, preview, download, save, and report verified course notes, lab manuals, syllabus archives, and previous year question papers (PYQs) filtered by department, semester, and course code.
* **Help & Emergency SOS (`/student/help`) [Dedicated Core Section]**:
  * **Campus Safety & Rapid Peer Dispatch**: Dedicated emergency assistance platform for medical emergencies, acute injuries, urgent blood requirements, campus safety concerns, vehicle breakdowns, lost credentials, academic emergencies, and travel safety escorts.
  * **GPS Proximity Matching**: Peer discovery engine with live sensor lock and coarse distance badges (`< 1 km`, `< 5 km`) to protect student privacy.
  * **Sub-Section Capabilities**:
    * **Request Help**: Broadcast emergency tickets with urgency levels (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), location consent, and anonymous options.
    * **Nearby Help**: Discover active peer requests in your campus vicinity; volunteer with one-click **"I Can Help"**.
    * **Active Requests**: Private coordination console between requester and selected helper with real-time encrypted messaging and optional live GPS location sharing.
    * **My Requests**: View, resolve, or cancel active tickets with state machine validation (`PENDING` -> `ACCEPTED` -> `ACTIVE` -> `RESOLVED` / `CANCELLED`).
    * **Emergency Services**: Instant telephone trigger to 24/7 verified helplines: National Emergency Helpline (112), Ambulance & Trauma (108), Police Control Room (100), Fire & Rescue (101), Campus Security Gate, Women's Safety Helpline (ICC - 1091), and Mental Health Crisis Hotline.
    * **Help History**: Historical record of assistance requested and volunteer aid provided.
    * **Helper Readiness Toggle**: Students can toggle `Available to Help` status and adjust assistance radius (1–10 km).
  * **Reputation Karma Integration**: Verified helpers receive **+15 Karma Points** upon successful incident resolution and peer 5-star review.
  * **Strict Location Privacy**: Exact coordinates are never broadcast publicly; shared strictly upon mutual consent and automatically wiped from database once resolved or cancelled.
* **Campus Exchange & Lost / Found (`/student/campus-exchange`)**:
  * **Campus Marketplace**: Peer-to-peer classifieds for textbooks, bicycles, calculators, components, and hostel items. Supports ₹0 items formatted as **FREE**, search, category and price filters, condition tags, negotiation indicators, in-app buyer inquiries without exposing personal phone/email, and saved bookmarks.
  * **Lost & Found System**: Report lost belongings or found items across campus locations (Library, Labs, Cafeteria, Parking). Features deterministic matching algorithms, secret verification questions for ownership confirmation without revealing sensitive contents, sanitized sensitive ID numbers, ownership claim reviews, and resolution tracking.
* **Campus Community & Activities**:
  * **Events & Hackathons Hub (`/student/events`)**: Discover, register, waitlist, and bookmark campus hackathons, workshops, cultural fests, sports, seminars, and placement activities (with direct club linkage).
  * **Official Announcements**: Filterable notices categorized into academic, event, placement, and urgent circulars.
  * **Q&A Forum**: Ask and answer academic questions with vote tracking and solved badges.
  * **Interactive Polls**: Campus-wide sentiment analysis and live student voting.
  * **Peer Directory**: Search campus peers by branch, semester, skills, and activities.
* **Messages & Collaboration**:
  * Dedicated peer-to-peer and study group messaging with voice/video call triggers and quick reply shortcuts.
* **Student Profile**:
  * Full academic credentials (USN, department, semester), editable skills tags, and customizable privacy visibility.

---

### 2. 👩‍🏫 Teacher Portal (`/teacher`)
* **Verified Faculty Workspace**:
  * Blue-tinted distinguished branding indicating verified faculty authorization.
  * **Resource Management (`/teacher/resources`)**: Upload course notes, lab manuals, and PYQs with file attachments, draft/review lifecycle, resubmit rejected materials with moderation feedback, and track real-time view & download engagement.
  * **Campus Event Management (`/teacher/events`)**: Create, draft, and publish hackathons and academic workshops with scope targeting, capacity limits, live attendee rosters, and attendance verification (+10 Karma award).
  * **Official Circular Publisher**: Publish department notices with priority pinning and target audience selection.
  * **Faculty Guidance Queue**: Answer pending student academic questions with a verified faculty seal.
  * **Faculty Profile**: Configure designations, research specializations, cabin office locations, and consultation hours.

---

### 3. 🛡️ Admin Portal (`/admin`)
* **Executive Administrative Console**:
  * Dark/Amber command center styling.
  * **Clubs & Societies Moderation (`/admin/clubs`)**: Institutional oversight of all campus societies. Review student club proposals, 1-click approve & activate, reject with mandatory justification, suspend abusive groups, archive defunct clubs, intervene in contested elections, and view live institutional club analytics (distribution by category, department memberships, active election counts).
  * **Campus Exchange & Lost / Found Moderation (`/admin/campus-exchange`)**: Real database analytics for marketplace volume (active, sold, reserved, inquiries, average price, active sellers) and lost & found metrics (total reports, lost vs found, resolved items, open claims). Moderate policy-violating marketplace listings, archive stale lost & found reports, and inspect flagged exchange entries with full audit log trails.
  * **Resource Moderation & Telemetry (`/admin/resources`)**: Institutional academic material oversight, review pending faculty uploads, 1-click approve, reject with mandatory justification, archive, and audit trail logging.
  * **Event Moderation & Telemetry (`/admin/events`)**: Full institutional event oversight, capacity telemetry, audit logs, and one-click moderation (publish, cancel, delete).
  * **Platform Telemetry**: Real-time metrics on active students, faculty count, pending approvals, and suspended users.
  * **Faculty Verification Pipeline**: Instant 1-click review and activation for newly registered teacher accounts.
  * **Placement & TPC Operations (`/admin/placements`)**: Manage company partner registries, verify employer records, configure recruitment drives with rich eligibility rules, track applicant pipelines across recruitment stages, schedule interviews/assessments, record results, and view institutional placement telemetry (department-wise conversions, company hiring distribution, placement rate %).
  * **Alumni Verification & Moderation (`/admin/alumni`)**: Review alumni credentials, 1-click verify, reject with mandatory rationale, suspend abusive mentors, and monitor active mentorship statistics.
  * **Campus Moderation Engine**: User lookup with role & status filtering, account suspension, reactivation, and permanent banning.
  * **Infrastructure Telemetry**: Health checks on database connections, auth engines, and broadcast relays.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Router v7, Zustand (state persistence), Lucide Icons, React Hot Toast |
| **Styling** | Vanilla CSS Design System (CSS Custom Properties, Glassmorphism, Dark/Light theme support) |
| **Backend** | Node.js, Express.js, Sequelize ORM, PostgreSQL |
| **Security** | JSON Web Tokens (Access + Refresh token rotation), bcryptjs password hashing, Helmet, Rate Limiting, RBAC |
| **Integrations**| Firebase Cloud Messaging (FCM) configuration ready |

---

## ⚡ Quickstart Guide

### 1. Prerequisites
* **Node.js** v18+ installed
* **PostgreSQL** instance running (or configure `.env`)

### 2. Backend Setup
```bash
cd backend
npm install

# Copy example environment configuration
cp .env.example .env

# Start development server (Port 5000)
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Start Vite development server (Port 5173)
npm run dev
```

Visit **http://localhost:5173** in your browser.

---

## 📁 Repository Structure

```
UniLink/
├── backend/
│   ├── app.js                      # Express server entry point & middleware pipeline
│   ├── src/
│   │   ├── config/                 # Database (Sequelize) & Firebase configs
│   │   ├── controllers/            # Controller business logic
│   │   ├── middleware/             # JWT authentication, RBAC authorization, error handling
│   │   ├── models/                 # Sequelize models (User, StudentProfile, TeacherProfile, HelpRequest, Announcement, Question)
│   │   ├── routes/                 # Express API routes (auth, student, teacher, admin)
│   │   └── utils/                  # Logger, response formatters, JWT tokens
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                    # Axios API client with automatic JWT token refresh
│   │   ├── components/layout/      # StudentLayout, TeacherLayout, AdminLayout, ProtectedRoute, RoleGuard
│   │   ├── pages/
│   │   │   ├── auth/               # LoginPage, StudentRegister, TeacherRegister
│   │   │   ├── student/            # StudentDashboard, StudentProfile, LearnConnect, Community, HelpEmergency, Messages
│   │   │   ├── teacher/            # TeacherDashboard, TeacherProfile
│   │   │   └── admin/              # AdminDashboard, AdminUsers
│   │   ├── store/                  # Zustand authentication store
│   │   ├── index.css               # UniLink design system tokens & utility classes
│   │   └── App.jsx                 # Route definitions and role-based route guarding
│   └── package.json
│
└── docs/
    └── ARCHITECTURE.md             # System architecture & database schemas
```

---

## 🔒 Default Role Routing

| Role | Landing Route |
| :--- | :--- |
| `student` | `/student` |
| `teacher` | `/teacher` |
| `admin` | `/admin` |
