const https = require("https");

function sendRequest(path, method, body, token) {
  const data = body ? JSON.stringify(body) : null;
  const options = {
    hostname: process.env.JACS_HOSTNAME,
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
      res.on("data", chunk => rawData += chunk);
      res.on("end", () => resolve(rawData));
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getAuthToken(username) {
  const authResponse = await sendRequest(
    "/SCSW/AuthenticationService/v1/authenticate",
    "POST",
    { username, password: "" }
  );
  const { token } = JSON.parse(authResponse);
  return token;
}

module.exports = { sendRequest, getAuthToken };

