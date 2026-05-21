
/**
 * Submissions, Deadlines, Notices, and Parent Messages Module
 * 
 * Handles all non-attendance operations using Firestore:
 * - Work submissions management
 * - Deadline setting and tracking
 * - Notice posting
 * - Parent-teacher messaging
 * - Real-time updates across all portals
 */

/**
 * Submits work for a student
 * Requires student role
 * @param {string} studentName - Name of the student
 * @param {string} content - Submission content
 * @returns {Promise<boolean>} - true if successfully submitted, false otherwise
 */
async function submitWork(studentName, content) {
  // Check authentication
  const user = window.auth && window.auth.currentUser;
  if (!user) {
    alert('You must be logged in to submit work.');
    return false;
  }

  // Check role
  if (window.authModule) {
    const role = await window.authModule.getUserRole(user.uid);
    if (role !== 'student') {
      alert('Only students can submit work.');
      return false;
    }
  }

  const studentNameTrimmed = studentName.trim();
  const contentTrimmed = content.trim();

  if (!studentNameTrimmed) {
    alert('Enter your name to submit!');
    return false;
  }

  if (!contentTrimmed) {
    alert('Enter your submission content!');
    return false;
  }

  try {
    // Get current deadline to associate submission
    const deadlineDoc = await db.collection('submissions').doc('currentDeadline').get();
    if (!deadlineDoc.exists) {
      alert('No deadline set. Please wait for teacher to set a deadline.');
      return false;
    }
    const deadlineDate = deadlineDoc.data().date;
    if (!deadlineDate) {
      alert('No deadline date set. Please wait for teacher to set a deadline.');
      return false;
    }

    // Check if student already submitted
    const existingSubmissions = await db.collection('submissions')
      .where('studentName', '==', studentNameTrimmed)
      .where('deadlineDate', '==', deadlineDate)
      .get();

    if (!existingSubmissions.empty) {
      alert('You already submitted.');
      return false;
    }

    // Create submission
    await db.collection('submissions').add({
      studentName: studentNameTrimmed,
      content: contentTrimmed,
      deadlineDate: deadlineDate,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert('Work submitted successfully!');
    return true;
  } catch (error) {
    console.error('Error submitting work:', error);
    alert('Failed to submit work. Please try again.');
    return false;
  }
}

/**
 * Sets a submission deadline
 * Requires teacher role
 * @param {string} date - Deadline date (YYYY-MM-DD format)
 * @param {string} description - Task description (optional)
 */
async function setDeadline(date, description = '') {
  // Check authentication
  const user = window.auth && window.auth.currentUser;
  if (!user) {
    alert('You must be logged in to set deadlines.');
    return;
  }

  // Check role
  if (window.authModule) {
    const role = await window.authModule.getUserRole(user.uid);
    if (role !== 'teacher') {
      alert('Only teachers can set deadlines.');
      return;
    }
  }

  if (!date) {
    alert('Please select a deadline date');
    return;
  }

  try {
    await db.collection('submissions').doc('currentDeadline').set({
      date: date,
      description: description.trim() || '',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log('Deadline set:', date);
    alert('Deadline set successfully!');
  } catch (error) {
    console.error('Error setting deadline:', error);
    alert('Failed to set deadline. Please check console for details.');
    throw error;
  }
}

/**
 * Sets up real-time listener for current deadline
 * Updates UI when deadline changes
 */
function watchDeadline(updateCallback) {
  return db.collection('submissions').doc('currentDeadline').onSnapshot((doc) => {
    if (doc.exists) {
      const data = doc.data();
      updateCallback({
        date: data.date || null,
        description: data.description || ''
      });
    } else {
      updateCallback({ date: null, description: '' });
    }
  }, (error) => {
    console.error('Error watching deadline:', error);
    updateCallback({ date: null, description: '' });
  });
}

/**
 * Sets up real-time listener for submissions
 * Updates UI when students submit work
 */
function watchSubmissions(deadlineDate, updateCallback) {
  if (!deadlineDate) {
    updateCallback([]);
    return () => {};
  }

  return db.collection('submissions')
    .where('deadlineDate', '==', deadlineDate)
    .orderBy('timestamp', 'desc')
    .onSnapshot((snapshot) => {
      const submissions = [];
      snapshot.forEach((doc) => {
        submissions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      updateCallback(submissions);
    }, (error) => {
      console.error('Error watching submissions:', error);
      updateCallback([]);
    });
}

/**
 * Gets all submissions for a specific deadline
 * @param {string} deadlineDate - Deadline date (YYYY-MM-DD format)
 * @returns {Promise<Array>} - Array of submission objects
 */
async function getSubmissions(deadlineDate) {
  if (!deadlineDate) return [];

  try {
    const snapshot = await db.collection('submissions')
      .where('deadlineDate', '==', deadlineDate)
      .orderBy('timestamp', 'desc')
      .get();

    const submissions = [];
    snapshot.forEach((doc) => {
      submissions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return submissions;
  } catch (error) {
    console.error('Error getting submissions:', error);
    return [];
  }
}

/**
 * Posts a notice for students and parents
 * Requires teacher role
 * @param {string} noticeText - Notice content
 */
async function postNotice(noticeText) {
  // Check authentication
  const user = window.auth && window.auth.currentUser;
  if (!user) {
    alert('You must be logged in to post notices.');
    return;
  }

  // Check role
  if (window.authModule) {
    const role = await window.authModule.getUserRole(user.uid);
    if (role !== 'teacher') {
      alert('Only teachers can post notices.');
      return;
    }
  }

  const text = noticeText.trim();

  if (!text) {
    alert('Please enter a notice');
    return;
  }

  try {
    await db.collection('notices').doc('current').set({
      text: text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log('Notice posted');
  } catch (error) {
    console.error('Error posting notice:', error);
    alert('Failed to post notice. Please try again.');
  }
}

/**
 * Sets up real-time listener for current notice
 * Updates UI when notice changes
 */
function watchNotice(updateCallback) {
  return db.collection('notices').doc('current').onSnapshot((doc) => {
    if (doc.exists) {
      const notice = doc.data().text || 'No notice';
      updateCallback(notice);
    } else {
      updateCallback('No notice');
    }
  }, (error) => {
    console.error('Error watching notice:', error);
    updateCallback('No notice');
  });
}

/**
 * Sends a message from parent to teacher
 * Requires parent role
 * @param {string} childName - Name of the child
 * @param {string} message - Message content
 */
async function sendParentMessage(childName, message) {
  // Check authentication
  const user = window.auth && window.auth.currentUser;
  if (!user) {
    alert('You must be logged in to send messages.');
    return;
  }

  // Check role
  if (window.authModule) {
    const role = await window.authModule.getUserRole(user.uid);
    if (role !== 'parent') {
      alert('Only parents can send messages.');
      return;
    }
  }

  const childNameTrimmed = childName.trim();
  const messageTrimmed = message.trim();

  if (!childNameTrimmed) {
    alert('Please enter your child\'s name');
    return;
  }

  if (!messageTrimmed) {
    alert('Please enter a message');
    return;
  }

  try {
    await db.collection('parentMessages').add({
      childName: childNameTrimmed,
      message: messageTrimmed,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      read: false
    });

    alert('Message sent to teacher!');
  } catch (error) {
    console.error('Error sending parent message:', error);
    alert('Failed to send message. Please try again.');
  }
}

/**
 * Sets up real-time listener for parent messages
 * Updates teacher UI when new messages arrive
 */
function watchParentMessages(updateCallback) {
  return db.collection('parentMessages')
    .orderBy('timestamp', 'desc')
    .limit(10)
    .onSnapshot((snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      updateCallback(messages);
    }, (error) => {
      console.error('Error watching parent messages:', error);
      updateCallback([]);
    });
}

/**
 * Sends a reply from teacher to parent
 * Requires teacher role
 * @param {string} replyText - Reply content
 */
async function sendParentReply(replyText) {
  // Check authentication
  const user = window.auth && window.auth.currentUser;
  if (!user) {
    alert('You must be logged in to send replies.');
    return;
  }

  // Check role
  if (window.authModule) {
    const role = await window.authModule.getUserRole(user.uid);
    if (role !== 'teacher') {
      alert('Only teachers can send replies.');
      return;
    }
  }

  const text = replyText.trim();

  if (!text) {
    alert('Please enter a reply');
    return;
  }

  try {
    // Store as a general reply (can be enhanced to be child-specific)
    await db.collection('parentReplies').doc('latest').set({
      reply: text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert('Reply sent to parents');
  } catch (error) {
    console.error('Error sending reply:', error);
    alert('Failed to send reply. Please try again.');
  }
}

/**
 * Sets up real-time listener for teacher reply
 * Updates parent UI when teacher replies
 */
function watchParentReply(updateCallback) {
  return db.collection('parentReplies').doc('latest').onSnapshot((doc) => {
    if (doc.exists) {
      const reply = doc.data().reply || 'No reply';
      updateCallback(reply);
    } else {
      updateCallback('No reply');
    }
  }, (error) => {
    console.error('Error watching parent reply:', error);
    updateCallback('No reply');
  });
}

/**
 * Updates class information (name and strength)
 * Requires teacher role
 * @param {string} className - Class name
 * @param {number} strength - Class strength
 */
async function updateClassInfo(className, strength) {
  // Check authentication
  const user = window.auth && window.auth.currentUser;
  if (!user) {
    console.warn('Not authenticated - class info update skipped');
    return;
  }

  // Check role
  if (window.authModule) {
    const role = await window.authModule.getUserRole(user.uid);
    if (role !== 'teacher') {
      console.warn('Not authorized - only teachers can update class info');
      return;
    }
  }

  try {
    await db.collection('classInfo').doc('current').set({
      className: className || '',
      strength: parseInt(strength) || 0,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating class info:', error);
  }
}

/**
 * Sets up real-time listener for class information
 * Updates UI when class info changes
 */
function watchClassInfo(updateCallback) {
  return db.collection('classInfo').doc('current').onSnapshot((doc) => {
    if (doc.exists) {
      const data = doc.data();
      updateCallback({
        className: data.className || '',
        strength: data.strength || 0
      });
    } else {
      updateCallback({
        className: '',
        strength: 0
      });
    }
  }, (error) => {
    console.error('Error watching class info:', error);
    updateCallback({
      className: '',
      strength: 0
    });
  });
}

// Export functions for use in app.js
window.submissionsModule = {
  submitWork,
  setDeadline,
  watchDeadline,
  watchSubmissions,
  getSubmissions,
  postNotice,
  watchNotice,
  sendParentMessage,
  watchParentMessages,
  sendParentReply,
  watchParentReply,
  updateClassInfo,
  watchClassInfo
};


