// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyAjll4suy70O9T_DlQo2sIol9E1Pxuttvw",
  authDomain: "chat-800a8.firebaseapp.com",
  projectId: "chat-800a8",
  storageBucket: "chat-800a8.appspot.com",
  messagingSenderId: "145289880659",
  appId: "1:145289880659:web:ab181ef750c05b7ddbd2a6",
};

// Ensure Firebase is loaded
if (typeof firebase === 'undefined') {
  console.error("Firebase SDK not loaded. Make sure to include Firebase scripts.");
} else {
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  // Function to show the active form and update button styles
  function toggleForm(formToShow) {
    const forms = document.querySelectorAll(".form");
    const buttons = document.querySelectorAll(".form-toggle button");

    forms.forEach((form) => {
      form.classList.remove("active");
      if (form.id === formToShow) {
        form.classList.add("active");
      }
    });

    buttons.forEach((button) => {
      button.classList.remove("active");
      if (button.id === formToShow + "Btn") {
        button.classList.add("active");
      }
    });
  }

  // Set up event listeners for form toggle buttons
  document.getElementById("signupBtn").addEventListener("click", function () {
    toggleForm("signupForm");
  });

  document.getElementById("loginBtn").addEventListener("click", function () {
    toggleForm("loginForm");
  });

  // Function to redirect to homepage
  function redirectToHomepage() {
    window.location.href = "homepage.html";
  }

  // Sign Up
  const signupForm = document.getElementById("signupForm");
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = document.getElementById("signupUsername").value.toLowerCase();
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const messageDiv = document.getElementById("message");

    auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const user = userCredential.user;

        // Store additional user info in Firestore
        return db.collection("users").doc(user.uid).set({
          username: username,
          email: email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      })
      .then(() => {
        messageDiv.innerHTML = `<p style="color: green;">Account created successfully! Redirecting...</p>`;
        signupForm.reset(); // Reset the form
        setTimeout(redirectToHomepage, 2000); // Redirect after 2 seconds
      })
      .catch((error) => {
        handleError(error, messageDiv);
      });
  });

  // Login
  const loginForm = document.getElementById("loginForm");
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const messageDiv = document.getElementById("message");

    auth.signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        messageDiv.innerHTML = `<p style="color: green;">Welcome back! Redirecting...</p>`;
        loginForm.reset(); // Reset the form
        setTimeout(redirectToHomepage, 2000); // Redirect after 2 seconds
      })
      .catch((error) => {
        handleError(error, messageDiv);
      });
  });

  // Handle Firebase Authentication Errors
  function handleError(error, messageDiv) {
    let errorMessage = "An error occurred. Please try again.";

    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage = "The email address is already in use.";
        break;
      case "auth/invalid-email":
        errorMessage = "Invalid email address.";
        break;
      case "auth/operation-not-allowed":
        errorMessage = "Operation not allowed. Please contact support.";
        break;
      case "auth/weak-password":
        errorMessage = "Password is too weak. It must be at least 6 characters long.";
        break;
      case "auth/user-not-found":
        errorMessage = "No user found with this email.";
        break;
      case "auth/wrong-password":
        errorMessage = "Incorrect password. Please try again.";
        break;
      default:
        errorMessage = error.message;
    }

    console.error(`Firebase Authentication Error: ${error.code} - ${error.message}`);
    messageDiv.innerHTML = `<p style="color: red;">Error: ${errorMessage}</p>`;
  }

  // Initialize default view
  toggleForm("loginForm");
}
