/**
 * Attendance Management Module
 * 
 * Handles all attendance-related operations using Firestore:
 * - Opening/closing attendance sessions
 * - Student attendance marking
 * - Real-time attendance updates across all portals
 * - Auto-closing attendance after timer expires
 */

// Get current date in YYYY-MM-DD format
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

// Timer interval reference for cleanup
let attendanceTimerInterval = null;

/**
 * Opens an attendance session for the specified duration
 * Requires teacher role
 * @param {number} durationSeconds - Duration in seconds (default: 120 = 2 minutes)
 */
async function openAttendance(durationSeconds = 120) {
  // Check authentication
  const user = window.auth && window.auth.currentUser;
  if (!user) {
    alert('You must be logged in to open attendance.');
    throw new Error('Not authenticated');
  }

  // Check role
  if (window.authModule) {
    const role = await window.authModule.getUserRole(user.uid);
    if (role !== 'teacher') {
      alert('Only teachers can open attendance.');
      throw new Error('Unauthorized: Teacher role required');
    }
  }

  const date = getCurrentDate();
  const endTime = firebase.firestore.Timestamp.fromDate(
    new Date(Date.now() + durationSeconds * 1000)
  );

  try {
    // Update current attendance status
    await db.collection('attendance').doc('current').set({
      date: date,
      status: 'open',
      endTime: endTime,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Initialize or reset students array for today's attendance
    await db.collection('attendance').doc(date).set({
      status: 'open',
      endTime: endTime,
      students: [],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Start client-side timer for UI updates
    startAttendanceTimer(durationSeconds);

    console.log(`Attendance opened for ${durationSeconds} seconds`);
  } catch (error) {
    console.error('Error opening attendance:', error);
    if (!error.message.includes('Unauthorized') && !error.message.includes('authenticated')) {
      alert('Failed to open attendance. Please try again.');
    }
    throw error;
  }
}

/**
 * Closes the attendance session
 */
async function closeAttendance() {
  const date = getCurrentDate();

  try {
    // Update current attendance status
    await db.collection('attendance').doc('current').update({
      status: 'closed',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Update today's attendance document
    await db.collection('attendance').doc(date).update({
      status: 'closed',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Clear timer
    if (attendanceTimerInterval) {
      clearInterval(attendanceTimerInterval);
      attendanceTimerInterval = null;
    }

    console.log('Attendance closed');
  } catch (error) {
    console.error('Error closing attendance:', error);
  }
}

/**
 * Marks a student as present
 * Requires student role
 * @param {string} studentName - Name of the student
 * @returns {Promise<boolean>} - true if successfully marked, false otherwise
 */
async function markStudentPresent(studentName) {
  // Check authentication
  const user = window.auth && window.auth.currentUser;
  if (!user) {
    alert('You must be logged in to mark attendance.');
    return false;
  }

  // Check role
  if (window.authModule) {
    const role = await window.authModule.getUserRole(user.uid);
    if (role !== 'student') {
      alert('Only students can mark attendance.');
      return false;
    }
  }

  const date = getCurrentDate();
  const studentNameTrimmed = studentName.trim();

  if (!studentNameTrimmed) {
    alert('Please enter your name');
    return false;
  }

  try {
    // Check if attendance is open
    const currentDoc = await db.collection('attendance').doc('current').get();
    if (!currentDoc.exists || currentDoc.data().status !== 'open') {
      alert('Attendance is not open!');
      return false;
    }

    // Check if attendance has expired
    const endTime = currentDoc.data().endTime;
    if (endTime && endTime.toDate() < new Date()) {
      await closeAttendance();
      alert('Attendance time has expired!');
      return false;
    }

    // Get today's attendance document
    const dateDoc = await db.collection('attendance').doc(date);
    const dateDocSnap = await dateDoc.get();

    if (!dateDocSnap.exists || dateDocSnap.data().status !== 'open') {
      alert('Attendance is not open!');
      return false;
    }

    // Check if student already marked present
    const currentStudents = dateDocSnap.data().students || [];
    if (currentStudents.includes(studentNameTrimmed)) {
      alert('You have already marked your attendance!');
      return false;
    }

    // Add student to present list
    await dateDoc.update({
      students: firebase.firestore.FieldValue.arrayUnion(studentNameTrimmed)
    });

    alert('Marked present!');
    return true;
  } catch (error) {
    console.error('Error marking attendance:', error);
    alert('Failed to mark attendance. Please try again.');
    return false;
  }
}

/**
 * Sets up real-time listener for attendance status
 * Updates UI when attendance status changes
 */
function watchAttendanceStatus(updateCallback) {
  return db.collection('attendance').doc('current').onSnapshot((doc) => {
    if (doc.exists) {
      const data = doc.data();
      const isOpen = data.status === 'open';
      
      // Check if attendance has expired
      if (isOpen && data.endTime) {
        const endTime = data.endTime.toDate();
        if (endTime < new Date()) {
          // Attendance expired, close it
          closeAttendance();
          return;
        }
        
        // Update timer display
        const remaining = Math.max(0, Math.ceil((endTime - new Date()) / 1000));
        updateCallback({
          isOpen: true,
          remainingSeconds: remaining
        });
      } else {
        updateCallback({
          isOpen: false,
          remainingSeconds: 0
        });
      }
    } else {
      updateCallback({
        isOpen: false,
        remainingSeconds: 0
      });
    }
  }, (error) => {
    console.error('Error watching attendance status:', error);
  });
}

/**
 * Sets up real-time listener for present students list
 * Updates UI when students mark attendance
 */
function watchPresentStudents(date, updateCallback) {
  if (!date) date = getCurrentDate();

  return db.collection('attendance').doc(date).onSnapshot((doc) => {
    if (doc.exists) {
      const students = doc.data().students || [];
      updateCallback(students);
    } else {
      updateCallback([]);
    }
  }, (error) => {
    console.error('Error watching present students:', error);
    updateCallback([]);
  });
}

/**
 * Gets attendance data for a specific date
 * @param {string} date - Date in YYYY-MM-DD format (defaults to today)
 * @returns {Promise<Object>} - Attendance data
 */
async function getAttendanceData(date = null) {
  if (!date) date = getCurrentDate();
  
  try {
    const doc = await db.collection('attendance').doc(date).get();
    if (doc.exists) {
      return doc.data();
    }
    return { students: [], status: 'closed' };
  } catch (error) {
    console.error('Error getting attendance data:', error);
    return { students: [], status: 'closed' };
  }
}

/**
 * Client-side timer for UI updates (complementary to Firestore-based status)
 */
function startAttendanceTimer(durationSeconds) {
  // Clear any existing timer
  if (attendanceTimerInterval) {
    clearInterval(attendanceTimerInterval);
  }

  let timeLeft = durationSeconds;
  updateTimerDisplay(timeLeft, true);

  attendanceTimerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      updateTimerDisplay(timeLeft, true);
    } else {
      updateTimerDisplay(0, false);
      clearInterval(attendanceTimerInterval);
      attendanceTimerInterval = null;
    }
  }, 1000);
}

/**
 * Updates the timer display in the UI
 */
function updateTimerDisplay(seconds, isOpen) {
  const timerDisplay = document.getElementById('timerDisplay');
  if (!timerDisplay) return;

  if (isOpen && seconds > 0) {
    timerDisplay.innerHTML = `<span class="bg-green-500 text-white px-3 py-1 rounded-full text-sm">Attendance Open: ${seconds}s</span>`;
  } else {
    timerDisplay.innerHTML = `<span class="bg-red-500 text-white px-3 py-1 rounded-full text-sm">Attendance Closed</span>`;
  }
}

// Export functions for use in app.js
window.attendanceModule = {
  openAttendance,
  closeAttendance,
  markStudentPresent,
  watchAttendanceStatus,
  watchPresentStudents,
  getAttendanceData,
  getCurrentDate
};

