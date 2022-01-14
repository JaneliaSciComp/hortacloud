// multiple stage password reset form.
import { useState } from "react";
import { Auth } from "aws-amplify";
import { Card, Form, Input, Button, message } from "antd";
import { Navigate } from "react-router-dom";

export default function PasswordReset() {
  const [state, setState] = useState({
    email: null,
    sendingCode: false,
    confirming: false,
    confirmed: false,
  });

  // stage 2 trigger confirmation code email
  async function handleEmailForm(values) {
    setState({ ...state, sendingCode: true });
    try {
      await Auth.forgotPassword(values.email);
      setState({ ...state, email: values.email, sendingCode: false });
    } catch (e) {
      message.error(e.message);
      setState({ ...state, sendingCode: false });
    }
  }
  // stage 1 enter email address
  if (!state.email) {
    return (
      <Card>
        <Form
          className="passwordReset"
          layout="vertical"
          onFinish={handleEmailForm}
        >
          <p>
            <b>Forgot your password?</b> Enter your email address and we will
            send you a reset confirmation code.
          </p>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please input your email address" },
            ]}
          >
            <Input autoFocus placeholder="Email address" />
          </Form.Item>
          <Button loading={state.sendingCode} type="primary" htmlType="submit">
            Send Reset Code
          </Button>
        </Form>
      </Card>
    );
  }

  async function handleConfirmForm(values) {
    setState({ ...state, confirming: true });
    try {
      await Auth.forgotPasswordSubmit(
        state.email,
        values.code,
        values.password,
      );
      setState({ ...state, confirmed: true, confirming: false });
      message.success("Your password has been updated.");
    } catch (e) {
      message.error(e.message);
      setState({ ...state, confirming: false });
    }
  }

  // stage 3 render form to enter confirmation code and new password
  const confirmationHelp = `Please check your email, ${state.email}, for a confirmation code.`;
  if (!state.confirmed) {
    return (
      <Card>
        <div className="passwordReset">
          <p>
            {confirmationHelp} Didn&apos;t get a code?
            <Button
              type="link"
              onClick={() => handleEmailForm({ email: state.email })}
            >
              Resend it
            </Button>
          </p>

          <Form layout="vertical" onFinish={handleConfirmForm}>
            <Form.Item
              label="Confirmation Code"
              name="code"
              rules={[
                {
                  required: true,
                  message: "Please input your confirmation code",
                },
              ]}
            >
              <Input autoFocus placeholder="Confirmation code" />
            </Form.Item>
            <Form.Item
              name="password"
              label="New Password"
              rules={[
                { required: true, message: "Please input your new password" },
              ]}
            >
              <Input type="password" placeholder="New Password" />
            </Form.Item>

            <Button loading={state.confirming} type="primary" htmlType="submit">
              Reset Password
            </Button>
          </Form>
        </div>
      </Card>
    );
  }

  // stage 4 show reset success message and provide link to login
  return <Navigate to="/login" />;
}
