import LoginForm from "../components/LoginForm";
import AppStreamButton from "../components/AppStreamButton";
import { Card } from "antd";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const auth = useAuth();
  const { user } = auth;

  return (
    <Card>
      <h2>Home</h2>
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
