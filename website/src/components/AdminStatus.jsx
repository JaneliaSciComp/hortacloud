import { Switch } from "antd";
import { useState } from "react";
import PropTypes from "prop-types";
import { API } from "aws-amplify";
import { useQueryClient } from "react-query";

export default function AdminStatus({ username, isAdmin }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  function handleAdminChange(checked) {
    setLoading(true);
    console.log(`${checked ? "Enabled" : "Disable"} admin for ${username}`);
    const action = checked ? "/addUserToGroup" : "/removeUserFromGroup";
    API.post("AppStreamAPI", action, {
      body: { username, groupname: "admins" },
    }).then(() => {
      queryClient.invalidateQueries("users");
      setLoading(false);
    });
  }

  return (
    <Switch
      onChange={handleAdminChange}
      checkedChildren="yes"
      unCheckedChildren="no"
      checked={isAdmin}
      loading={loading}
    />
  );
}

AdminStatus.propTypes = {
  username: PropTypes.string.isRequired,
  isAdmin: PropTypes.bool.isRequired,
};
