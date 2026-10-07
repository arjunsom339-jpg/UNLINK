import { create } from 'zustand';
import { aiApi } from '../api';

const getLocalCampusAdvice = (query) => {
  const q = (query || '').toLowerCase();
  if (q.includes('skill') || q.includes('exchange') || q.includes('match') || q.includes('learn')) {
    return 'UniLink has an integrated **Skill Exchange Engine**! Open **Learn & Connect** from your student dashboard to list skills you know and skills you want to learn. Our reciprocal matching algorithm pairs you with study partners.';
  }
  if (q.includes('club') || q.includes('community')) {
    return 'Explore the **Clubs** section to discover active campus student societies (coding, robotics, cultural), submit membership applications, and participate in club elections.';
  }
  if (q.includes('event') || q.includes('hackathon')) {
    return 'Check **Campus Events** to register for workshops, hackathons, and guest lectures. You can track registrations and waitlists in real time.';
  }
  if (q.includes('placement') || q.includes('job') || q.includes('interview')) {
    return 'Head over to the **Placements Portal** to browse active campus drives, view eligibility requirements, and access alumni mentorship sessions.';
  }
  if (q.includes('help') || q.includes('emergency') || q.includes('lost')) {
    return 'For urgent campus assistance, use the **Help & Emergency** tab or check the **Lost & Found / Campus Exchange** directory.';
  }
  return "I'm your **UniLink Campus Assistant**! I can help you find clubs, discover skill-exchange partners, prepare for placements, and navigate campus resources. What would you like to know more about?";
};

export const useAiStore = create((set, get) => ({
  isOpen: false,
  messages: [
    {
      id: 'welcome',
      role: 'model',
      text: "👋 Hi! I'm **UniLink Campus AI**.\n\nI can help you with:\n* 📚 **Academics & Coding**: Explanations, debug hints, study tips\n* 🤝 **Peer Matching**: Finding study partners and skill exchanges\n* 🏆 **Clubs & Events**: Recommendations for campus activities\n* 💼 **Career & Placements**: Interview prep and technical guidance\n\nHow can I help you today?",
      timestamp: new Date().toISOString(),
      isLiveGemini: true,
    },
  ],
  loading: false,
  isConfigured: false,

  openChat: (initialPrompt = null) => {
    set({ isOpen: true });
    if (initialPrompt && typeof initialPrompt === 'string') {
      get().sendMessage(initialPrompt);
    }
  },

  closeChat: () => set({ isOpen: false }),

  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),

  checkStatus: async () => {
    try {
      const res = await aiApi.status();
      if (res.data?.data) {
        set({ isConfigured: res.data.data.isConfigured });
      }
    } catch (_) {
      // Keep existing status
    }
  },

  sendMessage: async (text) => {
    if (!text || !text.trim()) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const currentMessages = get().messages;
    set({
      messages: [...currentMessages, userMsg],
      loading: true,
    });

    try {
      // Build lightweight history array for Gemini context
      const history = currentMessages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const res = await aiApi.chat({
        message: userMsg.text,
        history,
      });

      const aiData = res.data?.data || {};

      const modelMsg = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: aiData.text || "I'm sorry, I couldn't process that. Please try again.",
        timestamp: new Date().toISOString(),
        isLiveGemini: aiData.isLiveGemini !== false,
      };

      set((state) => ({
        messages: [...state.messages, modelMsg],
        loading: false,
        isConfigured: aiData.isLiveGemini !== false || state.isConfigured,
      }));
    } catch (_) {
      const fallbackText = getLocalCampusAdvice(userMsg.text);
      const errorMsg = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: fallbackText,
        timestamp: new Date().toISOString(),
        isLiveGemini: false,
      };

      set((state) => ({
        messages: [...state.messages, errorMsg],
        loading: false,
      }));
    }
  },

  clearMessages: () => {
    set({
      messages: [
        {
          id: 'welcome',
          role: 'model',
          text: "👋 Chat reset! How can I help you today?",
          timestamp: new Date().toISOString(),
          isLiveGemini: true,
        },
      ],
    });
  },
}));

export default useAiStore;
