/*
 * Copyright 2019-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with
 * the License. A copy of the License is located at
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */

const { CognitoIdentityServiceProvider, SecretsManager } = require("aws-sdk");
const https = require("https");

const cognitoIdentityServiceProvider = new CognitoIdentityServiceProvider();
const secretsmanager = new SecretsManager();

const userPoolId = process.env.USERPOOL;
const jacsHostname = process.env.JACS_HOSTNAME;

function sendRequest(path, method, body, token) {
  const data = body ? JSON.stringify(body) : null;

  const options = {
    hostname: jacsHostname,
    port: 443,
    method,
    path,
    rejectUnauthorized: false,
    headers: {}
  };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (data) {
    options.headers["Content-Type"] = "application/json";
    options.headers["Content-Length"] = data.length;
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let rawData = "";

      res.on("data", chunk => {
        rawData += chunk;
      });

      res.on("end", () => {
        try {
          resolve(rawData);
        } catch (err) {
          reject(new Error(err));
        }
      });
    });

    req.on("error", err => {
      reject(new Error(err));
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

async function getAuthToken(username) {
  console.log({ username });
  const authResponse = await sendRequest(
    "/SCSW/AuthenticationService/v1/authenticate",
    "POST",
    {
      username: username,
      password: ""
    }
  );
  console.log(authResponse);
  const { token } = JSON.parse(authResponse);
  return token;
}

async function addUser(username, authUser, resend) {
  console.log({resend});
  console.log(`Attempting to add ${username} to userpool ${userPoolId}`);

  const passwordParams = {
    IncludeSpace: true,
    PasswordLength: 20,
    RequireEachIncludedType: true
  };

  try {
    const password = await secretsmanager
      .getRandomPassword(passwordParams)
      .promise();

    const params = {
      UserPoolId: userPoolId,
      Username: username,
      TemporaryPassword: password.RandomPassword,
      DesiredDeliveryMediums: ["EMAIL"],
      UserAttributes: [
        {
          Name: "email",
          Value: username
        },
        {
          Name: "email_verified",
          Value: "True"
        }
      ]
    };

    if (resend) {
      params.MessageAction = 'RESEND';
      delete params.UserAttributes;
    }

    await cognitoIdentityServiceProvider
      .adminCreateUser(params)
      .promise();
    console.log(`Success adding ${username} to userpool ${userPoolId}`);

    // code to connect to Workstation API and add the user.
    if (!resend) {
      const authToken = await getAuthToken(authUser);
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

      return {
        message: `Success adding ${username} to userpool`
      };
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function addUserToGroup(username, groupname, authUser) {
  const params = {
    GroupName: groupname,
    UserPoolId: userPoolId,
    Username: username
  };

  console.log(`Attempting to add ${username} to ${groupname}`);

  try {
    await cognitoIdentityServiceProvider
      .adminAddUserToGroup(params)
      .promise();
    console.log(`Success adding ${username} to ${groupname}`);

    if (groupname === "admins") {
      // code to connect to Workstation API and add the user to a group.
      const authToken = await getAuthToken(authUser);
      const currentUserResponse = await sendRequest(
        `/SCSW/JACS2SyncServices/v2/data/user?subjectKey=${username}`,
        "GET",
        undefined,
        authToken
      );
      const currentUser = JSON.parse(currentUserResponse);

      // if admin role is present, then done
      if (
        !currentUser.userGroupRoles.find(role => role.groupKey === "group:admin")
      ) {
        const updatedRoles = currentUser.userGroupRoles.map(role => {
          role.role = "Admin";
          return role;
        });
        // if not, push admin role onto list of roles and send it back
        updatedRoles.push({ groupKey: "group:admin", role: "Admin" });
        await sendRequest(
          `/SCSW/JACS2SyncServices/v2/data/user/roles?userKey=${username}`,
          "POST",
          updatedRoles,
          authToken
        );
      }
    }

    return {
      message: `Success adding ${username} to ${groupname}`
    };
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function resetUserPassword(username) {
  const params = {
    UserPoolId: userPoolId,
    Username: username
  };

  console.log(`Attempting to reset password for ${username}`);
  try {
    await cognitoIdentityServiceProvider
      .adminResetUserPassword(params)
      .promise();
    console.log(`Reset password for ${username} in userpool ${userPoolId}`);
    return {
      message: `Reset password for ${username}`
    };
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function removeUser(username) {
  const params = {
    UserPoolId: userPoolId,
    Username: username
  };

  console.log(`Attempting to remove ${username} from userpool ${userPoolId}`);

  try {
    await cognitoIdentityServiceProvider
      .adminDeleteUser(params)
      .promise();
    console.log(`Removed ${username} from userpool ${userPoolId}`);
    return {
      message: `Removed ${username} from userpool`
    };
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function removeUserFromGroup(username, groupname, authUser) {
  const params = {
    GroupName: groupname,
    UserPoolId: userPoolId,
    Username: username
  };

  console.log(`Attempting to remove ${username} from ${groupname}`);

  try {
    await cognitoIdentityServiceProvider
      .adminRemoveUserFromGroup(params)
      .promise();
    console.log(`Removed ${username} from ${groupname}`);

    if (groupname === "admins") {
      // code to connect to Workstation API and remove the user from admin group.
      const authToken = await getAuthToken(authUser);
      const currentUserResponse = await sendRequest(
        `/SCSW/JACS2SyncServices/v2/data/user?subjectKey=${username}`,
        "GET",
        undefined,
        authToken
      );
      const currentUser = JSON.parse(currentUserResponse);
      // filter roles to remove admin role
      const updatedRoles = currentUser.userGroupRoles
        .filter(role => role.groupKey !== "group:admin")
        .map(role => {
          role.role = "Writer";
          return role;
        });
      // send list back
      await sendRequest(
        `/SCSW/JACS2SyncServices/v2/data/user/roles?userKey=${username}`,
        "POST",
        updatedRoles,
        authToken
      );
    }

    return {
      message: `Removed ${username} from ${groupname}`
    };
  } catch (err) {
    console.log(err);
    throw err;
  }
}

// Confirms as an admin without using a confirmation code.
async function confirmUserSignUp(username) {
  const params = {
    UserPoolId: userPoolId,
    Username: username
  };

  try {
    await cognitoIdentityServiceProvider
      .adminConfirmSignUp(params)
      .promise();
    console.log(`Confirmed ${username} registration`);
    return {
      message: `Confirmed ${username} registration`
    };
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function disableUser(username) {
  const params = {
    UserPoolId: userPoolId,
    Username: username
  };

  try {
    await cognitoIdentityServiceProvider
      .adminDisableUser(params)
      .promise();
    console.log(`Disabled ${username}`);
    return {
      message: `Disabled ${username}`
    };
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function enableUser(username) {
  const params = {
    UserPoolId: userPoolId,
    Username: username
  };

  try {
    await cognitoIdentityServiceProvider
      .adminEnableUser(params)
      .promise();
    console.log(`Enabled ${username}`);
    return {
      message: `Enabled ${username}`
    };
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function getUser(username) {
  const params = {
    UserPoolId: userPoolId,
    Username: username
  };

  console.log(`Attempting to retrieve information for ${username}`);

  try {
    const result = await cognitoIdentityServiceProvider
      .adminGetUser(params)
      .promise();
    return result;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function listUsers(Limit, PaginationToken) {
  const params = {
    UserPoolId: userPoolId,
    ...(Limit && { Limit }),
    ...(PaginationToken && { PaginationToken })
  };

  console.log("Attempting to list users");

  try {
    const result = await cognitoIdentityServiceProvider
      .listUsers(params)
      .promise();

    // Rename to NextToken for consistency with other Cognito APIs
    result.NextToken = result.PaginationToken;
    delete result.PaginationToken;

    return result;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function listGroups(Limit, PaginationToken) {
  const params = {
    UserPoolId: userPoolId,
    ...(Limit && { Limit }),
    ...(PaginationToken && { PaginationToken })
  };

  console.log("Attempting to list groups");

  try {
    const result = await cognitoIdentityServiceProvider
      .listGroups(params)
      .promise();

    // Rename to NextToken for consistency with other Cognito APIs
    result.NextToken = result.PaginationToken;
    delete result.PaginationToken;

    return result;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function listGroupsForUser(username, Limit, NextToken) {
  const params = {
    UserPoolId: userPoolId,
    Username: username,
    ...(Limit && { Limit }),
    ...(NextToken && { NextToken })
  };

  console.log(`Attempting to list groups for ${username}`);

  try {
    const result = await cognitoIdentityServiceProvider
      .adminListGroupsForUser(params)
      .promise();
    /**
     * We are filtering out the results that seem to be innapropriate for client applications
     * to prevent any informaiton disclosure. Customers can modify if they have the need.
     */
    result.Groups.forEach(val => {
      delete val.UserPoolId,
        delete val.LastModifiedDate,
        delete val.CreationDate,
        delete val.Precedence,
        delete val.RoleArn;
    });

    return result;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function listUsersInGroup(groupname, Limit, NextToken) {
  const params = {
    GroupName: groupname,
    UserPoolId: userPoolId,
    ...(Limit && { Limit }),
    ...(NextToken && { NextToken })
  };

  console.log(`Attempting to list users in group ${groupname}`);

  try {
    const result = await cognitoIdentityServiceProvider
      .listUsersInGroup(params)
      .promise();
    return result;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

// Signs out from all devices, as an administrator.
async function signUserOut(username) {
  const params = {
    UserPoolId: userPoolId,
    Username: username
  };

  console.log(`Attempting to signout ${username}`);

  try {
    await cognitoIdentityServiceProvider
      .adminUserGlobalSignOut(params)
      .promise();
    console.log(`Signed out ${username} from all devices`);
    return {
      message: `Signed out ${username} from all devices`
    };
  } catch (err) {
    console.log(err);
    throw err;
  }
}

module.exports = {
  addUser,
  addUserToGroup,
  removeUser,
  resetUserPassword,
  removeUserFromGroup,
  confirmUserSignUp,
  disableUser,
  enableUser,
  getUser,
  listUsers,
  listGroups,
  listGroupsForUser,
  listUsersInGroup,
  signUserOut
};
