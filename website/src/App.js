import { Row, Col, Layout, Menu, Button } from "antd";
import { Routes, Route, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Debug from "./pages/Debug";
import Signup from "./pages/Signup";
import PasswordReset from "./pages/PasswordReset";
import PasswordChange from "./pages/PasswordChange";
import { RequireAuth, RequireAdmin, useAuth } from "./contexts/AuthContext";

import MouseLightLogo from "./logo.svg";

import "./App.less";

const { Header, Content, Footer } = Layout;

const queryClient = new QueryClient();

function App() {
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const auth = useAuth();
  const { user, isAdmin } = auth;

  useEffect(() => {
    async function onLoad() {
      await auth.checkForSignedInUser();
      setIsAuthenticating(false);
    }
    onLoad();
  }, [auth]);

  return (
    <Layout className="layout">
      <Header>
        <Row gutter={16}>
          <Col span={18}>
            <div className="logo">
              <img
                src="/hortacloud_logo.png"
                alt="HortaCloud"
                style={{ float: "left", height: "60px", marginRight: "30px" }}
              />
            </div>
            <Menu theme="dark" mode="horizontal">
              <Menu.Item key="home">
                <Link to="/">Home</Link>
              </Menu.Item>
              <Menu.Item key="debug">
                <Link to="/debug">Debug</Link>
              </Menu.Item>
              {isAdmin ? (
                <Menu.Item key="admin">
                  <Link to="/admin">Admin</Link>
                </Menu.Item>
              ) : (
                ""
              )}
              {!user ? (
                <Menu.Item key="login">
                  <Link to="/login">Login</Link>
                </Menu.Item>
              ) : (
                ""
              )}
            </Menu>
          </Col>
          <Col span={6}>
            {user ? (
              <Button type="primary" onClick={() => auth.signOut()}>
                Logout {user}
              </Button>
            ) : (
              ""
            )}
          </Col>
        </Row>
      </Header>
      {isAuthenticating ? (
        "Loading"
      ) : (
        <Content style={{ padding: "1em 1em" }}>
          <div className="site-layout-content">
            <QueryClientProvider client={queryClient}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/password-reset" element={<PasswordReset />} />
                <Route path="/signup" element={<Signup />} />
                <Route
                  path="/password-change"
                  element={
                    <RequireAuth>
                      <PasswordChange />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/debug"
                  element={
                    <RequireAuth>
                      <Debug />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <RequireAdmin>
                      <RequireAuth>
                        <Admin />
                      </RequireAuth>
                    </RequireAdmin>
                  }
                />
              </Routes>
              <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
          </div>
        </Content>
      )}
      <Footer style={{ textAlign: "center" }}>
        ©{new Date().getFullYear()} HHMI
      </Footer>
    </Layout>
  );
}

export default App;
