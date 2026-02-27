/* ============================================
   JIYU — Authentication (Google + Guest)
   ============================================ */

const JiyuAuth = (() => {
    // Replace with your Google OAuth Client ID
    const GOOGLE_CLIENT_ID = '181282592468-34bjd9ju2k1rcocbjhbqg2nmjuft3inb.apps.googleusercontent.com';

    let onAuthChangeCallback = null;

    function init() {
        // Check if Google Identity Services is available
        if (GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID' && window.google?.accounts?.id) {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCallback,
            });

            const googleBtn = document.getElementById('google-signin-btn');
            if (googleBtn) {
                googleBtn.style.display = 'flex';
                googleBtn.addEventListener('click', () => {
                    window.google.accounts.id.prompt();
                });
            }
        }
    }

    function handleGoogleCallback(response) {
        try {
            const payload = parseJwt(response.credential);
            const user = {
                name: payload.name,
                email: payload.email,
                picture: payload.picture,
                provider: 'google',
            };
            JiyuMemory.setAuthUser(user);
            if (user.name && !JiyuMemory.getUserName()) {
                JiyuMemory.setUserName(user.name.split(' ')[0]);
            }
            if (onAuthChangeCallback) onAuthChangeCallback(user);
        } catch (e) {
            console.error('Google auth error:', e);
        }
    }

    function parseJwt(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')));
    }

    function loginAsGuest() {
        const user = { name: 'Guest', provider: 'guest' };
        JiyuMemory.setAuthUser(user);
        if (onAuthChangeCallback) onAuthChangeCallback(user);
    }

    function signOut() {
        JiyuMemory.clearAuthUser();
        if (onAuthChangeCallback) onAuthChangeCallback(null);
    }

    function getCurrentUser() {
        return JiyuMemory.getAuthUser();
    }

    function isLoggedIn() {
        return !!getCurrentUser();
    }

    function onAuthChange(cb) {
        onAuthChangeCallback = cb;
    }

    return {
        init,
        loginAsGuest,
        signOut,
        getCurrentUser,
        isLoggedIn,
        onAuthChange,
    };
})();
