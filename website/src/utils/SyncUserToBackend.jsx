import { API, Auth } from "aws-amplify";

// Run this after a successful signup or login
export async function syncUserToBackend() {
  try {
    const currentUser = await Auth.currentAuthenticatedUser();
    const email = currentUser.attributes?.email;

    if (!email) {
      console.error("No email found on current user");
      return;
    }
    console.log(email, currentUser);

    await API.post("AppStreamAPI", "/addUser", {
      body: { username: email },
    });

    console.log("User synced successfully");
  } catch (err) {
    console.error("Error syncing user to backend:", err);
  }
}
