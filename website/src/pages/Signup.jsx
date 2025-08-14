import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Row,
  Col,
  Checkbox,
  Form,
  Input,
  Space,
  message,
} from "antd";
import { API, Auth } from "aws-amplify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import LoaderButton from "../components/LoaderButton";
import UsageTerms from "../components/UsageTerms";

const { Title } = Typography;

export default function Signup() {
  const [newUser, setNewUser] = useState(null);
  const [savedUser, setSavedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setIsLoading(true);

    if (!acceptedTerms) {
      message.error("You must accept the terms of usage to proceed");
      setIsLoading(false);
      return;
    }

    try {
      const createdUser = await Auth.signUp({
        username: values.email,
        password: values.password,
        attributes: {
          email: values.email,
        },
      });
      setIsLoading(false);
      setNewUser(createdUser);
      setSavedUser(values);
      message.success("Confirmation code sent to your email.");
    } catch (e) {
      message.error(e.message);
      setIsLoading(false);
    }
  };

  const handleAcceptedTerms = (event) => {
    setAcceptedTerms(event.target.checked);
  };

  const handleConfirmationSubmit = async (values) => {
    // 1️⃣ Confirm signup
    await Auth.confirmSignUp(savedUser.email, values.confirmationCode);

    // 2️⃣ Sign in immediately
    await Auth.signIn(savedUser.email, savedUser.password);

    message.success("Account confirmed and logged in.");
    // 3️⃣ Redirect to main app/home
    navigate("/");
  };

  function renderConfirmationForm() {
    return (
      <Form layout="vertical" onFinish={handleConfirmationSubmit}>
        <Form.Item
          label="Confirmation Code"
          name="confirmationCode"
          rules={[
            { required: true, message: "Please input your confirmation code" },
          ]}
        >
          <Input type="tel" autoFocus placeholder="Enter code from email" />
        </Form.Item>
        <LoaderButton
          block
          htmlType="submit"
          type="primary"
          loading={isLoading}
        >
          Verify
        </LoaderButton>
      </Form>
    );
  }

  function renderForm() {
    return (
      <Row gutter={24}>
        <Col xs={24} sm={10}>
          <Form layout="vertical" onFinish={handleSubmit}>
            <Title level={3}>Create your account</Title>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Please input your email address" },
              ]}
            >
              <Input autoFocus type="email" placeholder="Email address" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Please input your password" },
              ]}
            >
              <Input.Password placeholder="Password" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Confirm Password"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Please confirm your password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Passwords do not match"));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={
                  <FontAwesomeIcon
                    icon={faLock}
                    style={{ color: "rgba(0,0,0,.25)" }}
                  />
                }
                placeholder="Confirm password"
              />
            </Form.Item>

            <Space direction="vertical" style={{ width: "100%" }}>
              <Checkbox checked={acceptedTerms} onChange={handleAcceptedTerms}>
                I accept the terms of usage.
              </Checkbox>

              <LoaderButton
                block
                type="primary"
                htmlType="submit"
                loading={isLoading}
              >
                Signup
              </LoaderButton>
            </Space>
          </Form>
        </Col>
        <Col offset={2} sm={12}>
          <UsageTerms />
        </Col>
      </Row>
    );
  }

  return (
    <div className="Signup">
      {newUser === null ? renderForm() : renderConfirmationForm()}
    </div>
  );
}
