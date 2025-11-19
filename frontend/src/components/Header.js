import React from "react";
import { Link, useNavigate } from "react-router-dom";
import LogoutButton from "./LogoutButton";

function Header() {
  const user = JSON.parse(localStorage.getItem("user")) || null;
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="header-left">
          <h1 className="app-title"><i className="fa fa-book-open" style={{marginRight:8}}></i>Activity Management</h1>
        </div>

        <div className="header-center">
          <nav className="main-nav">
            <Link className="nav-link" to="/"><i className="fa fa-home" style={{marginRight:6}}></i>Home</Link>
            <Link className="nav-link" to="/dashboard"><i className="fa fa-chart-line" style={{marginRight:6}}></i>Dashboard</Link>
            <Link className="nav-link" to="/activities"><i className="fa fa-list" style={{marginRight:6}}></i>Activities</Link>
          </nav>
        </div>

        <div className="header-right">
        {user ? (
          <>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}</div>
            </div>
            <LogoutButton />
          </>
        ) : (
          <div className="auth-links">
            <button className="btn btn-outline" onClick={() => navigate('/login')}>Login</button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}

export default Header;
