module.exports = async function handleCustomMessage(event) {
  console.log("CustomMessage trigger received:", JSON.stringify(event));

  if (event.triggerSource === "CustomMessage_SignUp") {
    const username = event.userName;

    event.response.emailSubject = "Confirm your HortaCloud demo account";
    event.response.emailMessage = `
      Hello ${username},<br/><br/>
      Thank you for signing up for a HortaCloud demo account.<br/>
      Your confirmation code is: <b>${event.request.codeParameter}</b><br/><br/>
      Please enter this code in the sign-up page to complete your registration.<br/><br/>
      – The HortaCloud Team
    `;
  }

  if (event.triggerSource === "CustomMessage_ForgotPassword") {
    event.response.emailSubject = "Reset your HortaCloud demo account password";
    event.response.emailMessage = `
      Hello,<br/><br/>
      You requested to reset your password.<br/>
      Your reset code is: <b>${event.request.codeParameter}</b><br/><br/>
      – The HortaCloud Team
    `;
  }

  return event; // must always return event
};

