'use strict';

const logger = require('../utils/logger');

const GEMINI_DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const CAMPUS_SYSTEM_INSTRUCTION = `You are UniLink AI (Campus Copilot), the intelligent virtual campus companion for the UniLink digital university platform.
UniLink connects students, faculty, and administrators to Learn, Connect, Collaborate, Participate, and Help.

Your key missions:
1. Academic Assistance: Explain complex concepts (computer science, engineering, mathematics, humanities, business) clearly with concise examples and markdown formatting.
2. Campus Navigation: Guide students on finding clubs, study groups, skill-exchange partners, alumni mentors, campus exchange items, and upcoming hackathons/events.
3. Career & Placements: Provide tips for technical interviews, resume building, DSA practice, and portfolio development.
4. Peer & Collaboration: Encourage peer networking, skill bartering, and respectful teamwork.

Persona: Friendly, supportive, sharp, and concise. Format responses with clean Markdown (bullet points, bold highlights, and code blocks where helpful). Keep answers engaging and easy to read.`;

/**
 * Checks if Gemini API key is configured
 */
const isGeminiConfigured = () => {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() && key !== 'your_gemini_api_key');
};

/**
 * Generates an intelligent fallback response when no API key is set
 */
const generateFallbackResponse = (message) => {
  const q = (message || '').toLowerCase();

  let advice = '';
  if (q.includes('skill') || q.includes('exchange') || q.includes('match')) {
    advice = 'UniLink has a built-in **Skill Exchange Engine**! Go to **Learn & Connect** in your student dashboard to set skills you know and skills you want to learn. Our algorithm automatically pairs you with reciprocal study partners.';
  } else if (q.includes('club') || q.includes('community')) {
    advice = 'Explore the **Clubs & Communities** tab to discover tech societies, cultural clubs, robotics chapters, and open elections. You can apply to join or manage existing clubs.';
  } else if (q.includes('event') || q.includes('hackathon')) {
    advice = 'Check out **Campus Events** to register for faculty workshops, guest lectures, and student hackathons with live waitlists and automated attendance tracking.';
  } else if (q.includes('mentor') || q.includes('placement') || q.includes('job')) {
    advice = 'Visit the **Mentorship & Placements** portal to book 1-on-1 guidance sessions with verified alumni working at top companies, or apply to active campus placement drives.';
  } else {
    advice = 'I am here to assist you with academics, study tips, campus clubs, skill exchange, and placement preparation!';
  }

  return advice;
};

/**
 * Sends a chat prompt to Google Gemini API
 * @param {string} userMessage - The current message from the user
 * @param {Array} history - Previous conversation [{ role: 'user'|'model', text: '...' }]
 * @param {Object} context - Optional user/campus metadata { name, role, department }
 */
const generateCampusAiResponse = async (userMessage, history = [], context = {}) => {
  if (!userMessage || !userMessage.trim()) {
    throw new Error('Message content is required');
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!isGeminiConfigured()) {
    logger.info('Gemini API key not configured, returning campus guide fallback');
    return {
      text: generateFallbackResponse(userMessage),
      model: 'campus-fallback-agent',
      isLiveGemini: false,
    };
  }

  const model = GEMINI_DEFAULT_MODEL;
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey.trim()}`;

  // Format multi-turn conversation contents for Gemini v1beta
  const contents = [];

  // Add previous turns if provided (limit to last 8 turns for token efficiency)
  const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
  recentHistory.forEach((turn) => {
    if (turn.text && (turn.role === 'user' || turn.role === 'model')) {
      contents.push({
        role: turn.role,
        parts: [{ text: turn.text }],
      });
    }
  });

  // Inject user campus context if available
  let promptText = userMessage.trim();
  if (context.name || context.department || context.role) {
    const ctxString = `[User Context: Name: ${context.name || 'Student'}, Role: ${context.role || 'student'}, Department: ${context.department || 'General'}]`;
    promptText = `${ctxString}\n\n${promptText}`;
  }

  // Add the current user turn
  contents.push({
    role: 'user',
    parts: [{ text: promptText }],
  });

  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: CAMPUS_SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `Gemini API returned status ${response.status}`;
      logger.error('Gemini API error:', { status: response.status, message: errorMsg });

      // Fallback on quota exhaustion or error
      if (response.status === 429) {
        return {
          text: `⚠️ *UniLink AI is currently handling heavy campus traffic. Here is a quick answer:*\n\n${generateFallbackResponse(userMessage)}`,
          model,
          isLiveGemini: false,
        };
      }

      throw new Error(errorMsg);
    }

    const data = await response.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'I was unable to generate a response. Please try rephrasing your question.';

    return {
      text: candidateText,
      model,
      isLiveGemini: true,
    };
  } catch (err) {
    logger.error('Failed to communicate with Gemini API:', err.message);
    // Graceful fallback rather than breaking client UI
    return {
      text: generateFallbackResponse(userMessage),
      model: 'campus-fallback-agent',
      isLiveGemini: false,
      error: err.message,
    };
  }
};

module.exports = {
  generateCampusAiResponse,
  isGeminiConfigured,
};
