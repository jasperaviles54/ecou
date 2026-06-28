/* ══════════════════════════════════════════════════════════════
   EcoBot — AI-Powered Career Guidance Chatbot
   Eco University  ·  Powered by Gemini
   ══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── Config ─────────────────────────────────────────────────── */
  const API_URL = "/api/chat";
  const WELCOME_MSG =
    "Hi there! 👋 I'm **EcoBot**, your AI Career Guidance Assistant. I can help with career advice, resume tips, interview prep, and more. What would you like to explore?";
  const QUICK_REPLIES = [
    { label: "🧭 Career Paths", message: "What career paths are available for university students?" },
    { label: "📄 Resume Help", message: "Can you help me improve my resume?" },
    { label: "🎤 Interview Tips", message: "How should I prepare for a job interview?" },
    { label: "🏫 Career Center", message: "What services does the university Career Center offer?" },
  ];

  /* ── State ──────────────────────────────────────────────────── */
  let chatHistory = [];
  let isOpen = false;
  let isLoading = false;

  /* ── Inject HTML ────────────────────────────────────────────── */
  function injectChatbot() {
    const wrapper = document.createElement("div");
    wrapper.id = "chatbot-wrapper";
    wrapper.innerHTML = `
      <button id="chatbot-bubble" aria-label="Open career guidance chatbot" title="Career Guidance Chat">
        <i class="fas fa-comments"></i>
        <span class="chatbot-bubble-label">Career Help</span>
      </button>

      <div id="chatbot-panel" class="chatbot-hidden" role="dialog" aria-label="Career Guidance Chatbot">
        <div class="chatbot-header">
          <div class="chatbot-header-info">
            <span class="chatbot-avatar">🎓</span>
            <div>
              <span class="chatbot-title">EcoBot</span>
              <span class="chatbot-subtitle">Career Guidance Assistant</span>
            </div>
          </div>
          <button id="chatbot-close" aria-label="Close chatbot">&times;</button>
        </div>

        <div id="chatbot-messages"></div>

        <div id="chatbot-quick-replies"></div>

        <div class="chatbot-input-area">
          <input type="text" id="chatbot-input" placeholder="Ask me about careers, resumes, interviews..." autocomplete="off">
          <button id="chatbot-send" aria-label="Send message">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);
  }

  /* ── Render helpers ─────────────────────────────────────────── */
  function getMessagesEl() {
    return document.getElementById("chatbot-messages");
  }

  function scrollToBottom() {
    const el = getMessagesEl();
    if (el) el.scrollTop = el.scrollHeight;
  }

  /** Minimal markdown: **bold**, *italic*, bullet lists, numbered lists */
  function formatMarkdown(text) {
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Italic
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Convert lines into paragraphs / lists
    const lines = html.split("\n");
    let result = "";
    let inList = false;
    let listType = "";

    for (const line of lines) {
      const trimmed = line.trim();

      // Bullet list
      if (/^[-•]\s+/.test(trimmed)) {
        if (!inList || listType !== "ul") {
          if (inList) result += `</${listType}>`;
          result += "<ul>";
          inList = true;
          listType = "ul";
        }
        result += `<li>${trimmed.replace(/^[-•]\s+/, "")}</li>`;
        continue;
      }

      // Numbered list
      if (/^\d+[.)]\s+/.test(trimmed)) {
        if (!inList || listType !== "ol") {
          if (inList) result += `</${listType}>`;
          result += "<ol>";
          inList = true;
          listType = "ol";
        }
        result += `<li>${trimmed.replace(/^\d+[.)]\s+/, "")}</li>`;
        continue;
      }

      // Close any open list
      if (inList) {
        result += `</${listType}>`;
        inList = false;
        listType = "";
      }

      if (trimmed === "") {
        result += "<br>";
      } else {
        result += `<p>${trimmed}</p>`;
      }
    }
    if (inList) result += `</${listType}>`;

    return result;
  }

  function addMessage(role, text) {
    const el = getMessagesEl();
    if (!el) return;

    const bubble = document.createElement("div");
    bubble.className = `chatbot-msg chatbot-msg-${role}`;

    if (role === "bot") {
      bubble.innerHTML = formatMarkdown(text);
    } else {
      bubble.textContent = text;
    }

    el.appendChild(bubble);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const el = getMessagesEl();
    if (!el) return;

    const indicator = document.createElement("div");
    indicator.className = "chatbot-msg chatbot-msg-bot chatbot-typing";
    indicator.id = "chatbot-typing";
    indicator.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    el.appendChild(indicator);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById("chatbot-typing");
    if (indicator) indicator.remove();
  }

  function renderQuickReplies() {
    const container = document.getElementById("chatbot-quick-replies");
    if (!container) return;
    container.innerHTML = "";

    QUICK_REPLIES.forEach((qr) => {
      const btn = document.createElement("button");
      btn.className = "chatbot-quick-btn";
      btn.textContent = qr.label;
      btn.addEventListener("click", () => sendMessage(qr.message));
      container.appendChild(btn);
    });
  }

  function hideQuickReplies() {
    const container = document.getElementById("chatbot-quick-replies");
    if (container) container.innerHTML = "";
  }

  /* ── API call ───────────────────────────────────────────────── */
  async function sendMessage(text) {
    if (isLoading || !text.trim()) return;

    isLoading = true;
    hideQuickReplies();
    addMessage("user", text);

    chatHistory.push({ role: "user", text });

    showTypingIndicator();

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: chatHistory.slice(-10),
        }),
      });

      removeTypingIndicator();

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Request failed");
      }

      const data = await res.json();
      const reply = data.reply || "Sorry, I couldn't process that. Please try again.";

      addMessage("bot", reply);
      chatHistory.push({ role: "bot", text: reply });
    } catch (err) {
      removeTypingIndicator();
      addMessage(
        "bot",
        "I'm having trouble connecting right now. Please try again in a moment, or visit the **Career Center** for immediate assistance."
      );
      console.error("Chatbot error:", err);
    }

    isLoading = false;
  }

  /* ── Toggle panel ───────────────────────────────────────────── */
  function togglePanel() {
    const panel = document.getElementById("chatbot-panel");
    const bubble = document.getElementById("chatbot-bubble");
    if (!panel || !bubble) return;

    isOpen = !isOpen;
    panel.classList.toggle("chatbot-hidden", !isOpen);
    bubble.classList.toggle("chatbot-bubble-active", isOpen);

    if (isOpen) {
      // Focus input
      const input = document.getElementById("chatbot-input");
      if (input) input.focus();
    }
  }

  /* ── Event bindings ─────────────────────────────────────────── */
  function bindEvents() {
    document.getElementById("chatbot-bubble")
      ?.addEventListener("click", togglePanel);

    document.getElementById("chatbot-close")
      ?.addEventListener("click", togglePanel);

    document.getElementById("chatbot-send")
      ?.addEventListener("click", () => {
        const input = document.getElementById("chatbot-input");
        if (input && input.value.trim()) {
          sendMessage(input.value.trim());
          input.value = "";
        }
      });

    document.getElementById("chatbot-input")
      ?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const input = e.target;
          if (input.value.trim()) {
            sendMessage(input.value.trim());
            input.value = "";
          }
        }
      });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) togglePanel();
    });
  }

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    injectChatbot();
    bindEvents();

    // Welcome message
    addMessage("bot", WELCOME_MSG);
    renderQuickReplies();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
