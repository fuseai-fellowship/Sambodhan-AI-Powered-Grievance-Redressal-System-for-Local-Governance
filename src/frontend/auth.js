/**
 * Sambodhan Authentication JavaScript
 * Handles login, signup, password validation, and JWT token storage
 */

// Configuration
const API_BASE_URL = window.location.protocol === 'file:' 
    ? 'http://localhost:8000/api' 
    : window.location.origin + '/api';

// Check if already logged in
if (localStorage.getItem('sambodhan_token')) {
    window.location.href = 'dashboard.html';
}

// Switch between login and signup tabs
function switchTab(tab) {
    const loginTab = document.querySelector('.auth-tab:nth-child(1)');
    const signupTab = document.querySelector('.auth-tab:nth-child(2)');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const errorMsg = document.getElementById('errorMessage');
    const successMsg = document.getElementById('successMessage');
    
    // Clear messages
    errorMsg.classList.remove('show');
    successMsg.classList.remove('show');
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
    } else {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
    }
}

// Password strength checker
function checkPasswordStrength() {
    const password = document.getElementById('signupPassword').value;
    const strengthBar = document.getElementById('passwordStrengthBar');
    const strengthContainer = document.getElementById('passwordStrength');
    const hint = document.getElementById('passwordHint');
    
    if (password.length === 0) {
        strengthContainer.classList.remove('show');
        hint.classList.remove('show');
        return;
    }
    
    strengthContainer.classList.add('show');
    hint.classList.add('show');
    
    let strength = 0;
    let feedback = [];
    
    // Length check
    if (password.length >= 8) strength += 1;
    else feedback.push('at least 8 characters');
    
    // Uppercase check
    if (/[A-Z]/.test(password)) strength += 1;
    else feedback.push('an uppercase letter');
    
    // Lowercase check
    if (/[a-z]/.test(password)) strength += 1;
    else feedback.push('a lowercase letter');
    
    // Number check
    if (/[0-9]/.test(password)) strength += 1;
    else feedback.push('a number');
    
    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    else feedback.push('a special character');
    
    // Update strength bar
    strengthBar.className = 'password-strength-bar';
    if (strength <= 2) {
        strengthBar.classList.add('strength-weak');
        hint.innerHTML = '⚠️ Weak password. Add: ' + feedback.slice(0, 2).join(', ');
        hint.style.color = '#ff4757';
    } else if (strength <= 4) {
        strengthBar.classList.add('strength-medium');
        hint.innerHTML = '⚡ Medium password. Add: ' + feedback.join(', ');
        hint.style.color = '#ffa502';
    } else {
        strengthBar.classList.add('strength-strong');
        hint.innerHTML = '✅ Strong password!';
        hint.style.color = '#26de81';
    }
}

// Show error message
function showError(message) {
    const errorMsg = document.getElementById('errorMessage');
    const successMsg = document.getElementById('successMessage');
    
    successMsg.classList.remove('show');
    errorMsg.textContent = message;
    errorMsg.classList.add('show');
    
    setTimeout(() => {
        errorMsg.classList.remove('show');
    }, 5000);
}

// Show success message
function showSuccess(message) {
    const errorMsg = document.getElementById('errorMessage');
    const successMsg = document.getElementById('successMessage');
    
    errorMsg.classList.remove('show');
    successMsg.textContent = message;
    successMsg.classList.add('show');
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    
    // Validation
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loading-spinner"></span> Logging in...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Store token and user data
            localStorage.setItem('sambodhan_token', data.token);
            localStorage.setItem('sambodhan_user', JSON.stringify(data.user));
            
            showSuccess('Login successful! Redirecting...');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showError(data.detail || 'Invalid email or password');
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Login';
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please check your connection and try again.');
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Login';
    }
}

// Handle signup form submission
async function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value;
    const wardId = document.getElementById('signupWard').value;
    const signupBtn = document.getElementById('signupBtn');
    
    // Validation
    if (!name || !email || !phone || !password) {
        showError('Please fill in all required fields');
        return;
    }
    
    if (name.length < 2) {
        showError('Name must be at least 2 characters long');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }
    
    if (phone.length < 10) {
        showError('Please enter a valid phone number');
        return;
    }
    
    // Disable button and show loading
    signupBtn.disabled = true;
    signupBtn.innerHTML = '<span class="loading-spinner"></span> Creating account...';
    
    try {
        const requestBody = {
            name: name,
            email: email,
            phone: phone,
            password: password
        };
        
        // Add ward_id if selected
        if (wardId) {
            requestBody.ward_id = parseInt(wardId);
        }
        
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Store token and user data
            localStorage.setItem('sambodhan_token', data.token);
            localStorage.setItem('sambodhan_user', JSON.stringify(data.user));
            
            showSuccess('Account created successfully! Redirecting...');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showError(data.detail || 'Failed to create account. Please try again.');
            signupBtn.disabled = false;
            signupBtn.innerHTML = 'Create Account';
        }
    } catch (error) {
        console.error('Signup error:', error);
        showError('Network error. Please check your connection and try again.');
        signupBtn.disabled = false;
        signupBtn.innerHTML = 'Create Account';
    }
}

// Load wards for signup form
async function loadWards() {
    try {
        const response = await fetch(`${API_BASE_URL}/geo/wards`);
        const data = await response.json();
        
        if (data.success && data.data) {
            const wardSelect = document.getElementById('signupWard');
            
            // Group wards by municipality
            data.data.forEach(ward => {
                const option = document.createElement('option');
                option.value = ward.id;
                option.textContent = `Ward ${ward.ward_number} (ID: ${ward.id})`;
                wardSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading wards:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadWards();
});
