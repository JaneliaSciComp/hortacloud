import { Button, Popconfirm } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { PropTypes } from "prop-types";
import { API } from "aws-amplify";
import { useQueryClient } from "react-query";

export default function DeleteUser({ username }) {
  const queryClient = useQueryClient();

  function removeUser() {
    // TODO: add lambda code to remove user from cognito pool
    API.post("AppStreamAPI", "/removeUser", {
      body: { username },
    }).then(() => {
      queryClient.invalidateQueries("users");
      console.log(`removing user: ${username}`);
    });
  }

  return (
    <Popconfirm
      title="Are you sure?"
      okText="Yes"
      cancelText="No"
      onConfirm={removeUser}
      icon={<QuestionCircleOutlined style={{ color: "red" }} />}
    >
      <Button>Delete</Button>
    </Popconfirm>
  );
}

DeleteUser.propTypes = {
  username: PropTypes.string.isRequired,
};
