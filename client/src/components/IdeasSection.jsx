import Icon from './Icon.jsx';
import './IdeasSection.css';

const spaces = [
  { name: 'Notes & ideas', count: '24 notes', icon: 'note', color: 'idea-green' },
  { name: 'Shared with me', count: '8 items', icon: 'folder', color: 'idea-peach' },
  { name: 'Little next steps', count: '12 to-dos', icon: 'check', color: 'idea-lilac' },
];

export default function IdeasSection({ onGetStarted }) {
  return (
    <section aria-labelledby="ideas-title" className="ideas-section" id="get-started">
      <div className="ideas-inner section-container">
        <div className="ideas-copy">
          <p className="eyebrow">A SPACE THAT GROWS WITH YOU</p>
          <h2 id="ideas-title">Make room for work <span>that matters.</span></h2>
          <p className="section-lead">
            Start with one note, one folder, one small idea. Your workspace is ready whenever you are.
          </p>
          <a className="button button-primary" href="#sign-in" onClick={(event) => { event.preventDefault(); onGetStarted(); }}>Get started <Icon name="arrow" size={17} /></a>
          <p className="ideas-caption">Thoughtful by design. Easy to make your own.</p>
        </div>
        <div aria-label="Lifeof Hub workspace overview" className="ideas-preview">
          <div className="preview-top">
            <div><span className="preview-kicker">YOUR WORKSPACE</span><strong>A little bit of everything</strong></div>
            <span className="preview-menu">•••</span>
          </div>
          <div className="preview-search"><span className="search-icon" /> Search your workspace <span className="search-shortcut">⌘ K</span></div>
          <div className="preview-list">
            {spaces.map((space) => (
              <div className="preview-row" key={space.name}>
                <span className={`preview-icon ${space.color}`}><Icon name={space.icon} size={16} /></span>
                <span className="preview-label"><strong>{space.name}</strong><small>{space.count}</small></span>
                <Icon className="preview-chevron" name="chevron" size={15} />
              </div>
            ))}
          </div>
          <div className="preview-bottom"><span className="preview-status" /> All caught up for now</div>
          <span aria-hidden="true" className="preview-decoration">✳</span>
        </div>
      </div>
    </section>
  );
}
