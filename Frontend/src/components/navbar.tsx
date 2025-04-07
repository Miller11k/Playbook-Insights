import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar: React.FC = () => {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="logo">PLAYBOOK INSIGHTS</h1>
      </div>
      <div className="navbar-right">
        <ul className="nav-list">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/about">About</Link>
          </li>
          <li className="dropdown">
            <span>Team Stats</span>
            <ul className="dropdown-menu">
              <li><Link to="/team-stats/passing">Passing Stats</Link></li>
              <li><Link to="/team-stats/receiving">Receiving Stats</Link></li>
              <li><Link to="/team-stats/rushing">Rushing Stats</Link></li>
            </ul>
          </li>
          <li className="dropdown">
            <span>Player Stats</span>
            <ul className="dropdown-menu">
              <li><Link to="/player-stats/passing">Passing Stats</Link></li>
              <li><Link to="/player-stats/receiving">Receiving Stats</Link></li>
              <li><Link to="/player-stats/rushing">Rushing Stats</Link></li>
            </ul>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
