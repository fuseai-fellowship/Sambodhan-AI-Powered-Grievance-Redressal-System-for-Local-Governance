/**
 * Sambodhan Dashboard JavaScript
 * Handles user authentication, complaint management, and chatbot integration
 */

// Configuration
const API_BASE_URL = window.location.protocol === 'file:' 
    ? 'http://localhost:8000/api' 
    : window.location.origin + '/api';

// Global state
let currentUser = null;
let allComplaints = [];

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('sambodhan_token');
    
    if (!token) {
        // Not logged in, redirect to auth page
        window.location.href = 'auth.html';
        return;
    }
    
    // Load user profile and data
    await loadUserProfile();
    await loadUserComplaints();
    
    // Initialize chatbot with user data
    initializeChatbot();
});

// Load user profile
async function loadUserProfile() {
    const token = localStorage.getItem('sambodhan_token');
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            updateUI();
        } else {
            // Token invalid or expired
            handleLogout();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showError('Failed to load profile. Please try again.');
    }
}

// Update UI with user data
function updateUI() {
    if (!currentUser) return;
    
    // Update user name in top bar
    document.getElementById('userName').textContent = currentUser.name;
    
    // Update profile section
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profilePhone').textContent = currentUser.phone || 'Not provided';
    document.getElementById('profileRole').textContent = currentUser.role || 'Citizen';
    
    // Update profile initials
    const initials = currentUser.name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    document.getElementById('profileInitials').textContent = initials;
    
    // Update location
    let location = 'Not set';
    if (currentUser.district_name) {
        location = `${currentUser.district_name}, ${currentUser.municipality_name}, ${currentUser.ward_name}`;
    }
    document.getElementById('profileLocation').textContent = location;
    
    // Update created date
    if (currentUser.created_at) {
        const createdDate = new Date(currentUser.created_at);
        document.getElementById('profileCreatedAt').textContent = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Load user complaints
async function loadUserComplaints() {
    const token = localStorage.getItem('sambodhan_token');
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/complaints`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            allComplaints = await response.json();
            displayComplaints(allComplaints);
            updateStats(allComplaints);
            displayRecentComplaints(allComplaints.slice(0, 3));
        } else {
            document.getElementById('complaintsList').innerHTML = '<p class="loading">Failed to load complaints.</p>';
        }
    } catch (error) {
        console.error('Error loading complaints:', error);
        document.getElementById('complaintsList').innerHTML = '<p class="loading">Error loading complaints.</p>';
    }
}

// Update statistics
function updateStats(complaints) {
    const total = complaints.length;
    const pending = complaints.filter(c => c.status === 'Pending').length;
    const inProgress = complaints.filter(c => c.status === 'In Progress').length;
    const resolved = complaints.filter(c => c.status === 'Resolved').length;
    
    document.getElementById('totalComplaints').textContent = total;
    document.getElementById('pendingComplaints').textContent = pending;
    document.getElementById('inProgressComplaints').textContent = inProgress;
    document.getElementById('resolvedComplaints').textContent = resolved;
}

// Display complaints
function displayComplaints(complaints) {
    const container = document.getElementById('complaintsList');
    
    if (complaints.length === 0) {
        container.innerHTML = '<p class="loading">No complaints found. Use the chatbot to file your first complaint!</p>';
        return;
    }
    
    container.innerHTML = complaints.map(complaint => createComplaintCard(complaint)).join('');
}

// Display recent complaints
function displayRecentComplaints(complaints) {
    const container = document.getElementById('recentComplaintsList');
    
    if (complaints.length === 0) {
        container.innerHTML = '<p class="loading">No complaints yet. Start by chatting with our AI assistant!</p>';
        return;
    }
    
    container.innerHTML = complaints.map(complaint => createComplaintCard(complaint)).join('');
}

// Create complaint card HTML
function createComplaintCard(complaint) {
    const createdDate = new Date(complaint.created_at);
    const formattedDate = createdDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    const location = complaint.district && complaint.municipality && complaint.ward
        ? `${complaint.district}, ${complaint.municipality}, ${complaint.ward}`
        : 'Location not specified';
    
    return `
        <div class="complaint-card">
            <div class="complaint-header">
                <span class="complaint-id">Complaint #${complaint.id}</span>
                <span class="complaint-date">${formattedDate}</span>
            </div>
            
            <p class="complaint-message">${complaint.message}</p>
            
            <div class="complaint-meta">
                <span class="status-badge status-${complaint.status.replace(' ', '-')}">${complaint.status}</span>
                <span class="meta-badge urgency-${complaint.urgency}">🔥 ${complaint.urgency}</span>
                <span class="meta-badge" style="background: #f0f4ff; color: #667eea;">📂 ${complaint.department}</span>
            </div>
            
            <div class="complaint-location">
                📍 ${location}
            </div>
        </div>
    `;
}

// Filter complaints by status
function filterComplaints() {
    const filter = document.getElementById('statusFilter').value;
    
    if (filter === 'all') {
        displayComplaints(allComplaints);
    } else {
        const filtered = allComplaints.filter(c => c.status === filter);
        displayComplaints(filtered);
    }
}

// Show section
function showSection(sectionName) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'complaints': 'My Complaints',
        'file-complaint': 'File Complaint',
        'profile': 'Profile'
    };
    document.getElementById('pageTitle').textContent = titles[sectionName] || 'Dashboard';
    
    // Show selected section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

// Toggle sidebar (mobile)
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// Logout
function handleLogout() {
    // Clear stored data
    localStorage.removeItem('sambodhan_token');
    localStorage.removeItem('sambodhan_user');
    
    // Clear chatbot user data
    if (window.SambodhanChatbot && window.SambodhanChatbot.clearUser) {
        window.SambodhanChatbot.clearUser();
    }
    
    // Redirect to auth page
    window.location.href = 'auth.html';
}

// Initialize chatbot with user data
function initializeChatbot() {
    if (!currentUser) return;
    
    // Wait for chatbot to load
    const checkChatbot = setInterval(() => {
        if (window.SambodhanChatbot && window.SambodhanChatbot.setUser) {
            window.SambodhanChatbot.setUser({
                user_id: currentUser.id,
                user_name: currentUser.name,
                user_email: currentUser.email,
                user_phone: currentUser.phone
            });
            clearInterval(checkChatbot);
        }
    }, 100);
    
    // Stop checking after 5 seconds
    setTimeout(() => clearInterval(checkChatbot), 5000);
}

// Open chatbot
function openChatbot() {
    if (window.SambodhanChatbot && window.SambodhanChatbot.open) {
        window.SambodhanChatbot.open();
    }
}

// Show error message
function showError(message) {
    alert(message); // Simple alert for now, can be enhanced
}

// Reload complaints (called after chatbot files a complaint)
window.reloadComplaints = async function() {
    await loadUserComplaints();
};

// Listen for chatbot events
window.addEventListener('chatbot:complaint-filed', async () => {
    await loadUserComplaints();
    
    // Show success notification
    alert('Complaint filed successfully! Check "My Complaints" to see it.');
});
