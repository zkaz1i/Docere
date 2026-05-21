/**
 * Authentication Module
 * 
 * Handles all authentication and authorization operations:
 * - User login/logout
 * - Role management from Firestore
 * - Route protection
 * - User data fetching
 */

/**
 * Gets the current authenticated user's role from Firestore
 * @param {string} uid - User ID
 * @returns {Promise<string|null>} - User role or null if not found
 */
async function getUserRole(uid) {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      return userDoc.data().role || null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

/**
 * Gets complete user data from Firestore
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} - User data or null if not found
 */
async function getUserData(uid) {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      return { uid: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}

/**
 * Logs in a user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - { success: boolean, role: string|null, error: string|null }
 */
async function login(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;
    
    // Fetch user role from Firestore
    const role = await getUserRole(uid);
    
    if (!role) {
      // User exists but has no role assigned
      await auth.signOut();
      return {
        success: false,
        role: null,
        error: 'No role assigned. Please contact administrator.'
      };
    }
    
    return {
      success: true,
      role: role,
      uid: uid,
      error: null
    };
  } catch (error) {
    let errorMessage = 'Login failed. Please check your credentials.';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled.';
    }
    
    return {
      success: false,
      role: null,
      error: errorMessage
    };
  }
}

/**
 * Logs out the current user
 * @returns {Promise<void>}
 */
async function logout() {
  try {
    await auth.signOut();
    // Redirect to login page
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Error logging out:', error);
    alert('Error logging out. Please try again.');
  }
}

/**
 * Checks if user is authenticated and has required role
 * @param {string} requiredRole - Required role ('teacher', 'student', or 'parent')
 * @returns {Promise<Object>} - { authorized: boolean, user: Object|null, role: string|null }
 */
async function checkAuthAndRole(requiredRole) {
  return new Promise((resolve) => {
    // Wait for auth state to be determined
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        // Not authenticated
        resolve({ authorized: false, user: null, role: null });
        return;
      }
      
      // Fetch user role
      const role = await getUserRole(user.uid);
      
      if (!role) {
        // User has no role
        resolve({ authorized: false, user: null, role: null });
        return;
      }
      
      if (role !== requiredRole) {
        // Wrong role
        resolve({ authorized: false, user: user, role: role });
        return;
      }
      
      // Authorized
      const userData = await getUserData(user.uid);
      resolve({ authorized: true, user: userData, role: role });
    });
  });
}

/**
 * Protects a route by checking authentication and role
 * Redirects to login if unauthorized
 * @param {string} requiredRole - Required role for this page
 * @param {Function} onAuthorized - Callback when user is authorized (receives user data)
 */
async function protectRoute(requiredRole, onAuthorized) {
  const authCheck = await checkAuthAndRole(requiredRole);
  
  if (!authCheck.authorized) {
    // Redirect to login
    window.location.href = 'login.html';
    return;
  }
  
  // User is authorized, call callback with user data
  if (onAuthorized && typeof onAuthorized === 'function') {
    onAuthorized(authCheck.user);
  }
}

/**
 * Gets current authenticated user (if any)
 * @returns {Object|null} - Firebase user object or null
 */
function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Checks if user is currently authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
  return auth.currentUser !== null;
}

/**
 * Waits for auth state to be determined and returns user
 * Useful for ensuring auth state is loaded before checking
 * @returns {Promise<Object|null>} - Firebase user object or null
 */
function waitForAuthState() {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe(); // Unsubscribe after first state change
      resolve(user);
    });
  });
}

// Export functions for use in other modules
window.authModule = {
  login,
  logout,
  getUserRole,
  getUserData,
  checkAuthAndRole,
  protectRoute,
  getCurrentUser,
  isAuthenticated,
  waitForAuthState
};

