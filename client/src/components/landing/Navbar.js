import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated } = useAuth();

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="logo">
          <span className="logo-icon"></span>
          <span>Finance Tracker</span>
        </div>
        <div className="nav-actions">
          {isAuthenticated ? (
            <Link to="/dashboard" className="nav-button">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Sign In
              </Link>
              <Link to="/register" className="nav-button">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;