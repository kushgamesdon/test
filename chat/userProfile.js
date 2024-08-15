// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyAjll4suy70O9T_DlQo2sIol9E1Pxuttvw",
  authDomain: "chat-800a8.firebaseapp.com",
  projectId: "chat-800a8",
  storageBucket: "chat-800a8.appspot.com",
  messagingSenderId: "145289880659",
  appId: "1:145289880659:web:ab181ef750c05b7ddbd2a6",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// DOM Element Selectors
const selectors = {
  username: document.getElementById("username"),
  email: document.getElementById("email"),
  joinDate: document.getElementById("joinDate"),
  avatar: document.getElementById("avatar"),
  bio: document.getElementById("bio"),
  postsContainer: document.getElementById("postsContainer"),
  followButton: document.getElementById("followButton"),
  followersCount: document.getElementById("followersCount"),
  followingCount: document.getElementById("followingCount"),
  editProfileButton: document.getElementById("editProfileButton"),
  editProfileSection: document.getElementById("editProfileSection"),
  saveProfileChanges: document.getElementById("saveProfileChanges"),
  editUsername: document.getElementById("editUsername"),
  editBio: document.getElementById("editBio"),
  editProfilePicture: document.getElementById("editProfilePicture"),
  uploadBtn: document.getElementById('uploadBtn'),
  uploadModal: document.getElementById('uploadModal'),
  closeModal: document.querySelector('.modal-content .close'),
  uploadButton: document.getElementById('uploadButton'),
  mediaFileInput: document.getElementById('mediaFile'),
  mediaCaptionInput: document.getElementById('mediaCaption'),
  settingsLink: document.getElementById('settingsLink'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsModal: document.querySelector('#settingsModal .close'),
  darkModeToggle: document.getElementById('darkModeToggle'),
  notificationsToggle: document.getElementById('notificationsToggle'),
  languageSelect: document.getElementById('languageSelect'),
  saveSettingsButton: document.getElementById('saveSettings'),
  notificationsLink: document.getElementById('notificationsLink'),
  notificationsModal: document.getElementById('notificationsModal'),
  closeNotificationsModal: document.querySelector('#notificationsModal .close'),
  notificationsList: document.getElementById('notificationsList'),
  reportLink: document.getElementById('reportLink'),
  blockLink: document.getElementById('blockLink'),
  editProfileModal: document.getElementById('editProfileModal'),
  editProfileForm: document.getElementById('editProfileForm'),
  closeEditProfileModal: document.querySelector('#editProfileModal .close'),
  editBackgroundImage: document.getElementById('editBackgroundImage'),
  profileInfo: document.querySelector('.profile-info'),
};

// Utility function to update UI
const updateUI = (element, value) => {
  element.textContent = value;
};

document.addEventListener('DOMContentLoaded', async function () {
  const uid = new URLSearchParams(window.location.search).get("uid");

  if (uid) {
    try {
      const currentUser = await getCurrentUser();
      const userDoc = await db.collection("users").doc(uid).get();
      
      if (!userDoc.exists) throw new Error("User not found");

      const userData = userDoc.data();
      updateUI(selectors.username, userData.username || "No username");
      updateUI(selectors.email, userData.email || "No email");
      updateUI(selectors.joinDate, `Joined: ${userData.createdAt ? new Date(userData.createdAt.toDate()).toLocaleDateString() : "Unknown"}`);
      selectors.avatar.src = userData.avatarUrl || "https://via.placeholder.com/100";
      updateUI(selectors.bio, userData.bio || "No bio available");

      // Add this line here
      applyBackgroundImage(userData.backgroundUrl);

      updateFollowCounts(userData);
      if (currentUser) {
        if (currentUser.uid === uid) {
          // Viewing own profile
          selectors.editProfileButton.style.display = "inline-block";
          selectors.followButton.style.display = "none";
          selectors.settingsLink.style.display = "inline-block";
          selectors.reportLink.style.display = "none";
          selectors.blockLink.style.display = "none";
        } else {
          // Viewing someone else's profile
          selectors.editProfileButton.style.display = "none";
          selectors.followButton.style.display = "inline-block";
          setupFollowButton(currentUser, uid, userData);
          await setupReportAndBlockLinks(currentUser, uid);
          
          const isBlocked = await isUserBlocked(currentUser.uid, uid);
          if (isBlocked) {
            selectors.postsContainer.innerHTML = "<p>You have blocked this user.</p>";
            selectors.followButton.style.display = "none";
          }
        }
      } else {
        // Not logged in
        selectors.editProfileButton.style.display = "none";
        selectors.followButton.style.display = "none";
        selectors.settingsLink.style.display = "none";
        selectors.reportLink.style.display = "none";
        selectors.blockLink.style.display = "none";
      }

      // Load posts if not blocked
      if (!currentUser || currentUser.uid === uid || !(await isUserBlocked(currentUser.uid, uid))) {
        await loadUserPosts(uid);
      }

    } catch (error) {
      console.error("Error fetching user data:", error);
      updateUI(selectors.username, "User not found");
    }
  } else {
    console.log("No user ID provided in the URL");
    updateUI(selectors.username, "Invalid user profile");
  }

  // Load user settings
  await loadSettings();

  // Set up event listeners after everything is loaded
  setupEventListeners();
});

// the setupReportAndBlockLinks function
async function setupReportAndBlockLinks(currentUser, profileUid) {
  if (currentUser && currentUser.uid !== profileUid) {
    selectors.reportLink.style.display = "inline-block";
    selectors.blockLink.style.display = "inline-block";
    selectors.reportLink.addEventListener('click', () => reportUser(currentUser.uid, profileUid));
    
    const isBlocked = await isUserBlocked(currentUser.uid, profileUid);
    updateBlockLinkUI(isBlocked);
    
    selectors.blockLink.addEventListener('click', async () => {
      if (isBlocked) {
        await unblockUser(currentUser.uid, profileUid);
      } else {
        await blockUser(currentUser.uid, profileUid);
      }
    });
  } else {
    selectors.reportLink.style.display = "none";
    selectors.blockLink.style.display = "none";
  }
}

async function reportUser(currentUserUid, reportedUid) {
  try {
    const reportRef = db.collection('reports').doc();
    await reportRef.set({
      reporterId: currentUserUid,
      reportedUserId: reportedUid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'pending'
    });
    alert('Report submitted. We will review this user.');
  } catch (error) {
    console.error('Error reporting user:', error);
    alert('Failed to report user. Please try again.');
  }
}

// the unblockUser function
async function unblockUser(currentUserUid, unblockedUid) {
  try {
    await db.collection('users').doc(currentUserUid).update({
      blockedUsers: firebase.firestore.FieldValue.arrayRemove(unblockedUid)
    });
    alert('User has been unblocked.');
    updateBlockLinkUI(false);
    location.reload(); // Refresh the page to update the UI
  } catch (error) {
    console.error('Error unblocking user:', error);
    alert('Failed to unblock user. Please try again.');
  }
}

async function blockUser(currentUserUid, blockedUid) {
  try {
    await db.collection('users').doc(currentUserUid).update({
      blockedUsers: firebase.firestore.FieldValue.arrayUnion(blockedUid)
    });
    alert('User has been blocked.');
    updateBlockLinkUI(true);
    location.reload(); // Refresh the page to update the UI
  } catch (error) {
    console.error('Error blocking user:', error);
    alert('Failed to block user. Please try again.');
  }
}

// a function to update the block link UI
function updateBlockLinkUI(isBlocked) {
  selectors.blockLink.textContent = isBlocked ? "Unblock User" : "Block User";
  selectors.blockLink.classList.toggle('blocked', isBlocked);
}

// a function to check if a user is blocked
async function isUserBlocked(currentUserUid, profileUid) {
  try {
    const currentUserDoc = await db.collection('users').doc(currentUserUid).get();
    const blockedUsers = currentUserDoc.data().blockedUsers || [];
    return blockedUsers.includes(profileUid);
  } catch (error) {
    console.error('Error checking if user is blocked:', error);
    return false;
  }
}

async function getCurrentUser() {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged(user => {
      resolve(user);
    }, reject);
  });
}

async function uploadFile(file) {
  const storageRef = storage.ref();
  const fileRef = storageRef.child('uploads/' + file.name);
  const snapshot = await fileRef.put(file);
  return snapshot.ref.getDownloadURL();
}

async function savePost(currentUser, url, caption) {
  try {
    await db.collection('users').doc(currentUser.uid).collection('posts').add({
      url: url,
      caption: caption,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      likes: [], // Initialize the likes array
    });
    console.log('Post saved successfully.');
  } catch (error) {
    console.error('Error saving post:', error);
  }
}

async function getPostData(userId, postId) {
  const postRef = db.collection("users").doc(userId).collection("posts").doc(postId);
  try {
    const postDoc = await postRef.get();
    if (postDoc.exists) {
      const postData = postDoc.data();
      console.log(`Post data for ID ${postId}: ${JSON.stringify(postData)}`);
      return postData;
    } else {
      console.log(`Post with ID ${postId} does not exist.`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching post data for ID ${postId}:`, error);
    return null;
  }
}

function setupEventListeners() {
  // Check if each selector is not null before adding event listeners
  if (selectors.uploadButton) {
    selectors.uploadButton.removeEventListener('click', handleUploadClick);
    selectors.uploadButton.addEventListener('click', handleUploadClick);
  }
  
  if (selectors.uploadBtn) {
    selectors.uploadBtn.removeEventListener('click', handleUploadBtnClick);
    selectors.uploadBtn.addEventListener('click', handleUploadBtnClick);
  }

  if (selectors.closeModal) {
    selectors.closeModal.removeEventListener('click', handleCloseModalClick);
    selectors.closeModal.addEventListener('click', handleCloseModalClick);
  }

  if (selectors.editProfileButton) {
    selectors.editProfileButton.addEventListener('click', openEditProfileModal);
  }

  if (selectors.closeEditProfileModal) {
    selectors.closeEditProfileModal.addEventListener('click', closeEditProfileModal);
  }

  if (selectors.editProfileForm) {
    selectors.editProfileForm.addEventListener('submit', handleEditProfileSubmit);
  }
}

function openEditProfileModal() {
  selectors.editProfileModal.style.display = 'flex';
  // Pre-fill the form with current user data
  selectors.editUsername.value = selectors.username.textContent;
  selectors.editBio.value = selectors.bio.textContent;
}

function closeEditProfileModal() {
  selectors.editProfileModal.style.display = 'none';
}

async function handleEditProfileSubmit(event) {
  event.preventDefault();
  const newUsername = selectors.editUsername.value.trim();
  const newBio = selectors.editBio.value.trim();
  const newProfilePicture = selectors.editProfilePicture.files[0];
  const newBackgroundImage = selectors.editBackgroundImage.files[0];

  if (newUsername) {
    try {
      await updateProfile(newUsername, newBio, newProfilePicture, newBackgroundImage);
      closeEditProfileModal();
      // Refresh the page to show updated profile
      location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  } else {
    alert("Username cannot be empty");
  }
}

async function handleUploadClick() {
  const file = selectors.mediaFileInput.files[0];
  const caption = selectors.mediaCaptionInput.value;

  if (file) {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) throw new Error('No user is signed in');

      const url = await uploadFile(file);
      await savePost(currentUser, url, caption);

      selectors.mediaFileInput.value = '';
      selectors.mediaCaptionInput.value = '';
      selectors.uploadModal.style.display = 'none';

      console.log('Refreshing posts after upload...');
      await loadUserPosts(currentUser.uid); // Refresh posts

    } catch (error) {
      console.error('Error uploading file:', error);
    }
  } else {
    alert('Please select a file.');
  }
}

function handleUploadBtnClick() {
  selectors.uploadModal.style.display = 'flex';
}

function handleCloseModalClick() {
  selectors.uploadModal.style.display = 'none';
}

  selectors.editProfileButton.addEventListener("click", () => {
    selectors.editProfileSection.style.display = "block";
    selectors.editProfileButton.style.display = "none";
    selectors.editUsername.value = selectors.username.textContent;
    selectors.editBio.value = selectors.bio.textContent;
  });

  selectors.saveProfileChanges.addEventListener("click", async () => {
    const newUsername = selectors.editUsername.value.trim();
    const newBio = selectors.editBio.value.trim();
    const newProfilePicture = selectors.editProfilePicture.files[0];

    if (newUsername) {
      try {
        await updateProfile(newUsername, newBio, newProfilePicture);
      } catch (error) {
        console.error('Error updating profile:', error);
      }
    } else {
      alert("Username cannot be empty");
    }
  });

  // Settings Modal
  selectors.settingsLink.addEventListener('click', () => {
    selectors.settingsModal.style.display = 'flex';
    loadSettings();
  });

  selectors.closeSettingsModal.addEventListener('click', () => {
    selectors.settingsModal.style.display = 'none';
  });

  selectors.saveSettingsButton.addEventListener('click', saveSettings);

  window.addEventListener('click', event => {
    if (event.target === selectors.uploadModal) {
      selectors.uploadModal.style.display = 'none';
    }
    if (event.target === selectors.settingsModal) {
      selectors.settingsModal.style.display = 'none';
    }
  });

async function updateProfile(newUsername, newBio, newProfilePicture, newBackgroundImage) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("No user is signed in");

  const userRef = db.collection("users").doc(currentUser.uid);
  const updateData = {};

  if (newUsername) updateData.username = newUsername;
  if (newBio) updateData.bio = newBio;

  if (newProfilePicture) {
    const profileUrl = await uploadFile(newProfilePicture);
    updateData.avatarUrl = profileUrl;
  }

  if (newBackgroundImage) {
    const backgroundUrl = await uploadFile(newBackgroundImage);
    updateData.backgroundUrl = backgroundUrl;
  }

  await userRef.update(updateData);
}

function applyBackgroundImage(backgroundUrl) {
  if (backgroundUrl) {
    selectors.profileInfo.style.backgroundImage = `url(${backgroundUrl})`;
  } else {
    selectors.profileInfo.style.backgroundImage = 'none';
  }
}

function updateFollowCounts(userData) {
  updateUI(selectors.followersCount, userData.followers ? userData.followers.length : 0);
  updateUI(selectors.followingCount, userData.following ? userData.following.length : 0);
}

async function setupFollowButton(currentUser, uid, userData) {
  const isFollowing = userData.followers && userData.followers.includes(currentUser.uid);
  selectors.followButton.textContent = isFollowing ? "Unfollow" : "Follow";

  selectors.followButton.addEventListener("click", async () => {
    try {
      if (isFollowing) {
        await unfollowUser(currentUser.uid, uid);
      } else {
        await followUser(currentUser.uid, uid);
      }

      updateFollowCounts(userData);
      selectors.followButton.textContent = isFollowing ? "Follow" : "Unfollow";
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    }
  });
}

async function followUser(currentUserUid, userUid) {
  const userRef = db.collection("users").doc(userUid);
  const currentUserRef = db.collection("users").doc(currentUserUid);

  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const currentUserDoc = await transaction.get(currentUserRef);

      if (!userDoc.exists || !currentUserDoc.exists) {
        throw new Error('User does not exist.');
      }

      const userData = userDoc.data();
      const currentUserData = currentUserDoc.data();

      // Update followers list
      if (!userData.followers.includes(currentUserUid)) {
        const newFollowers = [...userData.followers, currentUserUid];
        transaction.update(userRef, { followers: newFollowers });
      }

      // Update following list
      if (!currentUserData.following.includes(userUid)) {
        const newFollowing = [...currentUserData.following, userUid];
        transaction.update(currentUserRef, { following: newFollowing });
      }
    });

    // Reload the page after following
    window.location.reload();

  } catch (error) {
    console.error('Error following user:', error);
  }
}

async function unfollowUser(currentUserUid, userUid) {
  const userRef = db.collection("users").doc(userUid);
  const currentUserRef = db.collection("users").doc(currentUserUid);

  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const currentUserDoc = await transaction.get(currentUserRef);

      if (!userDoc.exists || !currentUserDoc.exists) {
        throw new Error('User does not exist.');
      }

      const userData = userDoc.data();
      const currentUserData = currentUserDoc.data();

      // Update followers list
      const newFollowers = userData.followers.filter(uid => uid !== currentUserUid);
      if (newFollowers.length !== userData.followers.length) {
        transaction.update(userRef, { followers: newFollowers });
      }

      // Update following list
      const newFollowing = currentUserData.following.filter(uid => uid !== userUid);
      if (newFollowing.length !== currentUserData.following.length) {
        transaction.update(currentUserRef, { following: newFollowing });
      }
    });

    // Reload the page after unfollowing
    window.location.reload();

  } catch (error) {
    console.error('Error unfollowing user:', error);
  }
}

async function loadSettings() {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      // Load current settings
      const settings = await db.collection("settings").doc(currentUser.uid).get();
      if (settings.exists) {
        const settingsData = settings.data();
        selectors.darkModeToggle.checked = settingsData.darkMode || false;
        selectors.notificationsToggle.checked = settingsData.notifications || false;
        selectors.languageSelect.value = settingsData.language || 'en';
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function saveSettings() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("No user is signed in");

    const darkMode = selectors.darkModeToggle.checked;
    const notifications = selectors.notificationsToggle.checked;
    const language = selectors.languageSelect.value;

    await db.collection("settings").doc(currentUser.uid).set({
      darkMode,
      notifications,
      language
    });

    console.log('Settings saved successfully.');
    selectors.settingsModal.style.display = 'none';
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

async function loadUserPosts(uid) {
  console.log('Clearing posts container...');
  selectors.postsContainer.innerHTML = ''; // Clear the container

  try {
    console.log('Fetching posts from Firestore...');
    const querySnapshot = await db.collection("users").doc(uid).collection("posts").orderBy("timestamp", "desc").get();
    if (querySnapshot.empty) {
      selectors.postsContainer.innerHTML = "<p>No posts yet.</p>";
      return [];
    }

    console.log(`Found ${querySnapshot.docs.length} posts.`);
    const posts = await Promise.all(querySnapshot.docs.map(async (doc) => {
      const postData = doc.data();
      const postId = doc.id;
      const authorDoc = await db.collection("users").doc(uid).get();
      const authorUsername = authorDoc.exists ? authorDoc.data().username || "Unknown" : "Unknown";
      return { data: postData, id: postId, authorUsername: authorUsername };
    }));

    posts.forEach(post => {
      const postElement = createPostElement(post.data, post.id, post.authorUsername, uid);
      selectors.postsContainer.appendChild(postElement);
    });

    return posts;

  } catch (error) {
    console.error("Error loading posts:", error);
    selectors.postsContainer.innerHTML = "<p>Error loading posts. Please try again later.</p>";
    return [];
  }
}

function createPostElement(postData, postId, authorUsername, uid) {
  const postElement = document.createElement("div");
  postElement.classList.add("post");

  const postImage = document.createElement("img");
  postImage.src = postData.url;
  postImage.alt = postData.caption;
  postImage.classList.add("post-image");

  const postCaption = document.createElement("p");
  postCaption.textContent = `${authorUsername}: ${postData.caption}`;
  postCaption.classList.add("post-caption");

  const postActions = document.createElement("div");
  postActions.classList.add("post-actions");

  const likeButton = document.createElement("button");
  likeButton.textContent = `Like (${postData.likes ? postData.likes.length : 0})`;
  likeButton.classList.add("like-button");

  // Determine if the current user has liked this post
  getCurrentUser().then(currentUser => {
    if (currentUser) {
      likeButton.classList.toggle("liked", postData.likes.includes(currentUser.uid));
    }
  }).catch(error => {
    console.error('Error getting current user:', error);
  });

  likeButton.addEventListener("click", async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      alert('You must be logged in to like posts.');
      return;
    }

    try {
      await toggleLike(currentUser.uid, postId, postData.likes || [], uid);
      const updatedPostData = (await db.collection("users").doc(uid).collection("posts").doc(postId).get()).data();
      updateLikeButton(likeButton, updatedPostData.likes || []);
    } catch (error) {
      console.error('Error liking/unliking post:', error);
    }
  });

  postActions.appendChild(likeButton);
  postElement.appendChild(postImage);
  postElement.appendChild(postCaption);
  postElement.appendChild(postActions);

  return postElement;
}

async function toggleLike(userId, postId, currentLikes, userCollection) {
  const postRef = db.collection("users").doc(userCollection).collection("posts").doc(postId);

  try {
    const postExists = await checkPostInFirestore(userCollection, postId);
    if (!postExists) {
      throw new Error(`Post with ID ${postId} does not exist.`);
    }

    await db.runTransaction(async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists) {
        throw new Error(`Post with ID ${postId} does not exist.`);
      }

      const postData = postDoc.data();
      const likes = postData.likes || [];
      if (likes.includes(userId)) {
        // Unlike the post
        transaction.update(postRef, { likes: likes.filter(id => id !== userId) });
      } else {
        // Like the post
        transaction.update(postRef, { likes: [...likes, userId] });
      }
    });
  } catch (error) {
    console.error('Error toggling like:', error);
  }
}

function updateLikeButton(likeButton, likes) {
  likeButton.textContent = `Like (${likes.length})`;
  getCurrentUser().then(currentUser => {
    if (currentUser) {
      likeButton.classList.toggle("liked", likes.includes(currentUser.uid));
    }
  });
}

async function checkPostInFirestore(userCollection, postId) {
  try {
    const postDoc = await db.collection("users").doc(userCollection).collection("posts").doc(postId).get();
    return postDoc.exists;
  } catch (error) {
    console.error('Error checking post existence:', error);
    return false;
  }
}
