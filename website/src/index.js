import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import Amplify, { Auth } from "aws-amplify";
import App from "./App";
import config from "./config.json";
import { AuthProvider } from "./contexts/AuthContext";

import "./index.css";

Amplify.configure({
  Auth: {
    mandatorySignIn: true,
    region: config.cognito.region,
    userPoolId: config.cognito.userPoolId,
    userPoolWebClientId: config.cognito.userPoolClientId,
  },
  API: {
    endpoints: [
      {
        name: "AppStreamAPI",
        endpoint: config.api.endpoint,
        custom_header: async () => {
          return {
            Authorization: `Bearer ${(await Auth.currentSession())
              .getIdToken()
              .getJwtToken()}`,
          };
        },
      },
    ],
  },
});

ReactDOM.render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>,
  document.getElementById("root")
);
