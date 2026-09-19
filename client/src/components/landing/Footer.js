import React from 'react';

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-logo">
          <span className="logo-icon">$</span>
          <span>ExpenseTracker</span>
        </div>
        <div className="footer-links">
          <div className="link-group">
            <h5>Product</h5>
            <a href="/features">Features</a>
            <a href="/pricing">Pricing</a>
            <a href="/security">Security</a>
          </div>
          <div className="link-group">
            <h5>Company</h5>
            <a href="/about">About</a>
            <a href="/careers">Careers</a>
            <a href="/contact">Contact</a>
          </div>
          <div className="link-group">
            <h5>Resources</h5>
            <a href="/blog">Blog</a>
            <a href="/help">Help Center</a>
            <a href="/api">API</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Finance Tracker. All rights reserved.</p>
        <div className="legal-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/cookies">Cookies</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;