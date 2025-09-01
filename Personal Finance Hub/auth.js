
class AuthService {
    constructor() {
        
        let base = window.location.origin;
        if (window.location.protocol === 'file:' || base === 'null') {
            base = 'http://localhost:3000';
        }
        const saved = localStorage.getItem('apiBase');
        this.API_BASE = saved || base;
    }

    
    async apiRequest(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const config = { ...defaultOptions, ...options };
        if (config.headers) {
            config.headers = { ...defaultOptions.headers, ...options.headers };
        }

        try {
            const response = await fetch(`${this.API_BASE}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    
    async register(name, email, password) {
        try {
            const data = await this.apiRequest('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password })
            });

            
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);

            return data.user;
        } catch (error) {
            throw new Error(error.message || 'Registration failed');
        }
    }

    
    async login(email, password) {
        try {
            const data = await this.apiRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);

            return data.user;
        } catch (error) {
            throw new Error(error.message || 'Login failed');
        }
    }

    
    isLoggedIn() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        return token && user;
    }

    
    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    
    getToken() {
        return localStorage.getItem('token');
    }

    
    logout() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }

    
    async validateToken() {
        const token = this.getToken();
        if (!token) return false;

        try {
            await this.apiRequest('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return true;
        } catch (error) {
            
            this.logout();
            return false;
        }
    }
}


const authService = new AuthService();


function showLoading(button, isLoading = true) {
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }
}


function showNotification(message, isError = false) {
    
    const notification = document.createElement('div');
    notification.className = `alert ${isError ? 'alert-danger' : 'alert-success'} position-fixed`;
    notification.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'} me-2"></i>
            <span>${message}</span>
            <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;

    document.body.appendChild(notification);

    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}


if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const submitButton = e.target.querySelector('button[type="submit"]');

        if (!email || !password) {
            showNotification('Please fill in all fields', true);
            return;
        }

        showLoading(submitButton, true);

        try {
            await authService.login(email, password);
            showNotification('Login successful! Redirecting...');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } catch (error) {
            showNotification(error.message, true);
        } finally {
            showLoading(submitButton, false);
        }
    });
}


if (document.getElementById('signupForm')) {
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nameInput = document.getElementById('name');
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        const derivedName = nameInput?.value?.trim() || [firstNameInput?.value, lastNameInput?.value]
          .filter(Boolean)
          .join(' ')
          .trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const submitButton = e.target.querySelector('button[type="submit"]');

        if (!derivedName || !email || !password || !confirmPassword) {
            showNotification('Please fill in all fields', true);
            return;
        }

        if (password !== confirmPassword) {
            showNotification('Passwords do not match', true);
            return;
        }

        if (password.length < 6) {
            showNotification('Password must be at least 6 characters long', true);
            return;
        }

        showLoading(submitButton, true);

        try {
            await authService.register(derivedName, email, password);
            showNotification('Registration successful! Redirecting...');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } catch (error) {
            showNotification(error.message, true);
        } finally {
            showLoading(submitButton, false);
        }
    });
}


document.addEventListener('DOMContentLoaded', async () => {
    
    if (window.location.pathname.includes('login.html') || 
        window.location.pathname.includes('signup.html')) {
        return;
    }

    
    if (!authService.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    
    const isValid = await authService.validateToken();
    if (!isValid) {
        showNotification('Session expired. Please login again.', true);
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
});


const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);