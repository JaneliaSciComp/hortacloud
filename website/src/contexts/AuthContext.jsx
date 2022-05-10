import { createContext, useState, useContext } from "react";
import { Auth } from "aws-amplify";
import { useLocation, Navigate } from "react-router-dom";
import { message } from "antd";
import PropTypes from "prop-types";

const AuthContext = createContext(null);

async function checkAdminStatus(callback) {
  const user = await Auth.currentAuthenticatedUser();
  const userSession = user.getSignInUserSession();
  const groups = userSession.accessToken.payload["cognito:groups"];
  if (groups) {
    if (groups.includes("admins")) {
      callback();
    }
  }
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const signIn = async (user, password, newPassword, callback) => {
    try {
      await Auth.signIn(user, password).then((userObject) => {
        if (userObject.challengeName === "NEW_PASSWORD_REQUIRED") {
          // 👇 the array of required attributes, e.g ['email', 'phone_number']
          const { requiredAttributes } = userObject.challengeParam;
          if (newPassword) {
            Auth.completeNewPassword(
              userObject, // the Cognito User Object
              newPassword, // the new password
              requiredAttributes
            )
            .then((updatedUser) => {
              // at this time the user is logged in if no MFA required
              setUser(user);
              checkAdminStatus(() => setIsAdmin(true));
              callback(updatedUser);
            })
            .catch((error) => callback(null, error));
          } else {
            callback(userObject);
          }
        } else {
          setUser(user);
          checkAdminStatus(() => setIsAdmin(true));
          callback(userObject);
        }
      });
    } catch (e) {
      callback();
      if (e.code === "UserNotFoundException") {
        message.error("Login error: Incorrect username or password.");
      } else {
        message.error(`Login error: ${e.message}`);
      }
    }
  };

  const signOut = async () => {
    await Auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  const checkForSignedInUser = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      let { email } = user;

      const userSession = user.getSignInUserSession();

      // get email address from AWS login cognito user
      if (!email && user.attributes) {
        email = user.attributes.email;
      }
      // get email address from Google login cognito user
      if (!email) {
        email = userSession.idToken.payload.email;
      }
      setUser(email);
      checkAdminStatus(() => setIsAdmin(true));
    } catch (e) {
      console.log(e);
    }
  };

  const value = { user, signIn, signOut, checkForSignedInUser, isAdmin };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.object.isRequired,
};

function useAuth() {
  return useContext(AuthContext);
}

function RequireAuth({ children }: { children: JSX.Element }) {
  let auth = useAuth();
  let location = useLocation();

  if (!auth.user) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} />;
  }

  return children;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  let auth = useAuth();
  let location = useLocation();

  if (!auth.isAdmin) {
    return <Navigate to="/" state={{ from: location }} />;
  }

  return children;
}

export { AuthProvider, useAuth, RequireAuth, RequireAdmin };
