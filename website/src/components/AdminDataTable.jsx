import { Table } from "antd";
import PropTypes from "prop-types";

import AdminStatus from "./AdminStatus";
import ActiveStatus from "./ActiveStatus";
import DeleteUser from "./DeleteUser";

export default function AdminDataTable({ loading, dataSource }) {
  const columns = [
    {
      title: "User Name",
      dataIndex: "Username",
      filterSearch: true,
      onFilter: (value, record) => record.name.includes(value),
      width: "30%",
    },
    {
      title: "Admin",
      dataIndex: "admin",
      width: "40%",
      render: (admin, record) => {
        return <AdminStatus username={record.Username} isAdmin={admin} />;
      },
    },
    {
      title: "Active",
      dataIndex: "Enabled",
      width: "40%",
      render: (active, record) => {
        return <ActiveStatus username={record.Username} isActive={active} />;
      },
    },

    {
      title: "Action",
      key: "action",
      render: (text, record) => {
        return <DeleteUser username={record.Username} />;
      },
    },
  ];

  function onChange(pagination, filters, sorter, extra) {
    console.log("params", pagination, filters, sorter, extra);
  }

  return (
    <Table
      loading={loading}
      columns={columns}
      dataSource={dataSource}
      onChange={onChange}
    />
  );
}

AdminDataTable.propTypes = {
  loading: PropTypes.bool,
  dataSource: PropTypes.array,
};

AdminDataTable.defaultProps = {
  loading: true,
  dataSource: [],
};
