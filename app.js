
/**
 * Main Application Logic - Refactored to use Firebase Firestore
 * 
 * All state is now managed in Firestore, enabling:
 * - Shared state across all users/devices
 * - Real-time updates via Firestore listeners
 * - Persistence across page refreshes
 * - No local state variables
 */

document.addEventListener("DOMContentLoaded", function() {
  // Wait for Firebase to initialize
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. Make sure firebase.js is included before app.js');
    return;
  }

  // DOM Element References
  const roleBox = document.getElementById("roleBox");
  const teacherBox = document.getElementById("teacherBox");
  const studentBox = document.getElementById("studentBox");
  const parentBox = document.getElementById("parentBox");

  const className = document.getElementById("className");
  const strength = document.getElementById("strength");

  const total = document.getElementById("total");
  const present = document.getElementById("present");
  const absent = document.getElementById("absent");
  const presentList = document.getElementById("presentList");

  const submittedSpan = document.getElementById("submitted");
  const notSubmitted = document.getElementById("notSubmitted");
  const submissionList = document.getElementById("submissionList");
  const studentDeadline = document.getElementById("studentDeadline");
  const studentNotice = document.getElementById("studentNotice");

  const parentClass = document.getElementById("parentClass");
  const pTotal = document.getElementById("pTotal");
  const pPresent = document.getElementById("pPresent");
  const pAbsent = document.getElementById("pAbsent");
  const parentPresentList = document.getElementById("parentPresentList");
  const parentReply = document.getElementById("parentReply");
  const parentNotice = document.getElementById("parentNotice");

  const noticeText = document.getElementById("noticeText");
  const replyText = document.getElementById("replyText");

  const studentNameInput = document.getElementById("studentName");
  const attendanceBtn = document.getElementById("attendanceBtn");
  const timerDisplay = document.getElementById("timerDisplay");

  // Store unsubscribe functions for cleanup
  const unsubscribeFunctions = {
    attendanceStatus: null,
    presentStudents: null,
    classInfo: null,
    deadline: null,
    submissions: null,
    notice: null,
    parentMessages: null,
    parentReply: null
  };

  // Current state (derived from Firestore, not stored locally)
  let currentClassInfo = { className: '', strength: 0 };
  let currentDeadlineDate = null;
  let currentSubmissions = [];

  // ========== ROLE SELECTION ==========
  document.getElementById("btnTeacher").addEventListener("click", () => {
    roleBox.classList.add("hidden");
    teacherBox.classList.remove("hidden");
    setupTeacherListeners();
  });

  document.getElementById("btnStudent").addEventListener("click", () => {
    roleBox.classList.add("hidden");
    studentBox.classList.remove("hidden");
    setupStudentListeners();
  });

  document.getElementById("btnParent").addEventListener("click", () => {
    roleBox.classList.add("hidden");
    parentBox.classList.remove("hidden");
    setupParentListeners();
  });

  // ========== BACK BUTTONS ==========
  document.querySelectorAll(".backBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      teacherBox.classList.add("hidden");
      studentBox.classList.add("hidden");
      parentBox.classList.add("hidden");
      roleBox.classList.remove("hidden");
      cleanupListeners();
    });
  });

  // ========== ATTENDANCE ==========
  attendanceBtn.addEventListener("click", async () => {
    attendanceBtn.disabled = true;
    await window.attendanceModule.openAttendance(120);
    // Button will be re-enabled by the status listener
  });

  // Student mark attendance
  document.getElementById("btnMarkSelfPresent").addEventListener("click", async function() {
    const studentName = studentNameInput.value.trim();
    const success = await window.attendanceModule.markStudentPresent(studentName);
    if (success) {
      studentNameInput.value = "";
    }
  });

  // ========== SUBMISSIONS ==========
  // Student submit work
  document.getElementById("btnSubmitWork").addEventListener("click", async function() {
    const studentName = studentNameInput.value.trim();
    const content = document.getElementById("submissionContent").value.trim();
    const success = await window.submissionsModule.submitWork(studentName, content);
    if (success) {
      document.getElementById("submissionContent").value = "";
    }
  });

  // Set deadline
  document.getElementById("btnSetDeadline").addEventListener("click", async function() {
    const date = document.getElementById("deadline").value;
    await window.submissionsModule.setDeadline(date);
  });

  // Send reminder (informational only - can be enhanced later)
  document.getElementById("btnSendReminder").addEventListener("click", function() {
    alert("Reminder sent to students who haven't submitted!");
  });

  // ========== NOTICES ==========
  document.getElementById("btnPostNotice").addEventListener("click", async function() {
    await window.submissionsModule.postNotice(noticeText.value);
    noticeText.value = "";
  });

  // ========== PARENT-TEACHER COMMUNICATION ==========
  document.getElementById("btnSendReply").addEventListener("click", async function() {
    await window.submissionsModule.sendParentReply(replyText.value);
    replyText.value = "";
  });

  document.getElementById("btnSendMessage").addEventListener("click", async function() {
    const childName = document.getElementById("childName").value.trim();
    const message = document.getElementById("parentMessage").value.trim();
    await window.submissionsModule.sendParentMessage(childName, message);
    document.getElementById("parentMessage").value = "";
  });

  // ========== CLASS INFO UPDATES ==========
  // Update class info when teacher changes it
  className.addEventListener("input", () => {
    window.submissionsModule.updateClassInfo(className.value, strength.value);
  });

  strength.addEventListener("input", () => {
    window.submissionsModule.updateClassInfo(className.value, strength.value);
  });

  // ========== REAL-TIME LISTENERS SETUP ==========

  /**
   * Sets up all real-time listeners for Teacher Portal
   */
  function setupTeacherListeners() {
    // Watch attendance status
    unsubscribeFunctions.attendanceStatus = window.attendanceModule.watchAttendanceStatus((status) => {
      attendanceBtn.disabled = status.isOpen;
      if (status.isOpen && status.remainingSeconds > 0) {
        timerDisplay.innerHTML = `<span class="bg-green-500 text-white px-3 py-1 rounded-full text-sm">Attendance Open: ${status.remainingSeconds}s</span>`;
      } else {
        timerDisplay.innerHTML = `<span class="bg-red-500 text-white px-3 py-1 rounded-full text-sm">Attendance Closed</span>`;
        if (status.remainingSeconds === 0 && status.isOpen) {
          // Auto-close when timer expires
          window.attendanceModule.closeAttendance();
        }
      }
    });

    // Watch present students
    const today = window.attendanceModule.getCurrentDate();
    unsubscribeFunctions.presentStudents = window.attendanceModule.watchPresentStudents(today, (students) => {
      updateAttendanceDisplay(students);
    });

    // Watch class info
    unsubscribeFunctions.classInfo = window.submissionsModule.watchClassInfo((info) => {
      currentClassInfo = info;
      className.value = info.className;
      strength.value = info.strength;
      // Re-fetch present students to update display with new class info
      if (unsubscribeFunctions.presentStudents) {
        // The present students listener will trigger updateAttendanceDisplay
      }
    });

    // Watch deadline
    unsubscribeFunctions.deadline = window.submissionsModule.watchDeadline((deadline) => {
      currentDeadlineDate = deadline;
      if (deadline) {
        studentDeadline.innerText = deadline;
      } else {
        studentDeadline.innerText = "Not Set";
      }
      
      // Watch submissions for this deadline
      if (unsubscribeFunctions.submissions) {
        unsubscribeFunctions.submissions();
      }
      if (deadline) {
        unsubscribeFunctions.submissions = window.submissionsModule.watchSubmissions(deadline, (submissions) => {
          currentSubmissions = submissions;
          updateSubmissionDisplay(submissions);
        });
      } else {
        currentSubmissions = [];
        updateSubmissionDisplay([]);
      }
    });

    // Watch notice
    unsubscribeFunctions.notice = window.submissionsModule.watchNotice((notice) => {
      studentNotice.innerText = notice;
      parentNotice.innerText = notice;
    });

    // Watch parent messages
    unsubscribeFunctions.parentMessages = window.submissionsModule.watchParentMessages((messages) => {
      updateParentMessages(messages);
    });
  }

  /**
   * Sets up all real-time listeners for Student Portal
   */
  function setupStudentListeners() {
    // Watch attendance status
    unsubscribeFunctions.attendanceStatus = window.attendanceModule.watchAttendanceStatus((status) => {
      // Update button state if needed (can show if attendance is open)
      const btn = document.getElementById("btnMarkSelfPresent");
      if (!status.isOpen) {
        // Button can still be clicked, but will show alert
      }
    });

    // Watch deadline
    unsubscribeFunctions.deadline = window.submissionsModule.watchDeadline((deadline) => {
      if (deadline) {
        studentDeadline.innerText = deadline;
      } else {
        studentDeadline.innerText = "Not Set";
      }
    });

    // Watch notice
    unsubscribeFunctions.notice = window.submissionsModule.watchNotice((notice) => {
      studentNotice.innerText = notice;
    });
  }

  /**
   * Sets up all real-time listeners for Parent Portal
   */
  function setupParentListeners() {
    // Watch class info
    unsubscribeFunctions.classInfo = window.submissionsModule.watchClassInfo((info) => {
      currentClassInfo = info;
      parentClass.innerText = info.className || "-";
      pTotal.innerText = info.strength || 0;
    });

    // Watch present students
    const today = window.attendanceModule.getCurrentDate();
    unsubscribeFunctions.presentStudents = window.attendanceModule.watchPresentStudents(today, (students) => {
      updateParentAttendanceDisplay(students);
    });

    // Watch notice
    unsubscribeFunctions.notice = window.submissionsModule.watchNotice((notice) => {
      parentNotice.innerText = notice;
    });

    // Watch teacher reply
    unsubscribeFunctions.parentReply = window.submissionsModule.watchParentReply((reply) => {
      parentReply.innerText = reply;
    });
  }

  /**
   * Cleans up all listeners when navigating away from portals
   */
  function cleanupListeners() {
    Object.values(unsubscribeFunctions).forEach(unsubscribe => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    // Reset all unsubscribe functions
    Object.keys(unsubscribeFunctions).forEach(key => {
      unsubscribeFunctions[key] = null;
    });
  }

  // ========== UI UPDATE FUNCTIONS ==========

  /**
   * Updates attendance display in Teacher and Parent portals
   */
  function updateAttendanceDisplay(presentStudents) {
    const totalStudents = currentClassInfo.strength || 0;
    const presentCount = presentStudents.length;
    const absentCount = Math.max(0, totalStudents - presentCount);

    // Teacher Portal
    if (total) total.innerText = totalStudents;
    if (present) present.innerText = presentCount;
    if (absent) absent.innerText = absentCount;

    if (presentList) {
      presentList.innerHTML = "";
      presentStudents.forEach(name => {
        const li = document.createElement("li");
        li.innerText = name;
        presentList.appendChild(li);
      });
    }

    // Parent Portal
    if (pTotal) pTotal.innerText = totalStudents;
    if (pPresent) pPresent.innerText = presentCount;
    if (pAbsent) pAbsent.innerText = absentCount;

    if (parentPresentList) {
      parentPresentList.innerHTML = "";
      presentStudents.forEach(name => {
        const li = document.createElement("li");
        li.innerText = name;
        parentPresentList.appendChild(li);
      });
    }
  }

  /**
   * Updates parent attendance display only
   */
  function updateParentAttendanceDisplay(presentStudents) {
    const totalStudents = currentClassInfo.strength || 0;
    const presentCount = presentStudents.length;
    const absentCount = Math.max(0, totalStudents - presentCount);

    if (pTotal) pTotal.innerText = totalStudents;
    if (pPresent) pPresent.innerText = presentCount;
    if (pAbsent) pAbsent.innerText = absentCount;

    if (parentPresentList) {
      parentPresentList.innerHTML = "";
      presentStudents.forEach(name => {
        const li = document.createElement("li");
        li.innerText = name;
        parentPresentList.appendChild(li);
      });
    }
  }

  /**
   * Updates submission display in Teacher Portal
   */
  function updateSubmissionDisplay(submissions) {
    const totalStudents = currentClassInfo.strength || 0;
    const submittedCount = submissions.length;
    const pendingCount = Math.max(0, totalStudents - submittedCount);

    if (submittedSpan) submittedSpan.innerText = submittedCount;
    if (notSubmitted) notSubmitted.innerText = pendingCount;

    if (submissionList) {
      submissionList.innerHTML = "";
      submissions.forEach(sub => {
        const li = document.createElement("li");
        li.className = "bg-white p-3 rounded-lg border border-gray-200";
        
        // Format timestamp if available
        let timestampStr = '';
        if (sub.timestamp && sub.timestamp.toDate) {
          timestampStr = `<small class="text-gray-500"> - ${sub.timestamp.toDate().toLocaleString()}</small>`;
        }
        
        li.innerHTML = `<strong>${sub.studentName}:</strong>${timestampStr}<br>${sub.content || ''}`;
        submissionList.appendChild(li);
      });
    }
  }

  /**
   * Updates parent messages display in Teacher Portal
   */
  function updateParentMessages(messages) {
    const teacherMessagesDiv = document.getElementById("teacherMessages");
    if (!teacherMessagesDiv) return;

    if (messages.length === 0) {
      teacherMessagesDiv.innerHTML = "No messages";
      return;
    }

    const messagesHTML = messages.map(msg => {
      const childName = msg.childName || 'Unknown';
      const messageText = msg.message || '';
      let timestampStr = '';
      if (msg.timestamp && msg.timestamp.toDate) {
        timestampStr = `<small class="text-gray-500 text-xs"> - ${msg.timestamp.toDate().toLocaleString()}</small>`;
      }
      return `<p class="mb-1 bg-blue-50 p-2 rounded"><strong>${childName}:</strong> ${messageText}${timestampStr}</p>`;
    }).join("");

    teacherMessagesDiv.innerHTML = messagesHTML;
  }

});
