import './SiteFooter.css';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner section-container">
        <a className="brand footer-brand" href="#home" aria-label="Lifeof Hub home">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
          <span>lifeof<span className="brand-light">hub</span></span>
        </a>
        <p>Keep a little space for what matters.</p>
        <span className="footer-copyright">© {new Date().getFullYear()} Lifeof Hub</span>
      </div>
    </footer>
  );
}
