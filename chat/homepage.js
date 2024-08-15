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
try {
  firebase.initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase initialization error: ", error);
}

// References to Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
  const userStatus = document.getElementById("userStatus");
  const authButton = document.getElementById("authButton");
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");
  const homeLink = document.getElementById("homeLink");
  const searchLink = document.getElementById("searchLink");
  const contentArea = document.querySelector(".content-area");
  const searchArea = document.querySelector(".search-area");
  const userInfoSection = document.querySelector(".user-info");
  const postsContainer = document.querySelector(".posts");
  const suggestionsContainer = document.querySelector(".suggestions");
  const userAvatar = document.getElementById("userAvatar");
  const userUsername = document.getElementById("userUsername");

  if (!userStatus || !authButton || !searchInput || !searchResults || !homeLink || !searchLink || !contentArea || !searchArea || !userInfoSection || !postsContainer || !suggestionsContainer || !userAvatar || !userUsername) {
    console.error("One or more required elements are missing from the DOM.");
    return;
  }

  // Navigation functionality
  homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    contentArea.style.display = "flex";
    searchArea.style.display = "none";
    homeLink.classList.add("active");
    searchLink.classList.remove("active");
  });

  searchLink.addEventListener("click", (e) => {
    e.preventDefault();
    contentArea.style.display = "none";
    searchArea.style.display = "block";
    homeLink.classList.remove("active");
    searchLink.classList.add("active");
  });

  // Add click event to user info section
  userInfoSection.addEventListener("click", () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      window.location.href = `userProfile.html?uid=${currentUser.uid}`;
    }
  });

  // Check authentication status
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in
      db.collection("users")
        .doc(user.uid)
        .get()
        .then((doc) => {
          if (doc.exists) {
            const userData = doc.data();
            userStatus.textContent = `Welcome, ${userData.username}!`;
            updateUserInfo(userData);
          } else {
            console.warn("User document does not exist.");
            userStatus.textContent = `Welcome, User!`;
          }
        })
        .catch((error) => {
          console.error("Error getting user document: ", error);
          userStatus.textContent = `Welcome, User!`;
        });

      authButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> <span>Logout</span>';
      authButton.onclick = (e) => {
        e.preventDefault();
        auth.signOut()
          .then(() => {
            window.location.href = "index.html";
          })
          .catch((error) => {
            console.error("Error signing out: ", error);
          });
      };

      loadPosts();
      loadSuggestions(user.uid);
    } else {
      // No user is signed in
      userStatus.textContent = "";
      authButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Login / Sign Up</span>';
      authButton.onclick = () => {
        window.location.href = "index.html";
      };
      suggestionsContainer.innerHTML = "<p>Log in to see suggestions.</p>";
      userAvatar.src = "https://via.placeholder.com/50";
      userUsername.textContent = "";
    }
  });

  // Search functionality with debounce
  const debounce = (func, delay) => {
    let debounceTimeout;
    return function (...args) {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => func.apply(this, args), delay);
    };
  };

  const performSearch = () => {
    const searchTerm = searchInput.value.trim().toLowerCase();
    searchResults.innerHTML = "";

    if (searchTerm === "") {
      return;
    }

    // Normalize the search term for case-insensitive comparison
    db.collection("users")
      .get()
      .then((querySnapshot) => {
        if (querySnapshot.empty) {
          searchResults.innerHTML = "<p>No users found. Please try again.</p>";
          return;
        }

        const results = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.username.toLowerCase().includes(searchTerm)) {
            results.push({
              id: doc.id,
              username: userData.username,
              avatarUrl: userData.avatarUrl || "https://via.placeholder.com/32"
            });
          }
        });

        if (results.length === 0) {
          searchResults.innerHTML = "<p>No users found. Please try again.</p>";
        } else {
          results.forEach((user) => {
            const userDiv = document.createElement("div");
            userDiv.className = "user-result";
            userDiv.innerHTML = `
              <img src="${user.avatarUrl}" alt="${user.username} avatar" class="avatar">
              <span>${user.username}</span>
            `;
            userDiv.addEventListener("click", () => {
              window.location.href = `userProfile.html?uid=${user.id}`;
            });
            searchResults.appendChild(userDiv);
          });
        }
      })
      .catch((error) => {
        console.error("Error searching for users: ", error);
        searchResults.innerHTML = "<p>An error occurred while searching. Please try again.</p>";
      });
  };

  searchInput.addEventListener("input", debounce(performSearch, 300));

  function updateUserInfo(userData) {
    userAvatar.src = userData.avatarUrl || "https://via.placeholder.com/50";
    userUsername.textContent = userData.username;

    userInfoSection.style.cursor = "pointer";
    userInfoSection.title = "Click to view profile";
  }

  function loadPosts() {
    postsContainer.innerHTML = ""; // Clear existing posts

    db.collection("posts")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          const postData = doc.data();
          const postElement = createPostElement(postData, doc.id);
          postsContainer.appendChild(postElement);
        });
      })
      .catch((error) => {
        console.error("Error loading posts: ", error);
      });
  }

  function createPostElement(post, postId) {
    const postDiv = document.createElement("div");
    postDiv.className = "post";
    postDiv.innerHTML = `
      <div class="post-header">
        <img src="${post.authorAvatarUrl || "https://via.placeholder.com/40"}" alt="${post.authorUsername} avatar">
        <span>${post.authorUsername}</span>
      </div>
      <img src="${post.imageUrl || "https://via.placeholder.com/500"}" alt="Post image" class="post-image">
      <div class="post-actions">
        <button class="like-button"><i class="far fa-heart"></i></button>
        <button><i class="far fa-comment"></i></button>
        <button><i class="far fa-paper-plane"></i></button>
      </div>
      <p><strong><span class="likes-count">${post.likes}</span> likes</strong></p>
      <p><strong>${post.authorUsername}</strong> ${post.caption}</p>
    `;

    const likeButton = postDiv.querySelector(".like-button");
    const likesCount = postDiv.querySelector(".likes-count");

    likeButton.addEventListener("click", () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const postRef = db.collection("posts").doc(postId);
        db.runTransaction((transaction) => {
          return transaction.get(postRef).then((postDoc) => {
            if (!postDoc.exists) {
              throw new Error("Post document does not exist!");
            }
            const newLikes = (postDoc.data().likes || 0) + 1;
            transaction.update(postRef, { likes: newLikes });
            return newLikes;
          });
        })
        .then((newLikes) => {
          likesCount.textContent = newLikes;
          likeButton.querySelector("i").className = "fas fa-heart";
          likeButton.style.color = "#ff3040";
        })
        .catch((error) => {
          console.error("Error updating likes: ", error);
        });
      } else {
        alert("You need to be logged in to like posts.");
      }
    });

    return postDiv;
  }

  function loadSuggestions(currentUserId) {
    suggestionsContainer.innerHTML = "<h3>Suggestions For You</h3>";

    db.collection("users")
      .doc(currentUserId)
      .get()
      .then((doc) => {
        if (doc.exists) {
          const userData = doc.data();
          const following = userData.following || [];

          // Query for users not followed by the current user
          return db.collection("users")
            .where(firebase.firestore.FieldPath.documentId(), "not-in", [currentUserId, ...following])
            .limit(5)
            .get();
        } else {
          throw new Error("Current user document not found");
        }
      })
      .then((querySnapshot) => {
        if (querySnapshot.empty) {
          suggestionsContainer.innerHTML += "<p>No suggestions available.</p>";
        } else {
          querySnapshot.forEach((doc) => {
            const userData = doc.data();
            const suggestionElement = createSuggestionElement(userData, doc.id);
            suggestionsContainer.appendChild(suggestionElement);
          });
        }
      })
      .catch((error) => {
        console.error("Error loading suggestions: ", error);
        suggestionsContainer.innerHTML += "<p>Error loading suggestions.</p>";
      });
  }

  function createSuggestionElement(userData, userId) {
    const suggestionDiv = document.createElement("div");
    suggestionDiv.className = "suggestion";
    suggestionDiv.innerHTML = `
      <img src="${userData.avatarUrl || "https://via.placeholder.com/32"}" alt="${userData.username} avatar" class="avatar">
      <span>${userData.username}</span>
      <button class="button follow-button" data-userid="${userId}">Follow</button>
    `;

    const followButton = suggestionDiv.querySelector(".follow-button");
    followButton.addEventListener("click", () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        followUser(currentUser.uid, userId, followButton);
      } else {
        alert("You need to be logged in to follow users.");
      }
    });

    return suggestionDiv;
  }

  function followUser(currentUserId, targetUserId, followButton) {
    const currentUserRef = db.collection("users").doc(currentUserId);
    const targetUserRef = db.collection("users").doc(targetUserId);

    db.runTransaction((transaction) => {
      return Promise.all([
        transaction.get(currentUserRef),
        transaction.get(targetUserRef),
      ]).then(([currentUserDoc, targetUserDoc]) => {
        if (!currentUserDoc.exists || !targetUserDoc.exists) {
          throw new Error("Document does not exist!");
        }

        const currentUserData = currentUserDoc.data();
        const targetUserData = targetUserDoc.data();

        // Update following for current user
        const updatedFollowing = [...(currentUserData.following || []), targetUserId];
        transaction.update(currentUserRef, { following: updatedFollowing });

        // Update followers for target user
        const updatedFollowers = [...(targetUserData.followers || []), currentUserId];
        transaction.update(targetUserRef, { followers: updatedFollowers });

        return { currentUserData, targetUserData };
      });
    })
    .then(() => {
      followButton.textContent = "Following";
      followButton.disabled = true;
      // Optionally, remove the suggestion from the list
      followButton.closest(".suggestion").remove();
    })
    .catch((error) => {
      console.error("Error following user: ", error);
      followButton.textContent = "Error";
    });
  }
});
