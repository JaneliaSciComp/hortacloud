import { CognitoUserPoolTriggerEvent, Context, Callback } from "aws-lambda";
import axios from "axios";

export const handler = async (
  event: CognitoUserPoolTriggerEvent,
  context: Context,
  callback: Callback
): Promise<void> => {
  console.log("PostConfirmation event received:", JSON.stringify(event, null, 2));

  try {
    const email = event.request.userAttributes.email;
    const sub = event.userName;

    const apiEndpoint = process.env.API_GATEWAY_URL;
    if (!apiEndpoint) {
      console.warn("No API_GATEWAY_URL defined in environment");
      return callback(null, event);
    }

    // Send POST request to your API
    const response = await axios.post(`${apiEndpoint}/users`, {
      userId: sub,
      email: email,
    });

    console.log("API call success:", response.status, response.data);
    callback(null, event);
  } catch (error) {
    console.error("Error calling API:", error);
    callback(null, event); // still allow signup even if this fails
  }
};

