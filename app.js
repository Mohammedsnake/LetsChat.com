// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDcNSafSw-RgwwKW1jxqRiSuykAxSslAM8",
    authDomain: "loverappp-43cdf.firebaseapp.com",
    databaseURL: "https://loverappp-43cdf-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "loverappp-43cdf",
    storageBucket: "loverappp-43cdf.firebasestorage.app",
    messagingSenderId: "179466202395",
    appId: "1:179466202395:web:6a91702c344dd22f88f7be",
  };

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
const database = firebase.database();
const auth = firebase.auth();

// DOM elements
const authContainer = document.getElementById('auth-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const chatContainer = document.getElementById('chat-container');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const registerName = document.getElementById('register-name');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');
const currentUserSpan = document.getElementById('current-user');
const userStatus = document.getElementById('user-status');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.querySelector('emoji-picker');
const fileInput = document.getElementById('file-input');
const typingIndicator = document.getElementById('typing-indicator');

// State variables
let currentUser = null;
let typingTimeout = null;
let isTyping = false;

// Auth state listener
// Make sure this is at the top level of your script
auth.onAuthStateChanged(user => {
    console.log('Auth state changed:', user); // Add this for debugging
    
    if (user) {
      currentUser = {
        uid: user.uid,
        name: user.displayName || user.email.split('@')[0]
      };
      console.log('User logged in:', currentUser); // Debug log
      
      // Update UI
      document.getElementById('current-user').textContent = currentUser.name;
      document.getElementById('auth-container').classList.add('hidden');
      document.getElementById('chat-container').classList.remove('hidden');
      
      // Initialize chat features
      setUserOnline();
      loadMessages();
      setupPresenceListener();
    } else {
      console.log('User logged out'); // Debug log
      currentUser = null;
      document.getElementById('auth-container').classList.remove('hidden');
      document.getElementById('chat-container').classList.add('hidden');
    }
  });

// Auth form switching
showRegister.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

showLogin.addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Login function
loginBtn.addEventListener('click', () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    
    if (email && password) {
        auth.signInWithEmailAndPassword(email, password)
            .catch(error => {
                alert(error.message);
            });
    } else {
        alert('Please enter both email and password');
    }
});

// Register function
registerBtn.addEventListener('click', () => {
    const name = registerName.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value.trim();
    
    if (name && email && password) {
        auth.createUserWithEmailAndPassword(email, password)
            .then(cred => {
                return cred.user.updateProfile({
                    displayName: name
                });
            })
            .catch(error => {
                alert(error.message);
            });
    } else {
        alert('Please fill all fields');
    }
});

// Logout function
logoutBtn.addEventListener('click', () => {
    setUserOffline();
    auth.signOut();
});

// Set user online status
function setUserOnline() {
    const userStatusRef = database.ref(`status/${currentUser.uid}`);
    const userRef = database.ref(`users/${currentUser.uid}`);
    
    // Set presence to online
    userStatusRef.onDisconnect().set({
        status: 'offline',
        lastChanged: firebase.database.ServerValue.TIMESTAMP
    });
    
    userStatusRef.set({
        status: 'online',
        lastChanged: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Update user info
    userRef.set({
        name: currentUser.name,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
}

// Set user offline status
function setUserOffline() {
    if (!currentUser) return;
    
    const userStatusRef = database.ref(`status/${currentUser.uid}`);
    userStatusRef.set({
        status: 'offline',
        lastChanged: firebase.database.ServerValue.TIMESTAMP
    });
}

// Setup presence listener
function setupPresenceListener() {
    database.ref('status').on('value', snapshot => {
        const statuses = snapshot.val() || {};
        let onlineUsers = 0;
        
        for (const [uid, status] of Object.entries(statuses)) {
            if (uid === currentUser.uid) {
                // Update current user status indicator
                userStatus.className = status.status === 'online' ? 
                    'status-dot online' : 'status-dot';
            }
        }
    });
}

// Load messages
function loadMessages() {
    database.ref('messages').orderByChild('timestamp').limitToLast(100).on('value', snapshot => {
        messagesContainer.innerHTML = '';
        const messages = snapshot.val() || {};
        
        Object.entries(messages).forEach(([id, msg]) => {
            displayMessage(id, msg);
        });
        
        // Scroll to bottom
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    });
}



// Display a message
function displayMessage(id, msg) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    // Determine if message is sent or received
    if (msg.senderId === currentUser.uid) {
        messageElement.classList.add('sent');
    } else {
        messageElement.classList.add('received');
    }
    
    // Message info (sender and time)
    const messageInfo = document.createElement('div');
    messageInfo.classList.add('message-info');
    
    const senderElement = document.createElement('span');
    senderElement.classList.add('message-sender');
    senderElement.textContent = msg.senderName;
    
    const timeElement = document.createElement('span');
    timeElement.classList.add('message-time');
    timeElement.textContent = formatTime(msg.timestamp);
    
    messageInfo.appendChild(senderElement);
    messageInfo.appendChild(timeElement);
    
    // Message content
    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');
    
    if (msg.type === 'text') {
        contentElement.textContent = msg.text;
    } else if (msg.type === 'image') {
        const img = document.createElement('img');
        img.src = msg.url;
        img.alt = 'Sent image';
        img.classList.add('attachment');
        contentElement.appendChild(img);
    } else if (msg.type === 'file') {
        const fileLink = document.createElement('a');
        fileLink.href = msg.url;
        fileLink.target = '_blank';
        fileLink.classList.add('attachment-file');
        
        const icon = document.createElement('i');
        icon.className = getFileIcon(msg.fileType);
        
        const fileName = document.createElement('span');
        fileName.textContent = msg.fileName || 'Download file';
        
        fileLink.appendChild(icon);
        fileLink.appendChild(fileName);
        contentElement.appendChild(fileLink);
    }
    
    // Build message element
    messageElement.appendChild(messageInfo);
    messageElement.appendChild(contentElement);
    messagesContainer.appendChild(messageElement);
}

// Format timestamp
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Get file icon based on type
function getFileIcon(fileType) {
    if (!fileType) return 'fas fa-file';
    
    const type = fileType.split('/')[0];
    const extension = fileType.split('/')[1];
    
    switch (type) {
        case 'image':
            return 'fas fa-image';
        case 'video':
            return 'fas fa-video';
        case 'application':
            if (extension.includes('pdf')) return 'fas fa-file-pdf';
            if (extension.includes('word') || extension.includes('document')) return 'fas fa-file-word';
            return 'fas fa-file';
        default:
            return 'fas fa-file';
    }
}

// Send message
function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (messageText) {
        const timestamp = Date.now();
        const message = {
            text: messageText,
            senderId: currentUser.uid,
            senderName: currentUser.name,
            timestamp: timestamp,
            type: 'text'
        };
        
        database.ref('messages').push(message);
        messageInput.value = '';
        
        // Reset typing status
        setTyping(false);
    }
}

// Send file
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // For simplicity, we'll just send the file info
    // In a real app, you'd upload the file to Firebase Storage
    const timestamp = Date.now();
    const message = {
        senderId: currentUser.uid,
        senderName: currentUser.name,
        timestamp: timestamp,
        type: file.type.startsWith('image') ? 'image' : 'file',
        fileName: file.name,
        fileType: file.type,
        url: URL.createObjectURL(file) // Temporary local URL
    };
    
    database.ref('messages').push(message);
    fileInput.value = '';
});

// Typing indicators
messageInput.addEventListener('input', () => {
    if (!isTyping) {
        setTyping(true);
    }
    
    // Reset the typing timeout
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        setTyping(false);
    }, 1500);
});

function setTyping(typing) {
    if (typing === isTyping) return;
    
    isTyping = typing;
    database.ref(`typing/${currentUser.uid}`).set(typing ? currentUser.name : null);
}

// Listen for typing indicators
database.ref('typing').on('value', snapshot => {
    const typingData = snapshot.val() || {};
    const typingUsers = Object.values(typingData).filter(Boolean);
    
    if (typingUsers.length > 0) {
        typingIndicator.textContent = `${typingUsers.join(', ')} ${typingUsers.length > 1 ? 'are' : 'is'} typing...`;
    } else {
        typingIndicator.textContent = '';
    }
});

// Toggle emoji picker visibility
emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent this click from reaching document
    emojiPicker.classList.toggle('hidden');
  });
  
  // Insert emoji when selected
  emojiPicker.addEventListener('emoji-click', (event) => {
    messageInput.value += event.detail.unicode;
    messageInput.focus();
  });
  
  // Close picker when clicking outside
  document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
      emojiPicker.classList.add('hidden');
    }
  });
  
  // Alternative close behavior when pressing Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      emojiPicker.classList.add('hidden');
    }
  });

// Send message on button click
sendBtn.addEventListener('click', sendMessage);

// Send message on Enter key
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Handle keyboard on mobile
window.addEventListener('resize', function() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

messageInput.addEventListener('focus', function() {
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 300);
});