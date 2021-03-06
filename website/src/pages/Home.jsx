import { Card } from "antd";
import { Link } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import AppStreamButton from "../components/AppStreamButton";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const auth = useAuth();
  const { user } = auth;

  return (
    <Card
      title="Home"
      extra={<Link to="/password-change">Change Password</Link>}
    >
      {user ? (
        <>
          <h4>Welcome {user}</h4>
          <AppStreamButton />
        </>
      ) : (
        <>
          <h4>Login to HortaCloud</h4>
          <LoginForm />
        </>
      )}
    </Card>
  );
}
