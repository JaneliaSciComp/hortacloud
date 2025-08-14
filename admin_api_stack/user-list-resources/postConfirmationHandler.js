const { getAuthToken, sendRequest } = require('./workstationUtils');

module.exports = async function handlePostConfirmation(event) {
  console.log("PostConfirmation trigger received:", JSON.stringify(event));

  const username = event.request.userAttributes.email || event.userName;

  try {
    // Authenticate to workstation backend
    const authToken = await getAuthToken(process.env.AUTH_USER);

    // Add user to workstation
    await sendRequest(
      "/SCSW/JACS2SyncServices/v2/data/user",
      "PUT",
      {
        key: `user:${username}`,
        name: username,
        fullName: username,
        email: username,
        password: '',
        class: "org.janelia.model.security.User"
      },
      authToken
    );

    console.log(`✅ Added ${username} to workstation`);
  } catch (err) {
    console.error("❌ Error adding demo user:", err);
  }

  // Cognito PostConfirmation must return the event
  return event;
};

