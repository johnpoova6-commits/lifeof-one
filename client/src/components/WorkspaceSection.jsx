import Icon from './Icon.jsx';
import './WorkspaceSection.css';

const capabilities = [
  { icon: 'note', title: 'Notes that stay close', detail: 'Capture a thought now, find it when you need it.' },
  { icon: 'folder', title: 'Files with a home', detail: 'Keep useful documents and ideas in one tidy place.' },
  { icon: 'check', title: 'A clearer next step', detail: 'Turn the big picture into a short, doable list.' },
];

export default function WorkspaceSection() {
  return (
    <section aria-labelledby="workspace-title" className="workspace-section section-container" id="features">
      <div aria-label="Colorful notes organized in Lifeof Hub" className="notes-art">
        <div className="notes-backdrop" />
        <article className="sample-note sample-note-green">
          <span className="note-kicker">THOUGHTS &amp; IDEAS</span>
          <strong>Make it simple.<br />Make it matter.</strong>
          <span className="note-lines"><i /><i /><i /></span>
          <span className="note-sticker">✳</span>
        </article>
        <article className="sample-note sample-note-peach">
          <span className="note-kicker">A LITTLE REMINDER</span>
          <strong>Leave room<br />for the good stuff.</strong>
          <span className="note-date">TODAY · 9:41 AM</span>
        </article>
        <article className="sample-note sample-note-lilac">
          <span className="note-icon"><Icon name="folder" size={17} /></span>
          <strong>Weekend<br />reading list</strong>
          <span className="note-date">5 saved links</span>
        </article>
        <div className="notes-tag"><span /> Everything has its place</div>
      </div>

      <div className="workspace-copy">
        <p className="eyebrow">A GOOD PLACE TO BEGIN</p>
        <h2 id="workspace-title">All the pieces of your day, <span>finally together.</span></h2>
        <p className="section-lead">
          Your best work doesn’t happen in a dozen tabs. Bring the little things and big ideas into one workspace that feels easy to use.
        </p>
        <div className="capability-list">
          {capabilities.map((item) => (
            <div className="capability" key={item.title}>
              <span className="capability-icon"><Icon name={item.icon} size={16} /></span>
              <span><strong>{item.title}</strong><small>{item.detail}</small></span>
            </div>
          ))}
        </div>
        <a className="section-link" href="#get-started">Take a look around <Icon name="arrow" size={15} /></a>
      </div>
    </section>
  );
}
