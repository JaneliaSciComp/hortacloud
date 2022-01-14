import AdminDataTable from "../components/AdminDataTable";

import "antd/dist/antd.css";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Components/AdminDataTable",
  component: AdminDataTable,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    loading: false,
  },
};

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template = (args) => <AdminDataTable {...args} />;

export const Default = Template.bind({});
Default.args = {
  dataSource: [
    { Username: "test@example.com", admin: true, Enabled: true },
    { Username: "test@example.com", admin: false, Enabled: true },
    { Username: "test@example.com", admin: false, Enabled: false },
    { Username: "user@example.com", admin: false, Enabled: false },
  ],
};
