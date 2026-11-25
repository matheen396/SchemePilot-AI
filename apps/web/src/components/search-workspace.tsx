'use client';

import { FormEvent, useState } from 'react';
import { relatedPercent } from '@/lib/related-percent';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
type Program = { id: string; title: string; summary: string; benefits: string; state: string; category: string; source_url: string; demo_only: boolean; similarity: number };
type SearchPayload = { query: string; results: Program[]; durationMs: number; notice?: string };
type ChatMessage = { role: 'user' | 'assistant'; content: string; citations?: Array<{ index: number; title: string; url: string; demoOnly: boolean }> };

export function SearchWorkspace() {
  const [query, setQuery] = useState('I need help with education costs');
  const [state, setState] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<Program[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [profileAge, setProfileAge] = useState('');
  const [profileState, setProfileState] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('Which of these might fit me, and what should I verify?');
  const [chatLoading, setChatLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  async function search(event?: FormEvent) {
    event?.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch(`${API}/api/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, state: state || undefined, category: category || undefined, limit: 8, profile: profileAge ? { age: Number(profileAge) } : undefined }) });
      const payload = await response.json() as SearchPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Search could not complete.');
      setResults(payload.results); setDuration(payload.durationMs);
    } catch (e) { setError(e instanceof Error ? e.message : 'Search could not complete.'); }
    finally { setLoading(false); }
  }

  async function account(event: FormEvent, mode: 'register' | 'login') {
    event.preventDefault(); setAuthMessage('');
    try {
      const response = await fetch(`${API}/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await response.json() as { token?: string; error?: string };
      if (!response.ok || !data.token) throw new Error(data.error ?? 'Account action failed.');
      setToken(data.token); setAuthMessage(mode === 'register' ? 'Account created. Your profile can now be saved.' : 'Signed in for this session.');
    } catch (e) { setAuthMessage(e instanceof Error ? e.message : 'Account action failed.'); }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); if (!token) return setAuthMessage('Sign in first to save a profile.');
    const response = await fetch(`${API}/api/me/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ state: profileState || null, age: profileAge ? Number(profileAge) : null }) });
    setAuthMessage(response.ok ? 'Profile saved securely for this demo account.' : 'Could not save profile. Check the entries and try again.');
  }

  async function saveProgram(id: string) {
    if (!token) return setError('Sign in to save programs.');
    const response = await fetch(`${API}/api/saved`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ programId: id }) });
    if (response.ok) setSavedIds((old) => old.includes(id) ? old : [...old, id]);
    else setError('Could not save this program.');
  }

  async function ask(event: FormEvent) {
    event.preventDefault(); if (!question.trim()) return;
    const prompt = question; setQuestion(''); setChatLoading(true);
    const index = messages.length; setMessages((old) => [...old, { role: 'user', content: prompt }, { role: 'assistant', content: '' }]);
    try {
      const response = await fetch(`${API}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: prompt, state: state || undefined }) });
      if (!response.ok || !response.body) throw new Error('Assistant could not answer right now.');
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n'); buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          const eventName = chunk.split('\n').find((line) => line.startsWith('event:'))?.slice(6).trim();
          const dataLine = chunk.split('\n').find((line) => line.startsWith('data:'))?.slice(5).trim(); if (!dataLine) continue;
          if (eventName === 'token') { const text = JSON.parse(dataLine) as string; setMessages((old) => old.map((m, i) => i === index + 1 ? { ...m, content: m.content + text } : m)); }
          if (eventName === 'citations') { const citations = JSON.parse(dataLine) as ChatMessage['citations']; setMessages((old) => old.map((m, i) => i === index + 1 ? { ...m, citations } : m)); }
          if (eventName === 'error') throw new Error(JSON.parse(dataLine) as string);
        }
      }
    } catch (e) { setMessages((old) => old.map((m, i) => i === index + 1 ? { ...m, content: e instanceof Error ? e.message : 'Assistant unavailable.' } : m)); }
    finally { setChatLoading(false); }
  }

  return <>
    <section className="workspace" id="search"><div className="workspace-heading"><div><div className="section-kicker">START WITH A SEARCH</div><h2>What are you looking for?</h2></div><span className="result-note">Search across demo records</span></div>
      <form className="search-box" onSubmit={search}><label className="sr-only" htmlFor="query">Describe the support you need</label><span className="search-icon">⌕</span><input id="query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try “training support while I look for work”" /><button className="primary-button" disabled={loading}>{loading ? 'Searching…' : 'Find programs'} <span>→</span></button></form>
      <div className="filters"><label>State or territory<input value={state} onChange={(e) => setState(e.target.value)} placeholder="Any location" /></label><label>Area of support<select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All areas</option>{['Education','Entrepreneurship','Employment','Agriculture','Accessibility','Health'].map((c) => <option key={c}>{c}</option>)}</select></label><label>Your age (optional)<input type="number" min="0" max="120" value={profileAge} onChange={(e) => setProfileAge(e.target.value)} placeholder="Skip for now" /></label></div>
      {error && <p className="inline-error" role="alert">{error}</p>}{duration !== null && <div className="result-toolbar"><span>{results.length} results <small>· search took {duration} ms on this machine</small></span><button type="button" className="text-button" onClick={() => void search()}>Refresh results ↻</button></div>}
      <div className="results-grid">{results.map((program) => <article className="program-card" key={program.id}><div className="card-top"><span className="category-tag">{program.category}</span><span className="match-tag">{relatedPercent(program.similarity)}% related</span></div><h3>{program.title}</h3><p>{program.summary}</p><div className="benefit"><span>✳</span><span>{program.benefits}</span></div><div className="card-bottom"><a href={program.source_url} target="_blank" rel="noreferrer">View source ↗</a><button type="button" onClick={() => void saveProgram(program.id)}>{savedIds.includes(program.id) ? 'Saved ✓' : '☆ Save'}</button></div>{program.demo_only && <small className="demo-label">Illustrative record · not official guidance</small>}</article>)}</div>
      {duration === null && <div className="empty-state"><span>✳</span><p>Tell us what matters to you and start exploring.</p></div>}
    </section>
    <section className="product-tools"><div className="tool-card account-card" id="account"><div className="section-kicker">MAKE IT PERSONAL</div><h2>Your profile,<br /><em>your shortlist.</em></h2><p>Save a few details to filter records against the example criteria. Your information stays in this demo database.</p><form className="account-form" style={{ display: token ? 'none' : undefined }} onSubmit={(e) => void account(e, authMode)}><label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" /></label><button className="primary-button">{authMode === 'register' ? 'Create demo account' : 'Sign in'} <span>→</span></button><button className="text-button" type="button" onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}>{authMode === 'register' ? 'Already registered? Sign in' : 'New here? Create an account'}</button></form>{token && <><p className="status-note">Signed in for this browser session. <button type="button" className="text-button" onClick={() => setToken('')}>Sign out</button></p><form className="profile-form" onSubmit={(e) => void saveProfile(e)}><label>Profile state<input value={profileState} onChange={(e) => setProfileState(e.target.value)} placeholder="Karnataka" /></label><button className="secondary-button">Save profile</button></form></>}{authMessage && <p className="status-note" role="status">{authMessage}</p>}<small>Demo auth only. Use a unique test password; never reuse your personal password.</small></div>
      <div className="tool-card assistant-card" id="assistant"><div className="assistant-heading"><span className="assistant-badge">✳</span><div><div className="section-kicker">GROUNDED RAG ASSISTANT</div><h2>Ask a follow-up</h2></div></div><p className="assistant-intro">Questions are answered from retrieved records. Look for the source links and verify current details.</p><div className="chat-messages">{messages.length === 0 ? <div className="chat-placeholder"><span>“</span><p>What should I check before applying?</p></div> : messages.map((message, i) => <div className={`message ${message.role}`} key={i}><b>{message.role === 'user' ? 'You' : 'SchemePilot'}</b><p>{message.content || (chatLoading && i === messages.length - 1 ? 'Thinking…' : '')}</p>{message.citations?.map((c) => <a key={c.index} href={c.url} target="_blank" rel="noreferrer">[{c.index}] {c.title}{c.demoOnly ? ' · demo' : ''}</a>)}</div>)}</div><form className="chat-form" onSubmit={(e) => void ask(e)}><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about the results…" /><button aria-label="Send question" disabled={chatLoading}>↑</button></form><small>Responses can be incomplete. Confirm important details with the program owner.</small></div></section>
  </>;
}
