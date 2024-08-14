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

document.addEventListener('DOMContentLoaded', function () {
  const uid = new URLSearchParams(window.location.search).get("uid");

  // Profile and post elements
  const usernameElement = document.getElementById("username");
  const emailElement = document.getElementById("email");
  const joinDateElement = document.getElementById("joinDate");
  const avatarElement = document.getElementById("avatar");
  const bioElement = document.getElementById("bio");
  const postsContainer = document.getElementById("postsContainer");
  const followButton = document.getElementById("followButton");
  const followersCountElement = document.getElementById("followersCount");
  const followingCountElement = document.getElementById("followingCount");

  // Edit profile elements
  const editProfileButton = document.getElementById("editProfileButton");
  const editProfileSection = document.getElementById("editProfileSection");
  const saveProfileChanges = document.getElementById("saveProfileChanges");
  const editUsername = document.getElementById("editUsername");
  const editBio = document.getElementById("editBio");
  const editProfilePicture = document.getElementById("editProfilePicture");

  // Upload modal elements
  const uploadBtn = document.getElementById('uploadBtn');
  const uploadModal = document.getElementById('uploadModal');
  const closeModal = document.querySelector('.modal-content .close');
  const uploadButton = document.getElementById('uploadButton');
  const mediaFileInput = document.getElementById('mediaFile');
  const mediaCaptionInput = document.getElementById('mediaCaption');

  // Handle file upload and caption submission
  uploadButton.addEventListener('click', function () {
    const file = mediaFileInput.files[0];
    const caption = mediaCaptionInput.value;

    if (file) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const storageRef = storage.ref();
        const fileRef = storageRef.child('uploads/' + file.name);

        fileRef.put(file).then((snapshot) => {
          return snapshot.ref.getDownloadURL();
        }).then((url) => {
          // Save post under the current user in "users" collection
          return db.collection('users').doc(currentUser.uid).collection('posts').add({
            url: url,
            caption: caption,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        }).then(() => {
          console.log('Post saved to Firestore');
          mediaFileInput.value = '';
          mediaCaptionInput.value = '';
          uploadModal.style.display = 'none';
          loadUserPosts(currentUser.uid); // Reload posts after upload
        }).catch((error) => {
          console.error('Error uploading file:', error);
        });
      } else {
        console.error('No user is signed in');
      }
    } else {
      alert('Please select a file.');
    }
  });

  // Open the upload modal
  uploadBtn.addEventListener('click', function () {
    uploadModal.style.display = 'flex';
  });

  // Close the upload modal when close button is clicked
  closeModal.addEventListener('click', function () {
    uploadModal.style.display = 'none';
  });

  // Close the modal when clicking outside the modal content
  window.addEventListener('click', function (event) {
    if (event.target === uploadModal) {
      uploadModal.style.display = 'none';
    }
  });

  // Get the user ID from the URL
  if (uid) {
    // Fetch user data
    db.collection("users").doc(uid).get().then((doc) => {
      if (doc.exists) {
        const userData = doc.data();
        usernameElement.textContent = userData.username || "No username";
        emailElement.textContent = userData.email || "No email";
        joinDateElement.textContent = `Joined: ${userData.createdAt ? new Date(userData.createdAt.toDate()).toLocaleDateString() : "Unknown"}`;
        avatarElement.src = userData.avatarUrl || "https://via.placeholder.com/100";
        bioElement.textContent = userData.bio || "No bio available";

        // Update follow counts
        updateFollowCounts(userData);

        // Check if the current user is viewing their own profile
        auth.onAuthStateChanged((currentUser) => {
          if (currentUser && currentUser.uid === uid) {
            editProfileButton.style.display = "inline-block";
            followButton.style.display = "none";
          } else if (currentUser) {
            setupFollowButton(currentUser, uid, userData);
          }
        });

        // Load user posts
        loadUserPosts(uid);

      } else {
        console.log("User not found");
        usernameElement.textContent = "User not found";
      }
    }).catch((error) => {
      console.error("Error getting user document:", error);
    });
  } else {
    console.log("No user ID provided in the URL");
    usernameElement.textContent = "Invalid user profile";
  }

  // Edit profile functionality
  editProfileButton.addEventListener("click", () => {
    editProfileSection.style.display = "block";
    editProfileButton.style.display = "none";

    // Pre-fill the edit fields with current data
    editUsername.value = usernameElement.textContent;
    editBio.value = bioElement.textContent;
  });

  saveProfileChanges.addEventListener("click", () => {
    const newUsername = editUsername.value.trim();
    const newBio = editBio.value.trim();
    const newProfilePicture = editProfilePicture.files[0];

    if (newUsername) {
      updateProfile(newUsername, newBio, newProfilePicture);
    } else {
      alert("Username cannot be empty");
    }
  });
});

function updateFollowCounts(userData) {
  const followersCountElement = document.getElementById("followersCount");
  const followingCountElement = document.getElementById("followingCount");

  const followersCount = userData.followers ? userData.followers.length : 0;
  const followingCount = userData.following ? userData.following.length : 0;

  followersCountElement.textContent = `${followersCount} followers`;
  followingCountElement.textContent = `${followingCount} following`;
}

function setupFollowButton(currentUser, targetUserId, targetUserData) {
  const followButton = document.getElementById("followButton");

  // Check if the current user is already following the target user
  const isFollowing = targetUserData.followers && targetUserData.followers.includes(currentUser.uid);
  updateFollowButtonState(followButton, isFollowing);

  followButton.addEventListener("click", () => {
    const isCurrentlyFollowing = followButton.classList.contains("following");
    const currentUserRef = db.collection("users").doc(currentUser.uid);
    const targetUserRef = db.collection("users").doc(targetUserId);

    db.runTransaction((transaction) => {
      return Promise.all([
        transaction.get(currentUserRef),
        transaction.get(targetUserRef),
      ]).then(([currentUserDoc, targetUserDoc]) => {
        if (!currentUserDoc.exists || !targetUserDoc.exists) {
          throw "Document does not exist!";
        }

        const currentUserData = currentUserDoc.data();
        const updatedTargetUserData = targetUserDoc.data();

        if (isCurrentlyFollowing) {
          // Unfollow
          updatedTargetUserData.followers = (updatedTargetUserData.followers || []).filter(id => id !== currentUser.uid);
          currentUserData.following = (currentUserData.following || []).filter(id => id !== targetUserId);
        } else {
          // Follow
          updatedTargetUserData.followers = [...(updatedTargetUserData.followers || []), currentUser.uid];
          currentUserData.following = [...(currentUserData.following || []), targetUserId];
        }

        transaction.update(targetUserRef, {
          followers: updatedTargetUserData.followers,
        });
        transaction.update(currentUserRef, {
          following: currentUserData.following,
        });

        return updatedTargetUserData;
      });
    })
    .then((updatedTargetUserData) => {
      updateFollowButtonState(followButton, !isCurrentlyFollowing);
      updateFollowCounts(updatedTargetUserData);
    })
    .catch((error) => {
      console.error("Error updating follow status: ", error);
    });
  });
}

function updateFollowButtonState(button, isFollowing) {
  if (isFollowing) {
    button.textContent = "Following";
    button.classList.add("following");
  } else {
    button.textContent = "Follow";
    button.classList.remove("following");
  }
}

function updateProfile(newUsername, newBio, newProfilePicture) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("No user is signed in.");
    return;
  }

  const userRef = db.collection("users").doc(currentUser.uid);

  let profileUpdatePromises = [];

  if (newProfilePicture) {
    const storageRef = storage.ref();
    const fileRef = storageRef.child('avatars/' + newProfilePicture.name);

    profileUpdatePromises.push(
      fileRef.put(newProfilePicture).then((snapshot) => {
        return snapshot.ref.getDownloadURL();
      }).then((url) => {
        return userRef.update({
          avatarUrl: url
        });
      })
    );
  }

  if (newUsername) {
    profileUpdatePromises.push(userRef.update({
      username: newUsername
    }));
  }

  if (newBio) {
    profileUpdatePromises.push(userRef.update({
      bio: newBio
    }));
  }

  Promise.all(profileUpdatePromises)
    .then(() => {
      console.log('Profile updated successfully');
      // Update UI
      usernameElement.textContent = newUsername;
      bioElement.textContent = newBio;

      // Hide edit profile section
      editProfileSection.style.display = 'none';
      editProfileButton.style.display = 'inline-block';
    })
    .catch((error) => {
      console.error('Error updating profile:', error);
    });
}

function loadUserPosts(uid) {
  const postsContainer = document.getElementById("postsContainer");

  // Clear existing posts
  postsContainer.innerHTML = '';

  db.collection("users").doc(uid).collection("posts")
    .orderBy("timestamp", "desc")
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        postsContainer.innerHTML = "<p>No posts yet.</p>";
      } else {
        const postPromises = [];

        querySnapshot.forEach((doc) => {
          const postData = doc.data();
          const postId = doc.id;

          // Fetch username of the post author
          postPromises.push(
            db.collection("users").doc(uid).get().then((userDoc) => {
              const authorUsername = userDoc.exists ? userDoc.data().username : "Unknown";

              return {
                postId: postId,
                postData: postData,
                authorUsername: authorUsername
              };
            })
          );
        });

        // After fetching all author usernames, create and append post elements
        Promise.all(postPromises).then((posts) => {
          posts.forEach(({ postId, postData, authorUsername }) => {
            const postElement = createPostElement(postData, postId, authorUsername);
            postsContainer.appendChild(postElement);
          });
        }).catch((error) => {
          console.error("Error fetching author usernames: ", error);
          postsContainer.innerHTML = "<p>Error loading posts. Please try again later.</p>";
        });
      }
    })
    .catch((error) => {
      console.error("Error loading posts: ", error);
      postsContainer.innerHTML = "<p>Error loading posts. Please try again later.</p>";
    });
}

function createPostElement(postData, postId, authorUsername) {
  const postElement = document.createElement("div");
  postElement.classList.add("post");

  // Post image
  const postImage = document.createElement("img");
  postImage.src = postData.url;
  postImage.alt = postData.caption;
  postImage.classList.add("post-image");

  // Post caption
  const postCaption = document.createElement("p");
  postCaption.textContent = `${authorUsername}: ${postData.caption}`;
  postCaption.classList.add("post-caption");

  // Actions (like button, share button, etc.)
  const postActions = document.createElement("div");
  postActions.classList.add("post-actions");

  // Add any action buttons here if needed
  // Example: like button
  const likeButton = document.createElement("button");
  likeButton.textContent = "Like";
  postActions.appendChild(likeButton);

  postElement.appendChild(postImage);
  postElement.appendChild(postCaption);
  postElement.appendChild(postActions);

  return postElement;
}
