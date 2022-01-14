import { useState } from "react";
import { API } from "aws-amplify";
import { Modal, Button, Form, Input, Checkbox } from "antd";
import { useQueryClient } from "react-query";

export default function AddUserModal() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const [form] = Form.useForm();

  const handleOk = () => {
    setIsLoading(true);
    form
      .validateFields()
      .then((values) => {
        // send create user request to lambda function
        API.post("AppStreamAPI", "/addUser", {
          body: { username: values.email },
        })
          .then(() => {
            if (values.admin) {
              API.post("AppStreamAPI", "/addUserToGroup", {
                body: { username: values.email, groupname: "admins" },
              }).then(() => {
                setIsModalVisible(false);
                setIsLoading(false);
                queryClient.invalidateQueries("users");
                form.resetFields();
              });
            } else {
              setIsModalVisible(false);
              setIsLoading(false);
              queryClient.invalidateQueries("users");
              form.resetFields();
            }
          })
          .catch((e) => {
            console.log(e);
            setIsLoading(false);
            form.resetFields();
          });
      })
      .catch(() => {
        setIsLoading(false);
      });
  };

  const handleCancel = () => {
    form.resetFields();
    setIsModalVisible(false);
  };

  return (
    <>
      <Button onClick={() => setIsModalVisible(true)}>Add User</Button>
      <Modal
        title="Add User"
        visible={isModalVisible}
        okText="Create"
        cancelText="Cancel"
        onOk={handleOk}
        onCancel={handleCancel}
        okButtonProps={{ disabled: isLoading }}
      >
        <Form
          form={form}
          name="newUser"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          initialValues={{ remember: true }}
        >
          <Form.Item
            label="Email Address"
            name="email"
            rules={[
              { required: true, message: "Please enter your email address" },
              {
                type: "email",
                message: "Please enter a valid email address",
                validateTrigger: "onSubmit",
              },
              // Email addresses can't be longer than 32 characters. If they are,
              // the appstream.createStreamingURL function will fail, because it
              // only accepts usernames that are between 2 and 32 characters.
              {
                validator: (_, value) =>
                  value.length <= 32
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(
                          "Email address must be less than or equal to 32 characters.",
                        ),
                      ),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="admin"
            valuePropName="checked"
            wrapperCol={{ offset: 8, span: 16 }}
          >
            <Checkbox>Add to admin group</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
