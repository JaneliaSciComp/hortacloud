module.exports = async function handleCustomMessage(event) {
  console.log("CustomMessage trigger received:", JSON.stringify(event));

  switch (event.triggerSource) {
    case "CustomMessage_SignUp":
      const username = event.userName;
      event.response.emailSubject = "Confirm your HortaCloud demo account";
      event.response.emailMessage = `
        Thank you for signing up for a HortaCloud demo account.<br/>
        Your confirmation code is: <b>${event.request.codeParameter}</b><br/><br/>
        Please enter this code in the sign-up page to complete your registration.<br/><br/>
        – The HortaCloud Team
      `;
      break;

   case "CustomMessage_ForgotPassword":
      // ✳️ Add this case
      event.response.emailSubject = "Reset your HortaCloud demo account password";
      event.response.emailMessage = `
        Hello ${event.userName || ""},<br/><br/>
        You requested to reset your password.<br/>
        Your reset code is: <b>${event.request.codeParameter}</b><br/><br/>
        – The HortaCloud Team
      `;
      break;

    // 👇 Handle all other cases safely
    default:
      console.log(`No custom message needed for trigger: ${event.triggerSource}`);
      break;
  }

  return event; // Always return event, no matter what
};

