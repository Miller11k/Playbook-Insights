// src/components/Navbar.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css'; // <-- Make sure this file exists

const Navbar: React.FC = () => {
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);

  return (
    <nav className="navbar">
      <ul className="nav-list">
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/about">About</Link>
        </li>
        {/* Team Stats Dropdown */}
        <li
          className="dropdown"
          onMouseEnter={() => setShowTeamDropdown(true)}
          onMouseLeave={() => setShowTeamDropdown(false)}
        >
          <span>Team Stats</span>
          {showTeamDropdown && (
            <ul className="dropdown-menu">
              <li>
                <Link to="/team-stats/passing">Passing Stats</Link>
              </li>
              <li>
                <Link to="/team-stats/receiving">Receiving Stats</Link>
              </li>
              <li>
                <Link to="/team-stats/rushing">Rushing Stats</Link>
              </li>
            </ul>
          )}
        </li>
        {/* Player Stats Dropdown */}
        <li
          className="dropdown"
          onMouseEnter={() => setShowPlayerDropdown(true)}
          onMouseLeave={() => setShowPlayerDropdown(false)}
        >
          <span>Player Stats</span>
          {showPlayerDropdown && (
            <ul className="dropdown-menu">
              <li>
                <Link to="/player-stats/passing">Passing Stats</Link>
              </li>
              <li>
                <Link to="/player-stats/receiving">Receiving Stats</Link>
              </li>
              <li>
                <Link to="/player-stats/rushing">Rushing Stats</Link>
              </li>
            </ul>
          )}
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
