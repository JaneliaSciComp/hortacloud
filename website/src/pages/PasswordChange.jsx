import { Card, Form, Input, Button, message } from "antd";
import { Auth } from "aws-amplify";
import { useState } from "react";

export default function PasswordChange() {
  const [resettingPassword, setResetting] = useState(false);

  async function handleChangeForm(values) {
    setResetting(true);
    console.log(values);
    try {
      const user = await Auth.currentAuthenticatedUser();
      await Auth.changePassword(
        user,
        values.currentPassword,
        values.newPassword
      );
      setResetting(false);
      message.success("Your Password has been reset");
    } catch (e) {
      message.error(e.message);
      setResetting(false);
    }
  }

  return (
    <Card>
      <Form
        className="passwordReset"
        layout="vertical"
        onFinish={handleChangeForm}
      >
        <h2>Change your password</h2>
        <Form.Item
          label="Current Password"
          name="currentPassword"
          rules={[
            { required: true, message: "Please input your current password" },
          ]}
        >
          <Input.Password
            autoComplete="current-password"
            autoFocus
            placeholder="current password"
          />
        </Form.Item>
        <Form.Item
          label="New Password"
          name="newPassword"
          rules={[
            { required: true, message: "Please input your new password" },
          ]}
        >
          <Input.Password
            autoComplete="new-password"
            placeholder="new password"
          />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Confirm Password"
          dependencies={["password"]}
          hasFeedback
          rules={[
            {
              required: true,
              message: "Please confirm your password",
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("The two passwords that you entered do not match")
                );
              },
            }),
          ]}
        >
          <Input.Password
            autoComplete="new-password"
            placeholder="confirm password"
          />
        </Form.Item>
        <Button loading={resettingPassword} type="primary" htmlType="submit">
          Reset Password
        </Button>
      </Form>
    </Card>
  );
}
