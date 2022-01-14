import AddUserModal from "../components/AddUserModal";

import "antd/dist/antd.css";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Components/AddUserModal",
  component: AddUserModal,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
};

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template = (args) => <AddUserModal {...args} />;

export const Default = Template.bind({});
