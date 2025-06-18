import { useState } from "react";
import { Form, Button, Input, message } from "antd";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [passwordUpdate, setPasswordUpdate] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const onFinish = async (values: any) => {
    setIsLoading(true);
    // Use Auth to login.
    auth.signIn(
      values.username,
      values.password,
      values.newPassword,
      (userObject, error) => {
        setIsLoading(false);
        if (error) {
          message.error(error.message);
        } else if (
          userObject &&
          userObject.challengeName === "NEW_PASSWORD_REQUIRED"
        ) {
          setPasswordUpdate(true);
        } else {
          navigate(from, { replace: true });
        }
      }
    );
  };

  return (
    <Form
      name="basic"
      labelCol={{ span: 8 }}
      wrapperCol={{ span: 16 }}
      initialValues={{ remember: true }}
      onFinish={onFinish}
      autoComplete="off"
    >
      <Form.Item
        label="Username"
        name="username"
        rules={[{ required: true, message: "Please input your username!" }]}
      >
        <Input autoComplete="username" />
      </Form.Item>

      <Form.Item
        label="Password"
        name="password"
        rules={[{ required: true, message: "Please input your password!" }]}
      >
        <Input.Password autoComplete="current-password" />
      </Form.Item>
      {passwordUpdate ? (
        <Form.Item
          label="New Password"
          extra="You are required to change you password. Please enter a new one here. minimum length: 14 characters"
          name="newPassword"
          rules={[{ required: true, message: "Please create a new password!" }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      ) : (
        ""
      )}

      <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
        <Button type="primary" htmlType="submit" loading={isLoading}>
          Login
        </Button>
      </Form.Item>
      <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
        <Link to="/password-reset">Forgot Password?</Link>
      </Form.Item>
      <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
        <span>Don’t have an account? <Link to="/signup">Sign up here</Link></span>
      </Form.Item>
    </Form>
  );
}
