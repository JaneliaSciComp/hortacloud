import { API } from "aws-amplify";
import { Card, Row, Col } from "antd";
import { useQuery } from "react-query";
import AddUserModal from "../components/AddUserModal";
import AdminDataTable from "../components/AdminDataTable";

// fetch user data from a lambda function that requires
// admin access.
async function getUsers() {
  const response = await API.get("AppStreamAPI", "/listUsers", {});
  const adminRes = await API.get("AppStreamAPI", "/ListUsersInGroup", {
    queryStringParameters: {
      groupname: "admins",
    },
  });
  const admins = adminRes.Users.map((admin) => admin.Username);
  return response.Users.map((user) => {
    user.admin = admins.includes(user.Username);
    user.key = user.Username;
    // email address needs to be pulled out of user.Attributes?
    return user;
  });
}

export default function Admin() {
  const query = useQuery("users", getUsers);
  return (
    <Card>
      <Row gutter={16}>
        <Col span={21}>
          <h2>Data Managers</h2>
        </Col>
        <Col span={3}>
          <AddUserModal />
        </Col>
      </Row>
      <AdminDataTable loading={query.isLoading} dataSource={query.data} />
    </Card>
  );
}
