import Icon from './Icon.jsx';
import './SiteHeader.css';

const links = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'About us', href: '#about' },
];

export default function SiteHeader({ menuOpen, onMenuClose, onMenuToggle, onGetStarted }) {
  return (
    <header className="site-header" id="home">
      <div className="header-inner">
        <a className="brand" href="#home" aria-label="Lifeof Hub home">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
          <span>lifeof<span className="brand-light">hub</span></span>
        </a>

        <button
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="menu-toggle"
          onClick={onMenuToggle}
          type="button"
        >
          <Icon name={menuOpen ? 'x' : 'menu'} />
        </button>

        <nav aria-label="Main navigation" className={`main-nav${menuOpen ? ' is-open' : ''}`}>
          <div className="nav-links">
            {links.map((link) => (
              <a href={link.href} key={link.label} onClick={onMenuClose}>{link.label}</a>
            ))}
          </div>
          <a className="header-cta" href="#sign-in" onClick={(event) => { event.preventDefault(); onMenuClose(); onGetStarted(); }}>
            Get started <Icon name="arrow" size={16} />
          </a>
        </nav>
      </div>
    </header>
  );
}
