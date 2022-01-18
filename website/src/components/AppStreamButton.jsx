import { Button, message } from "antd";
import { Auth } from "aws-amplify";
import config from "../config.json";

export default function AppStreamButton() {
  async function handleLogin() {
    const session = await Auth.currentSession();
    const token = session.getIdToken().getJwtToken();
    console.log(token);

    fetch(`${config.api.endpoint}/auth`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.status === 201) {
          return res.json();
        } else {
          throw res;
        }
      })
      .then((json) => {
        window.location.href = json.Message;
      })
      .catch((e) => {
        message.error(
          `Something went wrong creating access link to appstream: ${e.message}`
        );
      });
  }

  return <Button onClick={handleLogin}>AppStream Login</Button>;
}
