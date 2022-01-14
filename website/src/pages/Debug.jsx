import { useState, useEffect } from "react";
import { Auth } from "aws-amplify";
import { Card } from "antd";

export default function Debug() {
  const [token, setToken] = useState("");

  useEffect(() => {
    async function getSession() {
      console.log(Auth);
      const session = await Auth.currentSession();
      setToken(session.accessToken.jwtToken);
    }
    getSession();
  }, []);

  return (
    <Card>
      <h3>Debug</h3>
      <p>Bearer token:</p>
      <textarea
        readOnly
        style={{ width: "100%", height: "15em" }}
        value={token}
      />
    </Card>
  );
}
