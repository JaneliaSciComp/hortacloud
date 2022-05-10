import { Button, Popconfirm, message } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { PropTypes } from "prop-types";
import { API } from "aws-amplify";
import { useQueryClient } from "react-query";

export default function ResetUser({ username, status }) {
  const queryClient = useQueryClient();

  function resetUser() {
    API.post("AppStreamAPI", "resetUserPassword", {
      body: { username },
    })
      .then(() => {
        queryClient.invalidateQueries("users");
        message.success(`resetting password for user: ${username}`);
      })
      .catch((e) => {
        const responseMessage = e?.response?.data?.message || e.message;
        message.error(responseMessage);
      });
  }

  function resendInvite() {
    API.post("AppStreamAPI", "/addUser", {
      body: { username, resend: 1 },
    })
      .then(() => {
        queryClient.invalidateQueries("users");
        message.success(`resending invite for user: ${username}`);
      })
      .catch((e) => {
        const responseMessage = e?.response?.data?.message || e.message;
        message.error(responseMessage);
      });
  }

  if (status === "FORCE_CHANGE_PASSWORD") {
    return (
      <Popconfirm
        title="Are you sure?"
        okText="Yes"
        cancelText="No"
        onConfirm={resendInvite}
        icon={<QuestionCircleOutlined style={{ color: "red" }} />}
      >
        <Button>Resend Invite</Button>
      </Popconfirm>
    );
  }
  return null;
}

ResetUser.propTypes = {
  username: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
};
