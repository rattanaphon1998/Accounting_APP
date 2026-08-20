import { Link } from 'react-router';

function Nav({ user, onLogout }) {
  return (
    <header className="topbar">
      <div className="page-container topbar-inner">
        <Link className="brand" to="/">
          <span className="brand-mark">฿</span>
          <span>Expenses tracker</span>
        </Link>
        <nav className="nav-actions">
          <Link className="nav-link" to="/search">ค้นหารายการ</Link>
          <span className="user-chip">{user?.name || user?.email}</span>
          <button className="logout-button" onClick={onLogout}>ออกจากระบบ</button>
        </nav>
      </div>
    </header>
  );
}

export default Nav;
