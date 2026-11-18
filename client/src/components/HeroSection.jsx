import Icon from './Icon.jsx';
import './HeroSection.css';

export default function HeroSection({ onGetStarted }) {
  return (
    <section aria-labelledby="hero-title" className="hero-section">
      <div className="hero-inner section-container">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> YOUR IDEAS, IN GOOD COMPANY</p>
          <h1 id="hero-title">A calmer space for your <span>best work.</span></h1>
          <p className="hero-description">
            Keep your notes, files, and conversations together. Lifeof Hub gives every good idea room to grow.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#sign-in" onClick={(event) => { event.preventDefault(); onGetStarted(); }}>
              Get started <Icon name="arrow" size={17} />
            </a>
            <a className="text-link" href="#features">Explore the workspace <Icon name="chevron" size={16} /></a>
          </div>
          <div className="hero-proof">
            <div aria-hidden="true" className="avatar-stack">
              <span>J</span><span>M</span><span>A</span><span>+</span>
            </div>
            <p><strong>A little more focus.</strong> A lot more flow.</p>
          </div>
        </div>

        <div aria-label="Preview of the Lifeof Hub workspace" className="hero-art">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-floating floating-note"><Icon name="note" size={17} /><span>New idea saved</span><i /></div>
          <div className="workspace-window">
            <div className="window-topbar">
              <div className="window-brand"><span className="mini-brand-mark" /> lifeofhub</div>
              <div className="window-actions"><span /><span /><span /></div>
            </div>
            <div className="workspace-content">
              <div className="workspace-greeting">
                <div>
                  <span className="tiny-label">WEDNESDAY, NOVEMBER 12</span>
                  <h2>Good morning, Alex <span>✳</span></h2>
                  <p>Here’s a little space to get things moving.</p>
                </div>
                <div className="profile-dot">A</div>
              </div>
              <div className="workspace-stats">
                <div className="stat-box"><span className="stat-symbol green-symbol"><Icon name="note" size={15} /></span><span>Notes</span><strong>24</strong></div>
                <div className="stat-box"><span className="stat-symbol peach-symbol"><Icon name="folder" size={15} /></span><span>Folders</span><strong>08</strong></div>
                <div className="stat-box"><span className="stat-symbol lilac-symbol"><Icon name="check" size={15} /></span><span>To-dos</span><strong>12</strong></div>
              </div>
              <div className="workspace-lower">
                <div className="mini-panel recent-panel">
                  <div className="panel-heading"><strong>Pick up where you left off</strong><span>View all</span></div>
                  <div className="recent-row"><span className="recent-icon note-bg"><Icon name="note" size={14} /></span><div><strong>Ideas for the launch</strong><small>Edited 12 min ago</small></div><i /></div>
                  <div className="recent-row"><span className="recent-icon folder-bg"><Icon name="folder" size={14} /></span><div><strong>Brand &amp; identity</strong><small>4 saved items</small></div><i /></div>
                </div>
                <div className="mini-panel task-panel">
                  <div className="panel-heading"><strong>Today</strong><span>2 / 3</span></div>
                  <div className="task-line"><span className="task-check"><Icon name="check" size={10} /></span><span>Write a little, think a lot</span></div>
                  <div className="task-line"><span className="task-check"><Icon name="check" size={10} /></span><span>Share the moodboard</span></div>
                  <div className="task-line task-muted"><span className="task-empty" /><span>Plan next week</span></div>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-floating floating-progress"><span className="progress-check"><Icon name="check" size={13} /></span><span><strong>Nice work!</strong><small>3 tasks checked off</small></span></div>
        </div>
      </div>
      <a aria-label="Scroll to features" className="scroll-cue" href="#features"><span /></a>
    </section>
  );
}
