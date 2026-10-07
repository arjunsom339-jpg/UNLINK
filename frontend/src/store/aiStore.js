import { create } from 'zustand';
import { aiApi } from '../api';

export const useAiStore = create((set, get) => ({
  isOpen: false,
  messages: [
    {
      id: 'welcome',
      role: 'model',
      text: "👋 Hi! I'm **UniLink Campus AI**, powered by Google Gemini.\n\nI can help you with:\n* 📚 **Academics & Coding**: Explanations, debug hints, study tips\n* 🤝 **Peer Matching**: Finding study partners and skill exchanges\n* 🏆 **Clubs & Events**: Recommendations for campus activities\n* 💼 **Career & Placements**: Interview prep and technical guidance\n\nHow can I help you today?",
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
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'model',
        text:
          err.response?.data?.message ||
          '⚠️ Unable to reach UniLink AI server. Please make sure the backend is running and try again.',
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
