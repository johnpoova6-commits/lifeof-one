import Icon from './Icon.jsx';
import './AssistantSection.css';

const prompts = ['Summarize', 'Find the key points', 'Help me get started'];

export default function AssistantSection() {
  return (
    <section aria-labelledby="assistant-title" className="assistant-section" id="about">
      <div className="assistant-inner section-container">
        <div className="assistant-copy">
          <p className="eyebrow">A HELPFUL HAND, WHEN YOU NEED ONE</p>
          <h2 id="assistant-title">Meet your ideas <span>halfway.</span></h2>
          <p className="section-lead">
            Get unstuck, find the thread, or turn a rough thought into a clearer one. Your AI assistant is right there in your workspace.
          </p>
          <div className="assistant-benefits">
            <span><Icon name="check" size={14} /> Make long notes easier to scan</span>
            <span><Icon name="check" size={14} /> Find a fresh angle on your draft</span>
            <span><Icon name="check" size={14} /> Keep your next step in view</span>
          </div>
          <a className="section-link" href="#get-started">See what you can make <Icon name="arrow" size={15} /></a>
        </div>

        <div aria-label="Example conversation with the Lifeof Hub AI assistant" className="assistant-art">
          <div className="assistant-window">
            <div className="assistant-window-head">
              <span className="assistant-avatar"><Icon name="sparkle" size={17} /></span>
              <span><strong>Lifeof assistant</strong><small>Here to help you think</small></span>
              <span className="online-dot" />
            </div>
            <div className="chat-date">TODAY, 10:24 AM</div>
            <div className="chat-bubble user-bubble">Can you help me make sense of these launch notes?</div>
            <div className="chat-response">
              <span className="response-sparkle"><Icon name="sparkle" size={14} /></span>
              <div><strong>Absolutely. Here’s the thread I’m seeing:</strong><p>Start with the feeling you want people to have. Then let the details support that.</p><div className="response-note"><span>01</span> Keep the first impression simple</div><div className="response-note"><span>02</span> Make the next step feel easy</div></div>
            </div>
            <div className="prompt-chips">{prompts.map((prompt) => <span key={prompt}>{prompt}</span>)}</div>
            <div className="chat-input"><span>Ask anything about your workspace...</span><span className="send-button"><Icon name="arrow" size={14} /></span></div>
          </div>
          <div className="assistant-decoration decoration-star">✳</div>
          <div className="assistant-decoration decoration-sparkle"><Icon name="sparkle" size={17} /></div>
        </div>
      </div>
    </section>
  );
}
