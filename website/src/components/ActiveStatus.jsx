import PropTypes from "prop-types";
import { Switch } from "antd";
import { API } from "aws-amplify";
import { useQueryClient, useMutation } from "react-query";

function disableUser(username) {
  return API.post("AppStreamAPI", "/disableUser", {
    body: { username },
  });
}

function enableUser(username) {
  return API.post("AppStreamAPI", "/enableUser", {
    body: { username },
  });
}

export default function ActiveStatus({ username, isActive }) {
  const queryClient = useQueryClient();
  const disableUserMutation = useMutation(
    (username) => {
      return disableUser(username);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries("users");
      },
    }
  );

  const enableUserMutation = useMutation(
    (username) => {
      return enableUser(username);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries("users");
      },
    }
  );

  function handleActiveChange(checked) {
    if (checked) {
      enableUserMutation.mutate(username);
    } else {
      disableUserMutation.mutate(username);
    }
  }

  return (
    <Switch
      onChange={handleActiveChange}
      checkedChildren="yes"
      unCheckedChildren="no"
      checked={isActive}
    />
  );
}

ActiveStatus.propTypes = {
  username: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
};
