import Admin from "../pages/Admin";

import "antd/dist/antd.css";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Pages/Admin",
  component: Admin,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
};

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template = (args) => <Admin {...args} />;

export const Default = Template.bind({});
