/**
 * Sambodhan Chatbot Widget - Vanilla JavaScript
 * Floating chat interface for grievance submission and tracking
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        // Auto-detect API URL: use localhost:8000 when opened as file://, otherwise use current origin
        API_BASE_URL: window.location.protocol === 'file:' 
            ? 'http://localhost:8000/api' 
            : window.location.origin + '/api',
        SESSION_STORAGE_KEY: 'sambodhan_chat_session',
        MAX_MESSAGE_LENGTH: 2000,
        GREETING_MESSAGE: 'Welcome to Sambodhan Grievance Redressal System! I can help you:\n' +
                         '1. File a new grievance/complaint\n' +
                         '2. Track your existing complaint status\n' +
                         '3. Provide information about our services\n\n' +
                         'How can I assist you today?',
        // User authentication data (to be set by your main application)
        USER_DATA: {
            user_id: null,      // Set this from your auth system
            user_name: null,    // User's name
            user_email: null,   // User's email
            user_phone: null    // User's phone
        }
    };

    // State management
    let chatState = {
        isOpen: false,
        sessionId: null,
        context: {},
        messageHistory: []
    };

    // DOM Elements
    let chatWidget = null;
    let toggleButton = null;
    let messagesContainer = null;
    let inputField = null;
    let sendButton = null;

    /**
     * Initialize the chatbot widget
     */
    function init() {
        // Create DOM structure
        createChatWidget();
        createToggleButton();

        // Load previous session if exists
        loadSession();

        // Attach event listeners
        attachEventListeners();

        // Show initial greeting
        if (chatState.messageHistory.length === 0) {
            addBotMessage(CONFIG.GREETING_MESSAGE);
        }

        console.log('Sambodhan Chatbot initialized');
    }

    /**
     * Create the main chat widget HTML
     */
    function createChatWidget() {
        const chatHTML = `
            <div id="sambodhan-chatbot" class="hidden">
                <div class="chatbot-header">
                    <div>
                        <h3>Sambodhan Assistant</h3>
                        <div class="status">Online</div>
                    </div>
                    <button class="close-btn" id="close-chatbot" aria-label="Close chat">×</button>
                </div>
                <div class="chatbot-messages" id="chatbot-messages">
                    <!-- Messages will be added here dynamically -->
                </div>
                <div class="chatbot-input-area">
                    <textarea 
                        class="chatbot-input" 
                        id="chatbot-input" 
                        placeholder="Type your message..." 
                        rows="1"
                        maxlength="${CONFIG.MAX_MESSAGE_LENGTH}"
                    ></textarea>
                    <button class="send-btn" id="send-message" aria-label="Send message">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', chatHTML);

        // Cache DOM references
        chatWidget = document.getElementById('sambodhan-chatbot');
        messagesContainer = document.getElementById('chatbot-messages');
        inputField = document.getElementById('chatbot-input');
        sendButton = document.getElementById('send-message');
    }

    /**
     * Create the toggle button for opening chat
     */
    function createToggleButton() {
        const buttonHTML = `
            <button id="chatbot-toggle" aria-label="Open chat">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </button>
        `;

        document.body.insertAdjacentHTML('beforeend', buttonHTML);
        toggleButton = document.getElementById('chatbot-toggle');
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Toggle button
        toggleButton.addEventListener('click', openChat);

        // Close button
        document.getElementById('close-chatbot').addEventListener('click', closeChat);

        // Send button
        sendButton.addEventListener('click', sendMessage);

        // Enter key in input (shift+enter for new line)
        inputField.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-resize textarea
        inputField.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });
    }

    /**
     * Open the chat widget
     */
    function openChat() {
        chatWidget.classList.remove('hidden');
        toggleButton.classList.add('hidden');
        chatState.isOpen = true;
        inputField.focus();
        scrollToBottom();
    }

    /**
     * Close the chat widget
     */
    function closeChat() {
        chatWidget.classList.add('hidden');
        toggleButton.classList.remove('hidden');
        chatState.isOpen = false;
        saveSession();
    }

    /**
     * Send user message
     */
    async function sendMessage() {
        const message = inputField.value.trim();

        if (!message) {
            return;
        }

        if (message.length > CONFIG.MAX_MESSAGE_LENGTH) {
            alert(`Message is too long. Maximum ${CONFIG.MAX_MESSAGE_LENGTH} characters allowed.`);
            return;
        }

        // Display user message
        addUserMessage(message);

        // Clear input
        inputField.value = '';
        inputField.style.height = 'auto';

        // Disable input while processing
        setInputState(false);

        // Show typing indicator
        showTypingIndicator();

        try {
            // Call chatbot API with user authentication data
            const response = await fetch(`${CONFIG.API_BASE_URL}/chatbot/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    user_id: CONFIG.USER_DATA.user_id,
                    user_name: CONFIG.USER_DATA.user_name,
                    user_email: CONFIG.USER_DATA.user_email,
                    user_phone: CONFIG.USER_DATA.user_phone,
                    session_id: chatState.sessionId,
                    context: chatState.context
                })
            });

            hideTypingIndicator();

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            // Update context
            if (data.data) {
                chatState.context = { ...chatState.context, ...data.data };
            }

            // Display bot response
            addBotMessage(data.reply, data.intent);

            // Save session
            saveSession();

        } catch (error) {
            hideTypingIndicator();
            console.error('Chat error:', error);
            addBotMessage('Sorry, I encountered an error. Please try again.', 'error');
        } finally {
            setInputState(true);
            inputField.focus();
        }
    }

    /**
     * Add user message to chat
     */
    function addUserMessage(text) {
        const messageHTML = `
            <div class="message user">
                <div class="message-bubble">
                    ${escapeHtml(text)}
                    <span class="message-time">${getCurrentTime()}</span>
                </div>
            </div>
        `;

        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
        chatState.messageHistory.push({ role: 'user', text: text, time: new Date().toISOString() });
        scrollToBottom();
    }

    /**
     * Add bot message to chat
     */
    function addBotMessage(text, intent = 'info') {
        const messageHTML = `
            <div class="message bot ${intent === 'error' ? 'error' : ''}">
                <div class="message-bubble">
                    ${escapeHtml(text).replace(/\n/g, '<br>')}
                    <span class="message-time">${getCurrentTime()}</span>
                </div>
            </div>
        `;

        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
        chatState.messageHistory.push({ role: 'bot', text: text, intent: intent, time: new Date().toISOString() });
        scrollToBottom();
    }

    /**
     * Show typing indicator
     */
    function showTypingIndicator() {
        const indicatorHTML = `
            <div class="message bot" id="typing-indicator">
                <div class="message-bubble typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        messagesContainer.insertAdjacentHTML('beforeend', indicatorHTML);
        scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    function hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Enable/disable input controls
     */
    function setInputState(enabled) {
        inputField.disabled = !enabled;
        sendButton.disabled = !enabled;
    }

    /**
     * Scroll messages to bottom
     */
    function scrollToBottom() {
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }

    /**
     * Get current time formatted
     */
    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Save chat session to sessionStorage
     */
    function saveSession() {
        try {
            const sessionData = {
                sessionId: chatState.sessionId || generateSessionId(),
                context: chatState.context,
                messageHistory: chatState.messageHistory.slice(-20) // Keep last 20 messages
            };

            sessionStorage.setItem(CONFIG.SESSION_STORAGE_KEY, JSON.stringify(sessionData));
            chatState.sessionId = sessionData.sessionId;
        } catch (e) {
            console.warn('Failed to save chat session:', e);
        }
    }

    /**
     * Load chat session from sessionStorage
     */
    function loadSession() {
        try {
            const sessionData = sessionStorage.getItem(CONFIG.SESSION_STORAGE_KEY);

            if (sessionData) {
                const data = JSON.parse(sessionData);
                chatState.sessionId = data.sessionId;
                chatState.context = data.context || {};
                chatState.messageHistory = data.messageHistory || [];

                // Restore message history in UI
                data.messageHistory.forEach(msg => {
                    if (msg.role === 'user') {
                        addUserMessageSilent(msg.text);
                    } else {
                        addBotMessageSilent(msg.text, msg.intent);
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to load chat session:', e);
        }
    }

    /**
     * Add user message without updating state (for session restore)
     */
    function addUserMessageSilent(text) {
        const messageHTML = `
            <div class="message user">
                <div class="message-bubble">
                    ${escapeHtml(text)}
                </div>
            </div>
        `;

        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    }

    /**
     * Add bot message without updating state (for session restore)
     */
    function addBotMessageSilent(text, intent = 'info') {
        const messageHTML = `
            <div class="message bot ${intent === 'error' ? 'error' : ''}">
                <div class="message-bubble">
                    ${escapeHtml(text).replace(/\n/g, '<br>')}
                </div>
            </div>
        `;

        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    }

    /**
     * Generate unique session ID
     */
    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API (optional, for external control)
    window.SambodhanChatbot = {
        open: openChat,
        close: closeChat,
        sendMessage: function(text) {
            inputField.value = text;
            sendMessage();
        },
        /**
         * Set authenticated user data for the chatbot
         * Call this after user logs in to link complaints to their account
         * @param {Object} userData - User authentication data
         * @param {number} userData.user_id - User's ID from database
         * @param {string} userData.user_name - User's full name
         * @param {string} userData.user_email - User's email address
         * @param {string} userData.user_phone - User's phone number (optional)
         */
        setUser: function(userData) {
            CONFIG.USER_DATA.user_id = userData.user_id || null;
            CONFIG.USER_DATA.user_name = userData.user_name || null;
            CONFIG.USER_DATA.user_email = userData.user_email || null;
            CONFIG.USER_DATA.user_phone = userData.user_phone || null;
            console.log('Sambodhan Chatbot: User data updated', CONFIG.USER_DATA);
        },
        /**
         * Clear user data (call on logout)
         */
        clearUser: function() {
            CONFIG.USER_DATA = {
                user_id: null,
                user_name: null,
                user_email: null,
                user_phone: null
            };
            console.log('Sambodhan Chatbot: User data cleared');
        },
        /**
         * Get current user data
         */
        getUser: function() {
            return { ...CONFIG.USER_DATA };
        }
    };

})();
