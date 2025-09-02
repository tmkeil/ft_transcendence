import { navigate } from "../router/router.js";

// This function is called, when the navigator goes to /login. It sets up the login page and its event listeners.
export function mountLogin(root: HTMLElement): () => void {
  // Elements from the DOM
  const form = root.querySelector("#loginForm") as HTMLFormElement | null;
  const input = root.querySelector("#userName") as HTMLInputElement | null;
  const err = root.querySelector("#loginError") as HTMLElement | null;

  // Handle form submission to create a new user
  form?.addEventListener("submit", async (e) => {
    // Avoid page refresh
    e.preventDefault();
    const name = input?.value.trim();
    if (!name)
      return;
    // Send a POST request to create a new user
    const res = await fetch("http://localhost:3000/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (!res.ok) {
      return;
    }
    const user = await res.json();
    // Store user ID and name in local storage for session management
    localStorage.setItem("userId", String(user.id));
    localStorage.setItem("userName", user.name);
    // Redirect to the home page after successful login
    navigate("/");
  });

  // Cleanup function to remove event listener when navigating away from the page
  return () => {
    form?.removeEventListener("submit", () => {});
  };
}