'use strict';

const { Op, fn, col } = require('sequelize');
const {
  sequelize,
  LostFoundItem,
  LostFoundClaim,
  MarketplaceListing,
  MarketplaceInquiry,
  MarketplaceBookmark,
  User,
  StudentProfile,
  TeacherProfile,
  AuditLog,
  Report,
  Notification,
} = require('../models');
const { createNotification } = require('./notificationService');
const { saveExchangeImage, deleteExchangeImage, validateImageFile } = require('./storageService');

/**
 * CAMPUS EXCHANGE SERVICE
 * Provides backend business logic for:
 * 1. Campus Classifieds Marketplace (P2P zero-commission discovery)
 * 2. Campus Lost & Found System (Deterministic matching, ownership verification, privacy preservation)
 * 3. Prohibited item moderation & multi-college isolation
 */

// Helper to include safe user profile info without exposing sensitive contact data
const getSafeUserInclude = (asAlias) => ({
  model: User,
  as: asAlias,
  attributes: ['id', 'email', 'role', 'isAdminVerified', 'isEmailVerified'],
  include: [
    {
      model: StudentProfile,
      as: 'studentProfile',
      attributes: ['fullName', 'department', 'semester'],
      required: false,
    },
    {
      model: TeacherProfile,
      as: 'teacherProfile',
      attributes: ['fullName', 'department', 'designation'],
      required: false,
    },
  ],
});

// Helper to attach virtual name and verification properties for API clients
const formatSafeUser = (userObj) => {
  if (!userObj) return null;
  const raw = typeof userObj.toJSON === 'function' ? userObj.toJSON() : { ...userObj };
  const name =
    raw.studentProfile?.fullName ||
    raw.teacherProfile?.fullName ||
    (raw.email ? raw.email.split('@')[0] : 'Campus Member');
  const isVerified = Boolean(raw.isAdminVerified || raw.isEmailVerified);
  return {
    ...raw,
    name,
    isVerified,
  };
};

// ── 1. PROHIBITED / RESTRICTED CONTENT POLICIES ─────────────────────────────

const PROHIBITED_PATTERNS = [
  {
    category: 'WEAPONS_AND_EXPLOSIVES',
    regex: /\b(weapon|weapons|gun|guns|pistol|rifle|firearm|ammo|ammunition|explosive|explosives|knife|knives|dagger|sword|machete|taser|stun gun)\b/i,
  },
  {
    category: 'DRUGS_AND_CONTROLLED_SUBSTANCES',
    regex: /\b(drug|drugs|weed|cannabis|marijuana|narcotic|narcotics|cocaine|heroin|lsd|meth|methamphetamine|opioid|opioids|prescription drug|adderall|xanax)\b/i,
  },
  {
    category: 'STOLEN_OR_ACADEMIC_DISHONESTY',
    regex: /\b(stolen|counterfeit|fake id|exam leak|exam paper leak|cheat device|pirated software|stolen goods)\b/i,
  },
  {
    category: 'ADULT_AND_EXPLICIT',
    regex: /\b(porn|pornography|adult toy|escort service|prostitution|sex toy)\b/i,
  },
  {
    category: 'HAZARDOUS_SUBSTANCES',
    regex: /\b(hazardous chemical|toxic waste|cyanide|mercury|lethal poison|radioactive)\b/i,
  },
];

/**
 * Validate listing against prohibited campus marketplace goods
 */
const validateMarketplaceListing = ({ title, description, category, price }) => {
  if (!title || !title.trim()) {
    const err = new Error('Listing title is required.');
    err.statusCode = 400;
    throw err;
  }

  if (price !== undefined && price !== null && Number(price) < 0) {
    const err = new Error('Price cannot be negative.');
    err.statusCode = 400;
    throw err;
  }

  const combinedText = `${title} ${description || ''}`;

  for (const policy of PROHIBITED_PATTERNS) {
    if (policy.regex.test(combinedText)) {
      const err = new Error(
        `Listing rejected: Contains prohibited content (${policy.category.toLowerCase().replace(/_/g, ' ')}). Campus policy strictly prohibits this item.`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  return true;
};

// ── 2. CAMPUS MARKETPLACE LISTINGS ──────────────────────────────────────────

/**
 * Get listings with pagination, filters, and college isolation
 */
const getMarketplaceListings = async (user, query = {}) => {
  const {
    q,
    category,
    condition,
    isNegotiable,
    minPrice,
    maxPrice,
    status = 'ACTIVE',
    sort = 'newest',
    page = 1,
    limit = 12,
  } = query;

  const where = {
    collegeId: user.collegeId,
  };

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (category) {
    where.category = category;
  }

  if (condition) {
    where.condition = condition;
  }

  if (isNegotiable !== undefined && isNegotiable !== '') {
    where.isNegotiable = isNegotiable === 'true' || isNegotiable === true;
  }

  if (minPrice !== undefined && minPrice !== '') {
    where.price = { ...(where.price || {}), [Op.gte]: Number(minPrice) };
  }

  if (maxPrice !== undefined && maxPrice !== '') {
    where.price = { ...(where.price || {}), [Op.lte]: Number(maxPrice) };
  }

  if (q && q.trim()) {
    const searchVal = `%${q.trim()}%`;
    where[Op.or] = [
      { title: { [Op.like]: searchVal } },
      { description: { [Op.like]: searchVal } },
      { location: { [Op.like]: searchVal } },
    ];
  }

  let order = [['createdAt', 'DESC']];
  if (sort === 'price_asc') {
    order = [['price', 'ASC']];
  } else if (sort === 'price_desc') {
    order = [['price', 'DESC']];
  } else if (sort === 'oldest') {
    order = [['createdAt', 'ASC']];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const offset = (pageNum - 1) * pageLimit;

  const { count, rows } = await MarketplaceListing.findAndCountAll({
    where,
    include: [getSafeUserInclude('seller')],
    order,
    limit: pageLimit,
    offset,
    distinct: true,
  });

  const formattedRows = rows.map((listing) => {
    const json = listing.toJSON();
    if (json.seller) {
      json.seller = formatSafeUser(json.seller);
    }
    return json;
  });

  return {
    listings: formattedRows,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageLimit),
  };
};

/**
 * Get listing details by ID
 */
const getMarketplaceListingById = async (user, listingId) => {
  const listing = await MarketplaceListing.findOne({
    where: { id: listingId, collegeId: user.collegeId },
    include: [getSafeUserInclude('seller')],
  });

  if (!listing) {
    const err = new Error('Marketplace listing not found.');
    err.statusCode = 404;
    throw err;
  }

  let isBookmarked = false;
  if (user) {
    const bookmark = await MarketplaceBookmark.findOne({
      where: { listingId: listing.id, userId: user.id },
    });
    isBookmarked = !!bookmark;
  }

  const plainListing = listing.toJSON();
  if (plainListing.seller) {
    plainListing.seller = formatSafeUser(plainListing.seller);
  }
  plainListing.isBookmarked = isBookmarked;

  return plainListing;
};

/**
 * Create a new marketplace listing
 */
const createMarketplaceListing = async (user, data) => {
  const {
    category,
    title,
    description,
    price = 0,
    isNegotiable = false,
    condition = 'GOOD',
    location,
    visibility = 'COLLEGE_ONLY',
    images = [],
  } = data;

  validateMarketplaceListing({ title, description, category, price, isNegotiable });

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days logical expiration

  const listing = await MarketplaceListing.create({
    collegeId: user.collegeId,
    sellerId: user.id,
    category: category || 'OTHER',
    title: title.trim(),
    description: description ? description.trim() : '',
    price: Number(price) || 0,
    isNegotiable: Boolean(isNegotiable),
    condition,
    location: location ? location.trim() : null,
    visibility,
    images: Array.isArray(images) ? images : [],
    status: 'ACTIVE',
    expiresAt,
  });

  return listing;
};

/**
 * Update existing marketplace listing (Seller or Admin)
 */
const updateMarketplaceListing = async (user, listingId, data) => {
  const listing = await MarketplaceListing.findOne({
    where: { id: listingId, collegeId: user.collegeId },
  });

  if (!listing) {
    const err = new Error('Marketplace listing not found.');
    err.statusCode = 404;
    throw err;
  }

  if (listing.sellerId !== user.id && user.role !== 'admin') {
    const err = new Error('You do not have permission to modify this listing.');
    err.statusCode = 403;
    throw err;
  }

  const {
    category,
    title,
    description,
    price,
    isNegotiable,
    condition,
    location,
    status,
    images,
  } = data;

  if (title || description || price !== undefined) {
    validateMarketplaceListing({
      title: title || listing.title,
      description: description !== undefined ? description : listing.description,
      category: category || listing.category,
      price: price !== undefined ? price : listing.price,
    });
  }

  await listing.update({
    category: category || listing.category,
    title: title ? title.trim() : listing.title,
    description: description !== undefined ? description.trim() : listing.description,
    price: price !== undefined ? Number(price) : listing.price,
    isNegotiable: isNegotiable !== undefined ? Boolean(isNegotiable) : listing.isNegotiable,
    condition: condition || listing.condition,
    location: location !== undefined ? (location ? location.trim() : null) : listing.location,
    status: status || listing.status,
    images: images !== undefined ? (Array.isArray(images) ? images : []) : listing.images,
  });

  return listing;
};

/**
 * Delete / Remove marketplace listing
 */
const deleteMarketplaceListing = async (user, listingId, reason = '') => {
  const listing = await MarketplaceListing.findOne({
    where: { id: listingId, collegeId: user.collegeId },
  });

  if (!listing) {
    const err = new Error('Marketplace listing not found.');
    err.statusCode = 404;
    throw err;
  }

  if (listing.sellerId !== user.id && user.role !== 'admin') {
    const err = new Error('You do not have permission to delete this listing.');
    err.statusCode = 403;
    throw err;
  }

  const isModeratedByAdmin = user.role === 'admin' && listing.sellerId !== user.id;

  await listing.destroy();

  if (isModeratedByAdmin) {
    await AuditLog.create({
      actorId: user.id,
      targetUserId: listing.sellerId,
      action: 'MARKETPLACE_LISTING_REMOVED',
      category: 'ADMIN_MODERATION',
      details: {
        listingId: listing.id,
        title: listing.title,
        reason: reason || 'Removed by campus administrator for policy violation',
      },
    });

    await createNotification({
      userId: listing.sellerId,
      type: 'MARKETPLACE_REMOVED',
      title: 'Marketplace Listing Removed',
      message: `Your listing "${listing.title}" was removed by campus administration: ${reason || 'Terms violation'}`,
      data: { listingId: listing.id },
    });
  }

  return { success: true, message: 'Listing successfully removed.' };
};

/**
 * Mark listing as RESERVED (Seller only)
 */
const reserveMarketplaceListing = async (user, listingId) => {
  const listing = await MarketplaceListing.findOne({
    where: { id: listingId, collegeId: user.collegeId },
  });

  if (!listing) {
    const err = new Error('Marketplace listing not found.');
    err.statusCode = 404;
    throw err;
  }

  if (listing.sellerId !== user.id && user.role !== 'admin') {
    const err = new Error('Only the seller or admin can mark this listing as reserved.');
    err.statusCode = 403;
    throw err;
  }

  await listing.update({ status: 'RESERVED' });
  return listing;
};

/**
 * Mark listing as SOLD (Seller only)
 */
const markMarketplaceListingSold = async (user, listingId) => {
  const listing = await MarketplaceListing.findOne({
    where: { id: listingId, collegeId: user.collegeId },
  });

  if (!listing) {
    const err = new Error('Marketplace listing not found.');
    err.statusCode = 404;
    throw err;
  }

  if (listing.sellerId !== user.id && user.role !== 'admin') {
    const err = new Error('Only the seller or admin can mark this listing as sold.');
    err.statusCode = 403;
    throw err;
  }

  await listing.update({ status: 'SOLD' });
  return listing;
};

/**
 * Bookmark marketplace listing
 */
const bookmarkMarketplaceListing = async (user, listingId) => {
  const listing = await MarketplaceListing.findOne({
    where: { id: listingId, collegeId: user.collegeId },
  });

  if (!listing) {
    const err = new Error('Marketplace listing not found.');
    err.statusCode = 404;
    throw err;
  }

  const existing = await MarketplaceBookmark.findOne({
    where: { listingId: listing.id, userId: user.id },
  });

  if (existing) {
    const err = new Error('Listing already bookmarked.');
    err.statusCode = 409;
    throw err;
  }

  const bookmark = await MarketplaceBookmark.create({
    listingId: listing.id,
    userId: user.id,
  });

  return bookmark;
};

/**
 * Remove bookmark
 */
const removeMarketplaceBookmark = async (user, listingId) => {
  const bookmark = await MarketplaceBookmark.findOne({
    where: { listingId, userId: user.id },
  });

  if (!bookmark) {
    const err = new Error('Bookmark not found.');
    err.statusCode = 404;
    throw err;
  }

  await bookmark.destroy();
  return { success: true, message: 'Bookmark removed.' };
};

/**
 * Get user's saved marketplace items
 */
const getSavedMarketplaceListings = async (user, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 12));
  const offset = (page - 1) * limit;

  const { count, rows } = await MarketplaceBookmark.findAndCountAll({
    where: { userId: user.id },
    include: [
      {
        model: MarketplaceListing,
        as: 'listing',
        where: { collegeId: user.collegeId },
        include: [getSafeUserInclude('seller')],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  const formattedItems = rows
    .map((r) => {
      if (!r.listing) return null;
      const json = r.listing.toJSON();
      if (json.seller) json.seller = formatSafeUser(json.seller);
      return json;
    })
    .filter(Boolean);

  return {
    savedItems: formattedItems,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
};

/**
 * Get user's own listings
 */
const getMyMarketplaceListings = async (user, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 12));
  const offset = (page - 1) * limit;

  const where = {
    sellerId: user.id,
    collegeId: user.collegeId,
  };

  if (query.status) {
    where.status = query.status;
  }

  const { count, rows } = await MarketplaceListing.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return {
    listings: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
};

// ── 3. MARKETPLACE INQUIRIES ────────────────────────────────────────────────

/**
 * Submit inquiry / message on a listing
 */
const createMarketplaceInquiry = async (user, listingId, { message }) => {
  if (!message || !message.trim()) {
    const err = new Error('Message is required.');
    err.statusCode = 400;
    throw err;
  }

  const listing = await MarketplaceListing.findOne({
    where: { id: listingId, collegeId: user.collegeId },
  });

  if (!listing) {
    const err = new Error('Marketplace listing not found.');
    err.statusCode = 404;
    throw err;
  }

  if (listing.sellerId === user.id) {
    const err = new Error('You cannot send an inquiry on your own listing.');
    err.statusCode = 400;
    throw err;
  }

  const inquiry = await MarketplaceInquiry.create({
    listingId: listing.id,
    buyerId: user.id,
    message: message.trim(),
    status: 'OPEN',
  });

  // Notify seller
  await createNotification({
    userId: listing.sellerId,
    type: 'MARKETPLACE_INQUIRY',
    title: 'New Listing Inquiry',
    message: `${user.name || 'A student'} inquired about "${listing.title}".`,
    data: { listingId: listing.id, inquiryId: inquiry.id },
  });

  return inquiry;
};

/**
 * Get inquiries sent by current user
 */
const getMyMarketplaceInquiries = async (user, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 12));
  const offset = (page - 1) * limit;

  const { count, rows } = await MarketplaceInquiry.findAndCountAll({
    where: { buyerId: user.id },
    include: [
      {
        model: MarketplaceListing,
        as: 'listing',
        attributes: ['id', 'title', 'price', 'status', 'images', 'sellerId'],
        include: [getSafeUserInclude('seller')],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  const formattedRows = rows.map((inq) => {
    const json = inq.toJSON();
    if (json.listing && json.listing.seller) {
      json.listing.seller = formatSafeUser(json.listing.seller);
    }
    return json;
  });

  return {
    inquiries: formattedRows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
};

/**
 * Get inquiries received on a specific listing (Seller or Admin only)
 */
const getListingInquiries = async (user, listingId) => {
  const listing = await MarketplaceListing.findOne({
    where: { id: listingId, collegeId: user.collegeId },
  });

  if (!listing) {
    const err = new Error('Marketplace listing not found.');
    err.statusCode = 404;
    throw err;
  }

  if (listing.sellerId !== user.id && user.role !== 'admin') {
    const err = new Error('You do not have permission to view inquiries for this listing.');
    err.statusCode = 403;
    throw err;
  }

  const inquiries = await MarketplaceInquiry.findAll({
    where: { listingId: listing.id },
    include: [getSafeUserInclude('buyer')],
    order: [['createdAt', 'DESC']],
  });

  return inquiries.map((inq) => {
    const json = inq.toJSON();
    if (json.buyer) json.buyer = formatSafeUser(json.buyer);
    return json;
  });
};

/**
 * Respond to an inquiry (Seller only)
 */
const respondToMarketplaceInquiry = async (user, inquiryId, { status, replyMessage }) => {
  const inquiry = await MarketplaceInquiry.findOne({
    where: { id: inquiryId },
    include: [
      {
        model: MarketplaceListing,
        as: 'listing',
      },
    ],
  });

  if (!inquiry || !inquiry.listing || inquiry.listing.collegeId !== user.collegeId) {
    const err = new Error('Inquiry not found.');
    err.statusCode = 404;
    throw err;
  }

  if (inquiry.listing.sellerId !== user.id && user.role !== 'admin') {
    const err = new Error('You are not authorized to respond to this inquiry.');
    err.statusCode = 403;
    throw err;
  }

  await inquiry.update({
    status: status || 'ACCEPTED',
  });

  await createNotification({
    userId: inquiry.buyerId,
    type: 'MARKETPLACE_RESPONSE',
    title: 'Seller Responded to Your Inquiry',
    message: replyMessage
      ? `Seller responded to "${inquiry.listing.title}": ${replyMessage}`
      : `Seller updated inquiry status on "${inquiry.listing.title}" to ${inquiry.status}.`,
    data: { listingId: inquiry.listingId, inquiryId: inquiry.id },
  });

  return inquiry;
};

// ── 4. LOST & FOUND ITEMS & DETERMINISTIC MATCHING ──────────────────────────

/**
 * Deterministic matching engine (extensible for future AI services)
 */
const findMatchesForLostFoundItem = async (user, itemId) => {
  const targetItem = await LostFoundItem.findOne({
    where: { id: itemId, collegeId: user.collegeId },
  });

  if (!targetItem) {
    const err = new Error('Lost & Found item not found.');
    err.statusCode = 404;
    throw err;
  }

  const oppositeType = targetItem.type === 'LOST' ? 'FOUND' : 'LOST';

  const candidateItems = await LostFoundItem.findAll({
    where: {
      collegeId: user.collegeId,
      type: oppositeType,
      status: { [Op.in]: ['OPEN', 'MATCHED', 'CLAIMED'] },
      id: { [Op.ne]: targetItem.id },
    },
    include: [getSafeUserInclude('reporter')],
    limit: 100,
  });

  const stopWords = new Set(['the', 'and', 'lost', 'found', 'with', 'for', 'near', 'from', 'this', 'that', 'item', 'was']);

  const tokenize = (str) =>
    (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

  const targetTitleTokens = tokenize(targetItem.title);
  const targetLocTokens = tokenize(targetItem.location);

  const scoredMatches = candidateItems.map((candidate) => {
    let score = 0;
    const reasons = [];

    // 1. Category Match (40 pts)
    if (candidate.category === targetItem.category) {
      score += 40;
      reasons.push('Same category match');
    }

    // 2. Title Keyword Matches (up to 30 pts)
    const candTitleTokens = tokenize(candidate.title);
    const matchingTitleWords = candTitleTokens.filter((w) => targetTitleTokens.includes(w));
    if (matchingTitleWords.length > 0) {
      const titlePts = Math.min(30, matchingTitleWords.length * 15);
      score += titlePts;
      reasons.push(`Matching keywords: ${matchingTitleWords.join(', ')}`);
    }

    // 3. Location Proximity (up to 15 pts)
    const candLocTokens = tokenize(candidate.location);
    const matchingLocWords = candLocTokens.filter((w) => targetLocTokens.includes(w));
    if (matchingLocWords.length > 0) {
      score += 15;
      reasons.push('Reported in identical/nearby location');
    }

    // 4. Date Proximity (up to 15 pts)
    const d1 = new Date(targetItem.itemDate).getTime();
    const d2 = new Date(candidate.itemDate).getTime();
    const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);

    if (diffDays <= 3) {
      score += 15;
      reasons.push('Reported within 3 days');
    } else if (diffDays <= 7) {
      score += 10;
      reasons.push('Reported within 1 week');
    } else if (diffDays <= 14) {
      score += 5;
      reasons.push('Reported within 2 weeks');
    }

    const finalScore = Math.min(100, score);
    const candidateJson = candidate.toJSON();
    if (candidateJson.reporter) {
      candidateJson.reporter = formatSafeUser(candidateJson.reporter);
    }

    return {
      item: candidateJson,
      score: finalScore,
      reasons,
    };
  });

  const matches = scoredMatches
    .filter((m) => m.score >= 25)
    .sort((a, b) => b.score - a.score);

  return {
    targetItem: {
      id: targetItem.id,
      title: targetItem.title,
      type: targetItem.type,
      category: targetItem.category,
    },
    matches,
  };
};

/**
 * Report a lost or found item
 */
const createLostFoundItem = async (user, data) => {
  const {
    type,
    category,
    title,
    description,
    location,
    itemDate,
    imageUrl,
    contactPreference = 'IN_APP',
    verificationQuestion,
  } = data;

  if (!type || !['LOST', 'FOUND'].includes(type)) {
    const err = new Error('Item type must be LOST or FOUND.');
    err.statusCode = 400;
    throw err;
  }

  if (!title || !title.trim()) {
    const err = new Error('Item title is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!description || !description.trim()) {
    const err = new Error('Item description is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!location || !location.trim()) {
    const err = new Error('Campus location is required.');
    err.statusCode = 400;
    throw err;
  }

  let sanitizedDesc = description.trim();
  if (category === 'ID_CARD' || category === 'DOCUMENT') {
    sanitizedDesc = sanitizedDesc.replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[REDACTED_GOV_ID]');
    sanitizedDesc = sanitizedDesc.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, '[REDACTED_PAN]');
  }

  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days expiration

  const item = await LostFoundItem.create({
    collegeId: user.collegeId,
    reporterId: user.id,
    type,
    category: category || 'OTHER',
    title: title.trim(),
    description: sanitizedDesc,
    location: location.trim(),
    itemDate: itemDate ? new Date(itemDate) : new Date(),
    imageUrl: imageUrl || null,
    contactPreference,
    verificationQuestion: verificationQuestion ? verificationQuestion.trim() : null,
    status: 'OPEN',
    expiresAt,
  });

  // Run deterministic matching and notify if potential match found
  try {
    const matchResults = await findMatchesForLostFoundItem(user, item.id);
    if (matchResults.matches && matchResults.matches.length > 0) {
      const topMatch = matchResults.matches[0];
      if (topMatch.score >= 50) {
        // Notify new reporter
        await createNotification({
          userId: user.id,
          type: 'LOST_FOUND_MATCH',
          title: `Potential Match Found (${topMatch.score}%)`,
          message: `We found a potential match for your ${item.type.toLowerCase()} item: "${topMatch.item.title}".`,
          data: { itemId: item.id, matchedItemId: topMatch.item.id },
        });

        // Also notify the matched item's reporter
        if (topMatch.item.reporterId) {
          await createNotification({
            userId: topMatch.item.reporterId,
            type: 'LOST_FOUND_MATCH',
            title: `Potential Match Found (${topMatch.score}%)`,
            message: `Someone reported a potential match for your ${topMatch.item.type.toLowerCase()} item: "${item.title}".`,
            data: { itemId: topMatch.item.id, matchedItemId: item.id },
          });
        }
      }
    }
  } catch (_) {
    // Non-blocking matching notification
  }

  return item;
};

/**
 * Get lost and found items with search, filters, and pagination
 */
const getLostFoundItems = async (user, query = {}) => {
  const {
    type,
    category,
    status = 'OPEN',
    q,
    location,
    startDate,
    endDate,
    sort = 'newest',
    page = 1,
    limit = 12,
  } = query;

  const where = {
    collegeId: user.collegeId,
  };

  if (type) {
    where.type = type;
  }

  if (category) {
    where.category = category;
  }

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (location && location.trim()) {
    where.location = { [Op.like]: `%${location.trim()}%` };
  }

  if (startDate || endDate) {
    where.itemDate = {};
    if (startDate) {
      where.itemDate[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      where.itemDate[Op.lte] = new Date(endDate);
    }
  }

  if (q && q.trim()) {
    const searchVal = `%${q.trim()}%`;
    where[Op.or] = [
      { title: { [Op.like]: searchVal } },
      { description: { [Op.like]: searchVal } },
      { location: { [Op.like]: searchVal } },
    ];
  }

  let order = [['createdAt', 'DESC']];
  if (sort === 'itemDate_desc') {
    order = [['itemDate', 'DESC']];
  } else if (sort === 'itemDate_asc') {
    order = [['itemDate', 'ASC']];
  } else if (sort === 'oldest') {
    order = [['createdAt', 'ASC']];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const offset = (pageNum - 1) * pageLimit;

  const { count, rows } = await LostFoundItem.findAndCountAll({
    where,
    include: [getSafeUserInclude('reporter')],
    order,
    limit: pageLimit,
    offset,
    distinct: true,
  });

  const formattedRows = rows.map((item) => {
    const json = item.toJSON();
    if (json.reporter) {
      json.reporter = formatSafeUser(json.reporter);
    }
    return json;
  });

  return {
    items: formattedRows,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageLimit),
  };
};

/**
 * Get Lost & Found item details
 */
const getLostFoundItemById = async (user, itemId) => {
  const item = await LostFoundItem.findOne({
    where: { id: itemId, collegeId: user.collegeId },
    include: [getSafeUserInclude('reporter')],
  });

  if (!item) {
    const err = new Error('Lost & Found item not found.');
    err.statusCode = 404;
    throw err;
  }

  const isReporterOrAdmin = user && (user.id === item.reporterId || user.role === 'admin');

  let claims = [];
  if (isReporterOrAdmin) {
    claims = await LostFoundClaim.findAll({
      where: { itemId: item.id },
      include: [getSafeUserInclude('claimant')],
      order: [['createdAt', 'DESC']],
    });
  }

  const plainItem = item.toJSON();
  if (plainItem.reporter) {
    plainItem.reporter = formatSafeUser(plainItem.reporter);
  }

  if (isReporterOrAdmin) {
    plainItem.claims = claims.map((c) => {
      const cJson = c.toJSON();
      if (cJson.claimant) cJson.claimant = formatSafeUser(cJson.claimant);
      return cJson;
    });
  }

  return plainItem;
};

/**
 * Update Lost & Found item (Reporter or Admin only)
 */
const updateLostFoundItem = async (user, itemId, data) => {
  const item = await LostFoundItem.findOne({
    where: { id: itemId, collegeId: user.collegeId },
  });

  if (!item) {
    const err = new Error('Lost & Found item not found.');
    err.statusCode = 404;
    throw err;
  }

  if (item.reporterId !== user.id && user.role !== 'admin') {
    const err = new Error('You do not have permission to modify this report.');
    err.statusCode = 403;
    throw err;
  }

  const { title, description, location, category, itemDate, imageUrl, verificationQuestion, status } = data;

  await item.update({
    title: title ? title.trim() : item.title,
    description: description ? description.trim() : item.description,
    location: location ? location.trim() : item.location,
    category: category || item.category,
    itemDate: itemDate ? new Date(itemDate) : item.itemDate,
    imageUrl: imageUrl !== undefined ? imageUrl : item.imageUrl,
    verificationQuestion: verificationQuestion !== undefined ? verificationQuestion : item.verificationQuestion,
    status: status || item.status,
  });

  return item;
};

/**
 * Delete Lost & Found report (Reporter or Admin only)
 */
const deleteLostFoundItem = async (user, itemId, reason = '') => {
  const item = await LostFoundItem.findOne({
    where: { id: itemId, collegeId: user.collegeId },
  });

  if (!item) {
    const err = new Error('Lost & Found item not found.');
    err.statusCode = 404;
    throw err;
  }

  if (item.reporterId !== user.id && user.role !== 'admin') {
    const err = new Error('You do not have permission to delete this report.');
    err.statusCode = 403;
    throw err;
  }

  const isModeratedByAdmin = user.role === 'admin' && item.reporterId !== user.id;

  await item.destroy();

  if (isModeratedByAdmin) {
    await AuditLog.create({
      actorId: user.id,
      targetUserId: item.reporterId,
      action: 'LOST_FOUND_ITEM_REMOVED',
      category: 'ADMIN_MODERATION',
      details: {
        itemId: item.id,
        title: item.title,
        reason: reason || 'Removed by campus administrator',
      },
    });
  }

  return { success: true, message: 'Lost & Found item removed.' };
};

/**
 * Mark Lost & Found item as resolved
 */
const markLostFoundResolved = async (user, itemId) => {
  const item = await LostFoundItem.findOne({
    where: { id: itemId, collegeId: user.collegeId },
  });

  if (!item) {
    const err = new Error('Lost & Found item not found.');
    err.statusCode = 404;
    throw err;
  }

  if (item.reporterId !== user.id && user.role !== 'admin') {
    const err = new Error('Only the reporter or admin can mark this item as resolved.');
    err.statusCode = 403;
    throw err;
  }

  await item.update({
    status: 'RESOLVED',
    resolvedAt: new Date(),
    resolvedBy: user.id,
  });

  await AuditLog.create({
    actorId: user.id,
    action: 'LOST_FOUND_ITEM_RESOLVED',
    category: 'EXCHANGE_LIFECYCLE',
    details: { itemId: item.id, title: item.title },
  });

  return item;
};

/**
 * Get reports submitted by current user
 */
const getMyLostFoundReports = async (user, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 12));
  const offset = (page - 1) * limit;

  const { count, rows } = await LostFoundItem.findAndCountAll({
    where: {
      reporterId: user.id,
      collegeId: user.collegeId,
    },
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return {
    reports: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
};

// ── 5. LOST & FOUND CLAIMS ──────────────────────────────────────────────────

/**
 * Submit an ownership claim for a found item
 */
const createLostFoundClaim = async (user, itemId, { message, verificationAnswer }) => {
  if (!message || !message.trim()) {
    const err = new Error('Claim message is required.');
    err.statusCode = 400;
    throw err;
  }

  const item = await LostFoundItem.findOne({
    where: { id: itemId, collegeId: user.collegeId },
  });

  if (!item) {
    const err = new Error('Lost & Found item not found.');
    err.statusCode = 404;
    throw err;
  }

  if (['RESOLVED', 'EXPIRED', 'ARCHIVED'].includes(item.status)) {
    const err = new Error(`Cannot submit claim: item is already ${item.status.toLowerCase()}.`);
    err.statusCode = 400;
    throw err;
  }

  if (item.reporterId === user.id) {
    const err = new Error('You cannot claim an item you reported.');
    err.statusCode = 400;
    throw err;
  }

  const existingClaim = await LostFoundClaim.findOne({
    where: {
      itemId: item.id,
      claimantId: user.id,
      status: { [Op.in]: ['PENDING', 'ACCEPTED'] },
    },
  });

  if (existingClaim) {
    const err = new Error('You have already submitted an active claim for this item.');
    err.statusCode = 409;
    throw err;
  }

  const claim = await LostFoundClaim.create({
    itemId: item.id,
    claimantId: user.id,
    message: message.trim(),
    verificationAnswer: verificationAnswer ? verificationAnswer.trim() : null,
    status: 'PENDING',
  });

  // Notify reporter
  await createNotification({
    userId: item.reporterId,
    type: 'LOST_FOUND_CLAIM',
    title: 'New Ownership Claim Received',
    message: `${user.name || 'A student'} submitted an ownership claim for "${item.title}".`,
    data: { itemId: item.id, claimId: claim.id },
  });

  return claim;
};

/**
 * Get claims submitted by current user
 */
const getMyLostFoundClaims = async (user, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 12));
  const offset = (page - 1) * limit;

  const { count, rows } = await LostFoundClaim.findAndCountAll({
    where: { claimantId: user.id },
    include: [
      {
        model: LostFoundItem,
        as: 'item',
        where: { collegeId: user.collegeId },
        include: [getSafeUserInclude('reporter')],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  const formattedRows = rows.map((c) => {
    const json = c.toJSON();
    if (json.item && json.item.reporter) {
      json.item.reporter = formatSafeUser(json.item.reporter);
    }
    return json;
  });

  return {
    claims: formattedRows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
};

/**
 * Accept a claim (Reporter or Admin only)
 */
const acceptLostFoundClaim = async (user, claimId) => {
  const claim = await LostFoundClaim.findOne({
    where: { id: claimId },
    include: [
      {
        model: LostFoundItem,
        as: 'item',
      },
    ],
  });

  if (!claim || !claim.item || claim.item.collegeId !== user.collegeId) {
    const err = new Error('Claim not found.');
    err.statusCode = 404;
    throw err;
  }

  if (claim.claimantId === user.id && user.role !== 'admin') {
    const err = new Error('You cannot approve your own claim.');
    err.statusCode = 403;
    throw err;
  }

  if (claim.item.reporterId !== user.id && user.role !== 'admin') {
    const err = new Error('Only the item reporter or admin can accept this claim.');
    err.statusCode = 403;
    throw err;
  }

  await claim.update({
    status: 'ACCEPTED',
    reviewedAt: new Date(),
    resolvedAt: new Date(),
  });

  await claim.item.update({
    status: 'CLAIMED',
  });

  await AuditLog.create({
    actorId: user.id,
    targetUserId: claim.claimantId,
    action: 'LOST_FOUND_CLAIM_ACCEPTED',
    category: 'EXCHANGE_LIFECYCLE',
    details: { claimId: claim.id, itemId: claim.item.id },
  });

  // Notify claimant
  await createNotification({
    userId: claim.claimantId,
    type: 'LOST_FOUND_CLAIM_ACCEPTED',
    title: 'Claim Accepted!',
    message: `Your ownership claim for "${claim.item.title}" has been accepted by the reporter.`,
    data: { itemId: claim.item.id, claimId: claim.id },
  });

  return claim;
};

/**
 * Reject a claim (Reporter or Admin only)
 */
const rejectLostFoundClaim = async (user, claimId, reason = '') => {
  const claim = await LostFoundClaim.findOne({
    where: { id: claimId },
    include: [
      {
        model: LostFoundItem,
        as: 'item',
      },
    ],
  });

  if (!claim || !claim.item || claim.item.collegeId !== user.collegeId) {
    const err = new Error('Claim not found.');
    err.statusCode = 404;
    throw err;
  }

  if (claim.item.reporterId !== user.id && user.role !== 'admin') {
    const err = new Error('Only the item reporter or admin can reject this claim.');
    err.statusCode = 403;
    throw err;
  }

  await claim.update({
    status: 'REJECTED',
    reviewedAt: new Date(),
  });

  await createNotification({
    userId: claim.claimantId,
    type: 'LOST_FOUND_CLAIM_REJECTED',
    title: 'Claim Not Accepted',
    message: reason
      ? `Your claim for "${claim.item.title}" was rejected: ${reason}`
      : `Your claim for "${claim.item.title}" was not verified.`,
    data: { itemId: claim.item.id, claimId: claim.id },
  });

  return claim;
};

// ── 6. REPORTING FRAUD / ABUSE ──────────────────────────────────────────────

/**
 * Report a marketplace listing or lost & found item
 */
const reportExchangeItem = async (user, { type, id, category, description }) => {
  if (!id) {
    const err = new Error('Target item ID is required.');
    err.statusCode = 400;
    throw err;
  }

  let reportPayload = {
    reporterId: user.id,
    category: category || 'exchange_violation',
    description: description || 'Reported by user for policy review',
    status: 'pending',
  };

  if (type === 'marketplace') {
    const listing = await MarketplaceListing.findOne({
      where: { id, collegeId: user.collegeId },
    });
    if (!listing) {
      const err = new Error('Marketplace listing not found.');
      err.statusCode = 404;
      throw err;
    }
    reportPayload.marketplaceListingId = listing.id;
    reportPayload.reportedUserId = listing.sellerId;
  } else if (type === 'lost-found') {
    const item = await LostFoundItem.findOne({
      where: { id, collegeId: user.collegeId },
    });
    if (!item) {
      const err = new Error('Lost & Found item not found.');
      err.statusCode = 404;
      throw err;
    }
    reportPayload.lostFoundItemId = item.id;
    reportPayload.reportedUserId = item.reporterId;
  } else {
    const err = new Error('Invalid item type for reporting. Must be "marketplace" or "lost-found".');
    err.statusCode = 400;
    throw err;
  }

  const report = await Report.create(reportPayload);

  await AuditLog.create({
    actorId: user.id,
    targetUserId: reportPayload.reportedUserId,
    action: 'EXCHANGE_ITEM_REPORTED',
    category: 'SAFETY',
    details: {
      type,
      targetId: id,
      category,
      description,
    },
  });

  return report;
};

// ── 7. ADMIN MODERATION & ANALYTICS ─────────────────────────────────────────

/**
 * Admin view of marketplace listings with moderation stats
 */
const getAdminMarketplaceListings = async (adminUser, query = {}) => {
  const { status, category, q, page = 1, limit = 20 } = query;

  const where = { collegeId: adminUser.collegeId };
  if (status) where.status = status;
  if (category) where.category = category;
  if (q && q.trim()) {
    where.title = { [Op.like]: `%${q.trim()}%` };
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * pageLimit;

  const { count, rows } = await MarketplaceListing.findAndCountAll({
    where,
    include: [getSafeUserInclude('seller')],
    order: [['createdAt', 'DESC']],
    limit: pageLimit,
    offset,
  });

  const formattedRows = rows.map((listing) => {
    const json = listing.toJSON();
    if (json.seller) json.seller = formatSafeUser(json.seller);
    return json;
  });

  return {
    listings: formattedRows,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageLimit),
  };
};

/**
 * Admin view of Lost & Found items
 */
const getAdminLostFoundItems = async (adminUser, query = {}) => {
  const { type, status, category, q, page = 1, limit = 20 } = query;

  const where = { collegeId: adminUser.collegeId };
  if (type) where.type = type;
  if (status) where.status = status;
  if (category) where.category = category;
  if (q && q.trim()) {
    where.title = { [Op.like]: `%${q.trim()}%` };
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * pageLimit;

  const { count, rows } = await LostFoundItem.findAndCountAll({
    where,
    include: [
      getSafeUserInclude('reporter'),
      {
        model: LostFoundClaim,
        as: 'claims',
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: pageLimit,
    offset,
    distinct: true,
  });

  const formattedRows = rows.map((item) => {
    const json = item.toJSON();
    if (json.reporter) json.reporter = formatSafeUser(json.reporter);
    return json;
  });

  return {
    items: formattedRows,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageLimit),
  };
};

/**
 * Admin archive Lost & Found report
 */
const adminArchiveLostFoundItem = async (adminUser, itemId, reason = '') => {
  const item = await LostFoundItem.findOne({
    where: { id: itemId, collegeId: adminUser.collegeId },
  });

  if (!item) {
    const err = new Error('Lost & Found item not found.');
    err.statusCode = 404;
    throw err;
  }

  await item.update({ status: 'ARCHIVED' });

  await AuditLog.create({
    actorId: adminUser.id,
    targetUserId: item.reporterId,
    action: 'LOST_FOUND_ITEM_ARCHIVED',
    category: 'ADMIN_MODERATION',
    details: { itemId: item.id, reason },
  });

  return item;
};

/**
 * Real database analytics for Admin Campus Exchange dashboard
 */
const getAdminExchangeAnalytics = async (adminUser) => {
  const collegeId = adminUser.collegeId;

  const [
    activeListings,
    soldListings,
    reservedListings,
    totalListings,
    totalInquiries,
    activeSellersGroup,
    avgPriceResult,
    popularCategories,
  ] = await Promise.all([
    MarketplaceListing.count({ where: { collegeId, status: 'ACTIVE' } }),
    MarketplaceListing.count({ where: { collegeId, status: 'SOLD' } }),
    MarketplaceListing.count({ where: { collegeId, status: 'RESERVED' } }),
    MarketplaceListing.count({ where: { collegeId } }),
    MarketplaceInquiry.count({
      include: [
        {
          model: MarketplaceListing,
          as: 'listing',
          where: { collegeId },
          required: true,
        },
      ],
    }),
    MarketplaceListing.findAll({
      where: { collegeId },
      attributes: ['sellerId'],
      group: ['sellerId'],
    }),
    MarketplaceListing.findAll({
      where: { collegeId, status: { [Op.ne]: 'REMOVED' } },
      attributes: [[fn('AVG', col('price')), 'avgPrice']],
      raw: true,
    }),
    MarketplaceListing.findAll({
      where: { collegeId },
      attributes: ['category', [fn('COUNT', col('id')), 'count']],
      group: ['category'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: 5,
      raw: true,
    }),
  ]);

  const activeSellersCount = activeSellersGroup.length;
  const averagePrice = (avgPriceResult[0] && avgPriceResult[0].avgPrice)
    ? Number(avgPriceResult[0].avgPrice).toFixed(2)
    : '0.00';

  const [
    totalReports,
    lostReports,
    foundReports,
    resolvedReports,
    claimedReports,
    openClaims,
    acceptedClaims,
  ] = await Promise.all([
    LostFoundItem.count({ where: { collegeId } }),
    LostFoundItem.count({ where: { collegeId, type: 'LOST' } }),
    LostFoundItem.count({ where: { collegeId, type: 'FOUND' } }),
    LostFoundItem.count({ where: { collegeId, status: 'RESOLVED' } }),
    LostFoundItem.count({ where: { collegeId, status: 'CLAIMED' } }),
    LostFoundClaim.count({
      where: { status: 'PENDING' },
      include: [
        {
          model: LostFoundItem,
          as: 'item',
          where: { collegeId },
          required: true,
        },
      ],
    }),
    LostFoundClaim.count({
      where: { status: 'ACCEPTED' },
      include: [
        {
          model: LostFoundItem,
          as: 'item',
          where: { collegeId },
          required: true,
        },
      ],
    }),
  ]);

  return {
    marketplace: {
      totalListings,
      activeListings,
      soldListings,
      reservedListings,
      totalInquiries,
      activeSellers: activeSellersCount,
      averagePrice,
      popularCategories,
    },
    lostAndFound: {
      totalReports,
      lostReports,
      foundReports,
      resolvedReports,
      claimedReports,
      openClaims,
      successfulMatches: acceptedClaims + resolvedReports,
    },
  };
};

module.exports = {
  validateMarketplaceListing,
  // Marketplace Listings
  getMarketplaceListings,
  getMarketplaceListingById,
  createMarketplaceListing,
  updateMarketplaceListing,
  deleteMarketplaceListing,
  reserveMarketplaceListing,
  markMarketplaceListingSold,
  bookmarkMarketplaceListing,
  removeMarketplaceBookmark,
  getSavedMarketplaceListings,
  getMyMarketplaceListings,
  // Marketplace Inquiries
  createMarketplaceInquiry,
  getMyMarketplaceInquiries,
  getListingInquiries,
  respondToMarketplaceInquiry,
  // Lost & Found Items & Matching
  findMatchesForLostFoundItem,
  createLostFoundItem,
  getLostFoundItems,
  getLostFoundItemById,
  updateLostFoundItem,
  deleteLostFoundItem,
  markLostFoundResolved,
  getMyLostFoundReports,
  // Lost & Found Claims
  createLostFoundClaim,
  getMyLostFoundClaims,
  acceptLostFoundClaim,
  rejectLostFoundClaim,
  // Reports
  reportExchangeItem,
  // Admin Moderation & Analytics
  getAdminMarketplaceListings,
  getAdminLostFoundItems,
  adminArchiveLostFoundItem,
  getAdminExchangeAnalytics,
};
