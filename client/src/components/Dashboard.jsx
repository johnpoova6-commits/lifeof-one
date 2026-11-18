import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import './Dashboard.css';

const starterNotes = [
  { id: 'n1', title: 'Ideas for the launch', content: 'Keep the first impression simple. Make the next step feel easy.', category: 'Ideas', tags: ['launch', 'brand'], color: 'sage', folderId: 'f1', pinned: true, favorite: true, archived: false, updatedAt: '2026-11-17T09:30:00.000Z' },
  { id: 'n2', title: 'A slower Sunday', content: 'Leave a little white space in the calendar. Take a long walk and bring a notebook.', category: 'Journal', tags: ['personal'], color: 'peach', folderId: 'f2', pinned: false, favorite: false, archived: false, updatedAt: '2026-11-16T14:10:00.000Z' },
  { id: 'n3', title: 'Reading list', content: 'Ways of Seeing · The Creative Act · Braiding Sweetgrass', category: 'Personal', tags: ['books', 'weekend'], color: 'lilac', folderId: 'f2', pinned: false, favorite: true, archived: false, updatedAt: '2026-11-15T10:20:00.000Z' },
  { id: 'n4', title: 'Things to explore', content: 'Small rituals that make a big difference to a creative day.', category: 'Ideas', tags: ['inspiration'], color: 'butter', folderId: '', pinned: false, favorite: false, archived: false, updatedAt: '2026-11-13T08:00:00.000Z' },
];

const starterFolders = [
  { id: 'f1', name: 'Brand & identity', description: 'Everything we are making for launch.', color: 'green', icon: '✳', favorite: true, archived: false, updatedAt: '2026-11-17T09:30:00.000Z', files: [], savedItems: [] },
  { id: 'f2', name: 'Personal corner', description: 'A home for the good little things.', color: 'peach', icon: '♡', favorite: false, archived: false, updatedAt: '2026-11-16T14:10:00.000Z', files: [], savedItems: [] },
  { id: 'f3', name: 'Reading room', description: 'Notes, links, and things to come back to.', color: 'lilac', icon: '⌕', favorite: false, archived: false, updatedAt: '2026-11-12T10:20:00.000Z', files: [], savedItems: [] },
];

const starterTasks = [
  { id: 't1', title: 'Write the first draft', done: true, due: 'Today' },
  { id: 't2', title: 'Share the moodboard', done: false, due: 'Today' },
  { id: 't3', title: 'Plan next week', done: false, due: 'Tomorrow' },
];

const navItems = [
  { label: 'Overview', icon: 'home' },
  { label: 'Notes', icon: 'note' },
  { label: 'Folders', icon: 'folder' },
  { label: 'Workflow', icon: 'check' },
  { label: 'Community', icon: 'users' },
  { label: 'AI Assistant', icon: 'sparkle' },
];

const noteColors = ['sage', 'peach', 'lilac', 'butter', 'blue'];
const defaultMaxUploadSizeMb = 100;

function openFileDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('lifeofhub-files', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open browser file storage.'));
  });
}

async function saveBrowserFile(id, file) {
  const database = await openFileDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction('files', 'readwrite');
    transaction.objectStore('files').put({ id, name: file.name, type: file.type || 'application/octet-stream', blob: file });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('Unable to save the original file.'));
    transaction.onabort = () => reject(transaction.error || new Error('Saving the original file was canceled.'));
  });
  database.close();
}

async function getBrowserFile(id) {
  const database = await openFileDatabase();
  const file = await new Promise((resolve, reject) => {
    const request = database.transaction('files', 'readonly').objectStore('files').get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Unable to read the original file.'));
  });
  database.close();
  return file;
}

async function deleteBrowserFile(id) {
  const database = await openFileDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction('files', 'readwrite');
    transaction.objectStore('files').delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('Unable to remove the original file.'));
  });
  database.close();
}

function useStoredState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch (error) {
      console.error(`Unable to load ${key} from browser storage.`, error);
      return initialValue;
    }
  });

  const updateValue = (nextValue) => {
    setValue((previous) => {
      const next = typeof nextValue === 'function' ? nextValue(previous) : nextValue;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch (error) {
        console.error(`Unable to save ${key} to browser storage.`, error);
      }
      return next;
    });
  };

  return [value, updateValue];
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

export default function Dashboard({ user, token, onSignOut }) {
  const storageSuffix = token ? `-${user.id || encodeURIComponent(user.email)}` : '';
  const [section, setSection] = useState('Overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [notes, setNotes] = useStoredState(`lifeofhub-notes${storageSuffix}`, starterNotes);
  const [folders, setFolders] = useStoredState(`lifeofhub-folders${storageSuffix}`, starterFolders);
  const [tasks, setTasks] = useStoredState(`lifeofhub-tasks${storageSuffix}`, starterTasks);
  const [activity, setActivity] = useStoredState(`lifeofhub-activity${storageSuffix}`, ['Welcome to your workspace']);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [noteSearch, setNoteSearch] = useState('');
  const [noteFilter, setNoteFilter] = useState('All notes');
  const [noteSort, setNoteSort] = useState('Recently updated');
  const [noteLayout, setNoteLayout] = useState('grid');
  const [showArchivedFolders, setShowArchivedFolders] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorStatus, setEditorStatus] = useState('All changes saved');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState(emptyNote());
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDraft, setFolderDraft] = useState({ name: '', description: '', color: 'green', icon: '✳' });
  const [folderSearch, setFolderSearch] = useState('');
  const [taskDraft, setTaskDraft] = useState('');
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [assistantMessages, setAssistantMessages] = useState([]);
  const [syncStatus, setSyncStatus] = useState(token ? 'Connecting to MongoDB...' : 'Browser preview');
  const [syncError, setSyncError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState(defaultMaxUploadSizeMb);
  const workspaceLoaded = useRef(!token);
  const uploadRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    fetch('/api/workspace', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load your workspace.');
        return result;
      })
      .then((workspace) => {
        if (!active) return;
        setNotes(workspace.notes);
        setFolders(workspace.folders);
        setTasks(workspace.tasks);
        setActivity(workspace.activity);
        workspaceLoaded.current = true;
        setSyncStatus('Synced with MongoDB');
        setSyncError('');
      })
      .catch((error) => {
        if (!active) return;
        console.error('Unable to load workspace from MongoDB:', error);
        setSyncStatus('Sync failed');
        setSyncError(error.message);
      });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!token) {
      setMaxUploadSizeMb(defaultMaxUploadSizeMb);
      return undefined;
    }
    let active = true;
    fetch('/api/files/config', { headers: { Authorization: 'Bearer ' + token } })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load upload settings.');
        return result;
      })
      .then(({ maxUploadSizeMb: configuredLimit }) => {
        if (!Number.isSafeInteger(configuredLimit) || configuredLimit < 1 || configuredLimit > 1024) {
          throw new Error('The server returned an invalid upload size setting.');
        }
        if (active) setMaxUploadSizeMb(configuredLimit);
      })
      .catch((error) => {
        if (!active) return;
        console.error('Unable to load upload settings:', error);
        setUploadError(error instanceof Error ? error.message : 'Unable to load upload settings.');
      });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!token || !workspaceLoaded.current) return undefined;
    const timeout = window.setTimeout(async () => {
      setSyncStatus('Saving...');
      try {
        const response = await fetch('/api/workspace', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ notes, folders, tasks, activity }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to save workspace.');
        setSyncStatus('Synced with MongoDB');
        setSyncError('');
      } catch (error) {
        console.error('Unable to save workspace to MongoDB:', error);
        setSyncStatus('Sync failed');
        setSyncError(error.message);
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [token, notes, folders, tasks, activity]);

  const logActivity = (message) => setActivity((items) => [message, ...items].slice(0, 8));
  const visibleNotes = useMemo(() => {
    let result;
    if (noteFilter === 'Recently deleted') result = notes.filter((note) => note.deleted);
    else if (noteFilter === 'Archived') result = notes.filter((note) => note.archived && !note.deleted);
    else result = notes.filter((note) => !note.archived && !note.deleted);
    if (noteFilter === 'Pinned') result = result.filter((note) => note.pinned);
    if (noteFilter === 'Favorites') result = result.filter((note) => note.favorite);
    if (!['All notes', 'Pinned', 'Favorites', 'Archived', 'Recently deleted'].includes(noteFilter)) {
      result = result.filter((note) => note.category === noteFilter);
    }
    const query = noteSearch.trim().toLowerCase();
    if (query) result = result.filter((note) => `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase().includes(query));
    return [...result].sort((a, b) => {
      if (noteSort === 'Name') return a.title.localeCompare(b.title);
      if (noteSort === 'Oldest') return new Date(a.updatedAt) - new Date(b.updatedAt);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }, [notes, noteFilter, noteSearch, noteSort]);

  const activeFolders = folders.filter((folder) => folder.archived === showArchivedFolders);
  const filteredFolders = activeFolders.filter((folder) => folder.name.toLowerCase().includes(folderSearch.toLowerCase()));
  const currentFolder = folders.find((folder) => folder.id === selectedFolder);
  const folderNotes = notes.filter((note) => note.folderId === selectedFolder && !note.archived && !note.deleted);

  function openEditor(note) {
    const draft = note ? { ...note, tags: note.tags.join(', ') } : emptyNote();
    setEditingNoteId(note?.id ?? null);
    setNoteDraft(draft);
    setEditorStatus('All changes saved');
    setEditorOpen(true);
    setSection('Notes');
    window.setTimeout(() => editorRef.current?.focus(), 0);
  }

  function saveNote(event) {
    event.preventDefault();
    if (!noteDraft.title.trim()) {
      setEditorStatus('Add a title before saving');
      return;
    }
    const now = new Date().toISOString();
    const nextNote = {
      ...noteDraft,
      id: editingNoteId || `note-${Date.now()}`,
      title: noteDraft.title.trim(),
      tags: noteDraft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      updatedAt: now,
      archived: Boolean(noteDraft.archived),
    };
    setNotes((items) => editingNoteId ? items.map((item) => item.id === editingNoteId ? nextNote : item) : [nextNote, ...items]);
    setEditorStatus('Saved just now');
    setEditorOpen(false);
    logActivity(`${editingNoteId ? 'Updated' : 'Created'} “${nextNote.title}”`);
  }

  function updateNote(id, changes, activityText) {
    setNotes((items) => items.map((note) => note.id === id ? { ...note, ...changes, updatedAt: new Date().toISOString() } : note));
    if (activityText) logActivity(activityText);
  }

  function createFolder(event) {
    event.preventDefault();
    if (!folderDraft.name.trim()) return;
    const folder = { ...folderDraft, id: `folder-${Date.now()}`, favorite: false, archived: false, updatedAt: new Date().toISOString(), files: [], savedItems: [], workspaceChatMessages: [], chatMessages: [] };
    setFolders((items) => [folder, ...items]);
    setFolderDialogOpen(false);
    setFolderDraft({ name: '', description: '', color: 'green', icon: '✳' });
    logActivity(`Created folder “${folder.name}”`);
  }

  async function storeFolderFiles(files) {
    if (!currentFolder) return [];
    const addedFiles = [];
    const errors = [];

    for (const file of files) {
      if (file.size > maxUploadSizeMb * 1024 * 1024) {
        errors.push(`${file.name}: files must be ${maxUploadSizeMb} MB or smaller.`);
        continue;
      }

      const id = token ? null : `file-${crypto.randomUUID()}`;
      try {
        let storedFile;
        if (token) {
          const response = await fetch('/api/files', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/octet-stream',
              'X-File-Name': encodeURIComponent(file.name),
              'X-File-Type': file.type || 'application/octet-stream',
            },
            body: file,
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || `Unable to upload ${file.name}.`);
          storedFile = result;
        } else {
          await saveBrowserFile(id, file);
          storedFile = { id, name: file.name, size: file.size, type: file.type || 'application/octet-stream', savedAt: new Date().toISOString(), storage: 'browser' };
        }
        addedFiles.push(storedFile);
      } catch (error) {
        console.error(`Unable to store original file ${file.name}:`, error);
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed.'}`);
      }
    }

    if (addedFiles.length) {
      setFolders((items) => items.map((folder) => folder.id === currentFolder.id
        ? { ...folder, files: [...(folder.files || []), ...addedFiles] }
        : folder));
      logActivity(`Added ${addedFiles.length} file${addedFiles.length > 1 ? 's' : ''} to “${currentFolder.name}”`);
    }
    setUploadError(errors.join(' '));
    return addedFiles;
  }

  async function handleUpload(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length) await storeFolderFiles(files);
  }

  async function removeFolderFile(file) {
    try {
      if (token && file.storage === 'mongodb') {
        const response = await fetch(`/api/files/${encodeURIComponent(file.id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok && response.status !== 404) {
          const result = await response.json();
          throw new Error(result.error || 'Unable to delete the original file.');
        }
      } else if (file.storage === 'browser') {
        await deleteBrowserFile(file.id);
      }
      setFolders((items) => items.map((folder) => folder.id === currentFolder?.id
        ? { ...folder, files: (folder.files || []).filter((item) => item.id !== file.id) }
        : folder));
      setUploadError('');
    } catch (error) {
      console.error(`Unable to remove original file ${file.name}:`, error);
      setUploadError(error instanceof Error ? error.message : 'Unable to remove the original file.');
    }
  }

  function sendAssistant(event) {
    event.preventDefault();
    const prompt = assistantPrompt.trim();
    if (!prompt) return;
    setAssistantMessages((messages) => [...messages, { role: 'user', text: prompt }, { role: 'assistant', text: 'I can help you shape that idea. Try turning it into one clear next step, then save the useful details as a note in your workspace.' }]);
    setAssistantPrompt('');
  }

  function sendFolderChatMessage(messageField, message, attachments) {
    const now = new Date().toISOString();
    const userMessage = { id: `${messageField}-${Date.now()}`, role: 'user', text: message, attachments, createdAt: now };
    const assistantMessage = {
      id: `${messageField}-reply-${Date.now()}`,
      role: 'assistant',
      text: 'Your message is saved in this assistant conversation. A live AI provider is not connected yet, so generated answers are not available in this preview.',
      createdAt: now,
    };
    setFolders((items) => items.map((item) => item.id === currentFolder?.id
      ? { ...item, [messageField]: [...(item[messageField] || []), userMessage, assistantMessage] }
      : item));
  }

  function selectSection(item) {
    setSection(item);
    setSelectedFolder(null);
    setMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className={`app-sidebar${menuOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <a className="brand" href="#workspace" onClick={(event) => { event.preventDefault(); selectSection('Overview'); }}>
            <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
            <span>lifeof<span className="brand-light">hub</span></span>
          </a>
          <button aria-label="Close navigation" className="sidebar-close" onClick={() => setMenuOpen(false)} type="button"><Icon name="x" /></button>
        </div>
        <div className="workspace-switcher">
          <span className="workspace-switcher-mark">L</span>
          <span><strong>My workspace</strong><small>Personal space</small></span>
          <span className="switcher-chevron">⌄</span>
        </div>
        <p className="sidebar-label">WORKSPACE</p>
        <nav aria-label="Workspace navigation" className="sidebar-nav">
          {navItems.map((item) => (
            <button className={`sidebar-link${section === item.label && !selectedFolder ? ' active' : ''}`} key={item.label} onClick={() => selectSection(item.label)} type="button">
              <Icon name={item.icon} size={17} /><span>{item.label}</span>
              {item.label === 'Notes' && <span className="sidebar-count">{notes.filter((note) => !note.archived).length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-section-heading"><span className="sidebar-label">YOUR FOLDERS</span><button aria-label="Create a folder" onClick={() => setFolderDialogOpen(true)} type="button">+</button></div>
        <div className="sidebar-folders">
          {folders.filter((folder) => !folder.archived).slice(0, 5).map((folder) => (
            <button className={`sidebar-link sidebar-folder-link${selectedFolder === folder.id ? ' active' : ''}`} key={folder.id} onClick={() => { setSelectedFolder(folder.id); setSection('Folders'); setMenuOpen(false); }} type="button">
              <span className={`sidebar-folder-dot folder-color-${folder.color}`} />{folder.name}
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-plan"><span className="plan-icon">✳</span><span><strong>A space of your own</strong><small>Make today a little lighter.</small></span></div>
          <button className="profile-button" onClick={onSignOut} type="button">
            <span className="profile-avatar">
              {user.avatarUrl ? <img alt="" src={user.avatarUrl} /> : user.name.slice(0, 1).toUpperCase()}
            </span>
            <span><strong>{user.name}</strong><small>{user.email}</small></span>
            <span className="profile-more">···</span>
          </button>
        </div>
      </aside>

      {menuOpen && <button aria-label="Close navigation overlay" className="sidebar-overlay" onClick={() => setMenuOpen(false)} type="button" />}

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <button aria-label="Open navigation" className="mobile-menu-button" onClick={() => setMenuOpen(true)} type="button"><Icon name="menu" /></button>
          <div className="breadcrumb"><span>My workspace</span><Icon name="chevron" size={14} /><strong>{currentFolder?.name || section}</strong></div>
          <label className="global-search"><Icon name="search" size={16} /><input aria-label="Search your workspace" placeholder="Search anything..." onKeyDown={(event) => { if (event.key === 'Enter') { setSection('Notes'); setNoteSearch(event.currentTarget.value); } }} /><kbd>⌘ K</kbd></label>
          <div className="notifications-wrap">
            <button aria-label="Notifications" aria-expanded={notificationsOpen} className="topbar-icon-button notification-button" onClick={() => { setNotificationsOpen((open) => !open); setNotificationsRead(true); }} type="button"><Icon name="bell" size={18} />{!notificationsRead && <span />}</button>
            {notificationsOpen && <div className="notifications-popover"><div><strong>Recent activity</strong><button onClick={() => setNotificationsOpen(false)} type="button">Close</button></div>{activity.slice(0, 4).map((item, index) => <p key={`${item}-${index}`}><span />{item}</p>)}{!activity.length && <small>You're all caught up.</small>}</div>}
          </div>
          <span aria-label={syncError || syncStatus} className={`sync-indicator${syncError ? ' sync-error' : ''}`} title={syncError || syncStatus}><span />{syncStatus}</span>
          <button aria-label={`Sign out ${user.name}`} className="topbar-avatar" onClick={onSignOut} title="Sign out" type="button">
            {user.avatarUrl ? <img alt="" src={user.avatarUrl} /> : user.name.slice(0, 1).toUpperCase()}
          </button>
        </header>

        <main className="dashboard-content">
          {selectedFolder && currentFolder
            ? <FolderDetail
              folder={currentFolder}
              notes={folderNotes}
              token={token}
              uploadError={uploadError}
              onBack={() => setSelectedFolder(null)}
              onUpload={() => uploadRef.current?.click()}
              onNoteOpen={openEditor}
              onRemoveFile={removeFolderFile}
              onRemoveSavedItem={(itemId) => setFolders((items) => items.map((item) => item.id === currentFolder.id ? { ...item, savedItems: (item.savedItems || []).filter((savedItem) => savedItem.id !== itemId) } : item))}
              onSendWorkspaceChat={(message, attachments) => sendFolderChatMessage('workspaceChatMessages', message, attachments)}
              onSendChat={(message, attachments) => sendFolderChatMessage('chatMessages', message, attachments)}
              onSaveLink={(link) => {
                const savedItem = { id: `link-${Date.now()}`, name: link.name, type: 'Link', source: 'Link', description: link.url, url: link.url, savedAt: new Date().toISOString() };
                setFolders((items) => items.map((item) => item.id === currentFolder.id ? { ...item, savedItems: [...(item.savedItems || []), savedItem] } : item));
                logActivity(`Saved “${link.name}” to “${currentFolder.name}”`);
              }}
              onAddChatFiles={storeFolderFiles}
            />
            : section === 'Overview'
              ? <Overview user={user} notes={notes} folders={folders} tasks={tasks} activity={activity} onOpen={selectSection} onNewNote={() => openEditor(null)} onNewFolder={() => setFolderDialogOpen(true)} onTaskToggle={(id) => setTasks((items) => items.map((task) => task.id === id ? { ...task, done: !task.done } : task))} />
              : section === 'Notes'
                ? <NotesPage notes={visibleNotes} allNotes={notes} search={noteSearch} setSearch={setNoteSearch} filter={noteFilter} setFilter={setNoteFilter} sort={noteSort} setSort={setNoteSort} layout={noteLayout} setLayout={setNoteLayout} editorOpen={editorOpen} openEditor={openEditor} draft={noteDraft} setDraft={(changes) => { setNoteDraft((draft) => ({ ...draft, ...changes })); setEditorStatus('Unsaved changes'); }} saveNote={saveNote} editorStatus={editorStatus} editorRef={editorRef} editingNoteId={editingNoteId} onUpdate={updateNote} onDelete={(note) => { if (note.deleted) { if (window.confirm(`Delete “${note.title}” permanently?`)) { setNotes((items) => items.filter((item) => item.id !== note.id)); logActivity(`Permanently deleted “${note.title}”`); } } else updateNote(note.id, { deleted: true }, `Moved “${note.title}” to recently deleted`); }} onRestore={(note) => updateNote(note.id, { archived: false, deleted: false }, `Restored “${note.title}”`)} onDuplicate={(note) => { setNotes((items) => [{ ...note, id: `note-${Date.now()}`, title: `${note.title} copy`, pinned: false, updatedAt: new Date().toISOString() }, ...items]); logActivity(`Duplicated “${note.title}”`); }} onArchive={(note) => updateNote(note.id, { archived: true }, `Archived “${note.title}”`)} onExport={() => downloadNotes(notes)} onCancel={() => setEditorOpen(false)} folders={folders} />
                : section === 'Folders'
                  ? <FoldersPage folders={filteredFolders} notes={notes} search={folderSearch} setSearch={setFolderSearch} archived={showArchivedFolders} setArchived={setShowArchivedFolders} onCreate={() => setFolderDialogOpen(true)} onOpen={(folder) => setSelectedFolder(folder.id)} onToggleFavorite={(folder) => setFolders((items) => items.map((item) => item.id === folder.id ? { ...item, favorite: !item.favorite } : item))} onToggleArchive={(folder) => setFolders((items) => items.map((item) => item.id === folder.id ? { ...item, archived: !item.archived } : item))} onChangeColor={(folder, color) => setFolders((items) => items.map((item) => item.id === folder.id ? { ...item, color } : item))} />
                  : section === 'Workflow'
                    ? <WorkflowPage tasks={tasks} setTasks={setTasks} draft={taskDraft} setDraft={setTaskDraft} />
                    : section === 'Community'
                      ? <CommunityPage folders={folders} onSavePost={(folderId, post) => {
                        const savedItem = { id: `post-${Date.now()}`, name: post.title, type: 'Community post', description: post.excerpt, source: 'Community', savedAt: new Date().toISOString() };
                        setFolders((items) => items.map((folder) => folder.id === folderId ? { ...folder, savedItems: [...(folder.savedItems || []), savedItem] } : folder));
                        logActivity(`Saved “${post.title}” to a folder`);
                      }} />
                      : <AssistantPage messages={assistantMessages} prompt={assistantPrompt} setPrompt={setAssistantPrompt} onSend={sendAssistant} notes={notes} />
          }
          {section === 'Folders' && selectedFolder && <input aria-label="Upload files to folder" className="visually-hidden" multiple onChange={handleUpload} ref={uploadRef} type="file" />}
          {section === 'Notes' && !selectedFolder && <div className="notes-bottom-helper"><Icon name="sparkle" size={15} /> Your notes are saved automatically in this browser.</div>}
        </main>
      </div>

      {folderDialogOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFolderDialogOpen(false); }}>
          <form aria-labelledby="folder-dialog-title" className="folder-dialog" onSubmit={createFolder}>
            <button aria-label="Close" className="modal-close" onClick={() => setFolderDialogOpen(false)} type="button"><Icon name="x" size={18} /></button>
            <span className="dialog-eyebrow">A PLACE FOR YOUR IDEAS</span>
            <h2 id="folder-dialog-title">Create a folder</h2>
            <p>Give your saved things a home of their own.</p>
            <label htmlFor="folder-name">Folder name</label>
            <input autoFocus id="folder-name" onChange={(event) => setFolderDraft({ ...folderDraft, name: event.target.value })} placeholder="e.g. Summer project" value={folderDraft.name} />
            <label htmlFor="folder-description">Description <span>Optional</span></label>
            <textarea id="folder-description" onChange={(event) => setFolderDraft({ ...folderDraft, description: event.target.value })} placeholder="What belongs in here?" value={folderDraft.description} />
            <span className="folder-color-label">Pick a color</span>
            <div className="folder-color-picker">
              {['green', 'peach', 'lilac', 'blue', 'yellow'].map((color) => <button aria-label={`${color} folder color`} aria-pressed={folderDraft.color === color} className={`folder-color-swatch folder-color-${color}`} key={color} onClick={() => setFolderDraft({ ...folderDraft, color })} type="button" />)}
            </div>
            <button className="button button-primary dialog-submit" type="submit">Create folder <span aria-hidden="true">↗</span></button>
          </form>
        </div>
      )}
    </div>
  );
}

function emptyNote() {
  return { title: '', content: '', category: 'Ideas', tags: '', color: 'sage', folderId: '', pinned: false, favorite: false, archived: false };
}

function Overview({ user, notes, folders, tasks, activity, onOpen, onNewNote, onNewFolder, onTaskToggle }) {
  const activeNotes = notes.filter((note) => !note.archived && !note.deleted);
  const activeFolders = folders.filter((folder) => !folder.archived);
  const today = new Date().toDateString();
  const todayCount = activeNotes.filter((note) => new Date(note.updatedAt).toDateString() === today).length;
  return (
    <div className="overview-page">
      <div className="welcome-row">
        <div><span className="page-eyebrow">TUESDAY, NOVEMBER 17</span><h1>Good morning, {user.name} <span>✳</span></h1><p>Here’s a little space to get things moving.</p></div>
        <button className="button button-primary overview-create" onClick={onNewNote} type="button"><Icon name="plus" size={17} /> New note</button>
      </div>
      <section aria-label="Workspace statistics" className="stats-grid">
        <StatCard icon="note" tone="green" label="All notes" value={activeNotes.length} detail="A little bit of everything" />
        <StatCard icon="folder" tone="peach" label="Folders" value={activeFolders.length} detail="Everything in its place" />
        <StatCard icon="check" tone="lilac" label="Tasks to do" value={tasks.filter((task) => !task.done).length} detail={`${tasks.filter((task) => task.done).length} already checked off`} />
        <StatCard icon="sparkle" tone="blue" label="Notes today" value={todayCount} detail="Keep the good ideas coming" />
      </section>
      <div className="overview-actions">
        <button onClick={onNewNote} type="button"><span className="action-icon action-note"><Icon name="note" size={18} /></span><span><strong>Write a note</strong><small>Capture a thought</small></span><Icon className="action-arrow" name="chevron" size={15} /></button>
        <button onClick={onNewFolder} type="button"><span className="action-icon action-folder"><Icon name="folder" size={18} /></span><span><strong>New folder</strong><small>Make a little room</small></span><Icon className="action-arrow" name="chevron" size={15} /></button>
        <button onClick={() => onOpen('Workflow')} type="button"><span className="action-icon action-task"><Icon name="check" size={18} /></span><span><strong>Add a task</strong><small>Choose your next step</small></span><Icon className="action-arrow" name="chevron" size={15} /></button>
      </div>
      <div className="overview-columns">
        <section className="panel recent-activity-panel">
          <div className="panel-title-row"><div><span className="section-eyebrow">YOUR SPACE, IN MOTION</span><h2>Recent activity</h2></div><button className="quiet-link" onClick={() => onOpen('Notes')} type="button">View notes <Icon name="arrow" size={14} /></button></div>
          <div className="activity-list">
            {activity.slice(0, 4).map((item, index) => <div className="activity-item" key={`${item}-${index}`}><span className={`activity-dot activity-dot-${index % 3}`} /><span><strong>{item}</strong><small>{index === 0 ? 'Just now' : `${index * 12} minutes ago`}</small></span></div>)}
          </div>
          <div className="recent-notes-strip"><span>RECENT NOTES</span><div>{activeNotes.slice(0, 3).map((note) => <button className={`recent-note-pill note-tone-${note.color}`} key={note.id} onClick={() => onOpen('Notes')} type="button"><Icon name="note" size={14} />{note.title}</button>)}</div></div>
        </section>
        <section className="panel overview-task-panel">
          <div className="panel-title-row"><div><span className="section-eyebrow">ONE THING AT A TIME</span><h2>Today’s tasks</h2></div><button className="quiet-link" onClick={() => onOpen('Workflow')} type="button">See all <Icon name="arrow" size={14} /></button></div>
          <div className="overview-task-list">
            {tasks.slice(0, 4).map((task) => <label className={`overview-task${task.done ? ' task-done' : ''}`} key={task.id}><input checked={task.done} onChange={() => onTaskToggle(task.id)} type="checkbox" /><span className="custom-check"><Icon name="check" size={12} /></span><span>{task.title}</span><small>{task.due}</small></label>)}
          </div>
          <div className="panel-footer-hint"><span className="hint-spark">✳</span> You’re making steady progress.</div>
        </section>
      </div>
      <section className="panel overview-folders-panel">
        <div className="panel-title-row"><div><span className="section-eyebrow">A HOME FOR YOUR WORK</span><h2>Recent folders</h2></div><button className="quiet-link" onClick={() => onOpen('Folders')} type="button">All folders <Icon name="arrow" size={14} /></button></div>
        <div className="overview-folder-grid">
          {activeFolders.slice(0, 4).map((folder) => <button className="overview-folder-card" key={folder.id} onClick={() => onOpen('Folders')} type="button"><span className={`folder-card-icon folder-color-${folder.color}`}>{folder.icon}</span><span><strong>{folder.name}</strong><small>{notes.filter((note) => note.folderId === folder.id).length + (folder.files?.length || 0)} saved items</small></span><Icon name="chevron" size={15} /></button>)}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, tone, label, value, detail }) {
  return <article className="stat-card"><span className={`stat-icon stat-${tone}`}><Icon name={icon} size={18} /></span><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><small>{detail}</small></article>;
}

function NotesPage({ notes, allNotes, search, setSearch, filter, setFilter, sort, setSort, layout, setLayout, editorOpen, openEditor, draft, setDraft, saveNote, editorStatus, editorRef, editingNoteId, onUpdate, onDelete, onRestore, onDuplicate, onArchive, onExport, onCancel, folders }) {
  const [page, setPage] = useState(1);
  const pageSize = 9;
  const totalPages = Math.ceil(notes.length / pageSize);
  const pagedNotes = notes.slice((page - 1) * pageSize, page * pageSize);
  const categories = ['All notes', 'Pinned', 'Favorites', 'Archived', 'Recently deleted', ...new Set(allNotes.filter((note) => !note.archived && !note.deleted).map((note) => note.category))];

  useEffect(() => {
    setPage(1);
  }, [search, filter, sort]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="notes-page">
      <section className="notes-section all-notes-section">
        <div className="notes-page-heading">
          <div><span className="page-eyebrow">YOUR THOUGHTS, ALL TOGETHER</span><h1>All notes <span className="heading-count">{allNotes.filter((note) => !note.archived && !note.deleted).length}</span></h1><p>A place for the ideas you want to keep close.</p></div>
          <div className="heading-actions"><button className="button button-outline" onClick={onExport} type="button"><Icon name="download" size={16} /> Export</button><button className="button button-primary" onClick={() => openEditor(null)} type="button"><Icon name="plus" size={17} /> New note</button></div>
        </div>
        <div className="notes-toolbar">
          <label className="notes-search"><Icon name="search" size={16} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Search notes..." value={search} /></label>
          <div className="note-filter-tabs" role="tablist" aria-label="Filter notes">{categories.map((category) => <button aria-selected={filter === category} className={filter === category ? 'selected' : ''} key={category} onClick={() => setFilter(category)} role="tab" type="button">{category}</button>)}</div>
          <div className="note-toolbar-right"><label className="sort-select"><span>Sort by</span><select onChange={(event) => setSort(event.target.value)} value={sort}><option>Recently updated</option><option>Name</option><option>Oldest</option></select></label><div className="layout-toggle" aria-label="Note layout"><button aria-label="Grid view" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')} type="button"><Icon name="grid" size={16} /></button><button aria-label="List view" aria-pressed={layout === 'list'} onClick={() => setLayout('list')} type="button"><Icon name="list" size={16} /></button></div></div>
        </div>
        <div className={`note-card-grid${layout === 'list' ? ' note-list-view' : ''}`}>
          {pagedNotes.map((note) => <NoteCard key={note.id} note={note} filter={filter} onOpen={() => openEditor(note)} onUpdate={onUpdate} onRestore={onRestore} onDuplicate={onDuplicate} onDelete={onDelete} onArchive={onArchive} />)}
          {!notes.length && <div className="empty-state"><span className="empty-state-icon">✳</span><h3>No notes here just yet</h3><p>Try a different search, or make space for a new idea.</p><button className="button button-primary" onClick={() => openEditor(null)} type="button">Write a note</button></div>}
        </div>
        <Pagination currentPage={page} onPageChange={setPage} pageSize={pageSize} totalItems={notes.length} />
      </section>

      <section aria-labelledby="note-editor-title" className="notes-section note-editor-section">
        <div className="editor-section-heading"><div><span className="section-eyebrow">CAPTURE THE MOMENT</span><h2 id="note-editor-title">{editorOpen ? (editingNoteId ? 'Edit your note' : 'Create a new note') : 'Create a new note'}</h2></div><span className="autosave-status"><span />{editorOpen ? editorStatus : 'Ready when you are'}</span></div>
        {editorOpen ? (
          <form className="note-editor" onSubmit={saveNote}>
            <div className="editor-title-row"><input aria-label="Note title" autoComplete="off" onChange={(event) => setDraft({ title: event.target.value })} placeholder="Give your note a title..." ref={editorRef} value={draft.title} /><button aria-label={draft.pinned ? 'Unpin note' : 'Pin note'} aria-pressed={draft.pinned} className={`editor-icon-button${draft.pinned ? ' is-active' : ''}`} onClick={() => setDraft({ pinned: !draft.pinned })} type="button"><Icon name="pin" size={17} /></button><button aria-label={draft.favorite ? 'Remove favorite' : 'Add favorite'} aria-pressed={draft.favorite} className={`editor-icon-button${draft.favorite ? ' is-active' : ''}`} onClick={() => setDraft({ favorite: !draft.favorite })} type="button"><Icon name="star" size={17} /></button></div>
            <div className="editor-format-toolbar" aria-label="Formatting toolbar"><button aria-label="Bold" onClick={() => setDraft({ content: `${draft.content} **bold text**` })} type="button"><strong>B</strong></button><button aria-label="Italic" onClick={() => setDraft({ content: `${draft.content} _italic text_` })} type="button"><em>I</em></button><button aria-label="Bullet list" onClick={() => setDraft({ content: `${draft.content}\n• ` })} type="button">• List</button><span /><button aria-label="Insert link" onClick={() => setDraft({ content: `${draft.content} [link text](https://)` })} type="button"><Icon name="link" size={15} /> Link</button><select aria-label="Note category" onChange={(event) => setDraft({ category: event.target.value })} value={draft.category}><option>Ideas</option><option>Journal</option><option>Personal</option><option>Work</option></select></div>
            <textarea aria-label="Note content" className="note-editor-content" onChange={(event) => setDraft({ content: event.target.value })} placeholder="Start wherever you are..." value={draft.content} />
            <div className="note-editor-meta"><label>Tags <input onChange={(event) => setDraft({ tags: event.target.value })} placeholder="Add tags, separated by commas" value={draft.tags} /></label><label>Folder <select onChange={(event) => setDraft({ folderId: event.target.value })} value={draft.folderId}><option value="">No folder</option>{folders.filter((folder) => !folder.archived).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label><div className="note-palette"><span>Color</span>{noteColors.map((color) => <button aria-label={`${color} note color`} aria-pressed={draft.color === color} className={`note-color-dot note-tone-${color}`} key={color} onClick={() => setDraft({ color })} type="button" />)}</div></div>
            <div className="editor-footer"><div><button className="button button-quiet" onClick={onCancel} type="button">Cancel</button><button className="button button-primary" type="submit"><Icon name="check" size={16} /> Save note</button></div><span>Changes are saved when you choose Save.</span></div>
          </form>
        ) : <button className="new-note-prompt" onClick={() => openEditor(null)} type="button"><span><Icon name="plus" size={18} /></span><strong>What's on your mind?</strong><small>Start with a thought, a reminder, or something you want to remember.</small></button>}
      </section>

      <section className="notes-section created-notes-section">
        <div className="created-notes-heading"><div><span className="section-eyebrow">YOUR COLLECTION</span><h2>Created notes</h2></div><span>{allNotes.length} notes saved</span></div>
        <div className="created-note-row">{allNotes.filter((note) => !note.archived && !note.deleted).slice(0, 4).map((note) => <button className={`created-note-preview note-tone-${note.color}`} key={note.id} onClick={() => openEditor(note)} type="button"><span>{note.category}</span><strong>{note.title}</strong><small>Edited {formatDate(note.updatedAt)}</small></button>)}</div>
      </section>

      <AssistantPanel />
    </div>
  );
}

function NoteCard({ note, filter, onOpen, onUpdate, onRestore, onDuplicate, onDelete, onArchive }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <article className={`note-card note-tone-${note.color}${note.pinned ? ' note-is-pinned' : ''}`}>
      <div className="note-card-top"><span className="note-category">{note.category}</span><div className="note-card-actions"><button aria-label={note.pinned ? 'Unpin note' : 'Pin note'} aria-pressed={note.pinned} onClick={() => onUpdate(note.id, { pinned: !note.pinned }, `${note.pinned ? 'Unpinned' : 'Pinned'} “${note.title}”`)} type="button"><Icon name="pin" size={15} /></button><button aria-label={note.favorite ? 'Remove favorite' : 'Add favorite'} aria-pressed={note.favorite} onClick={() => onUpdate(note.id, { favorite: !note.favorite })} type="button"><Icon name="star" size={15} /></button><div className="note-menu-wrap"><button aria-label={`More actions for ${note.title}`} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} type="button"><Icon name="more" size={16} /></button>{menuOpen && <div className="note-more-menu">{note.deleted ? <><button onClick={() => { onRestore(note); setMenuOpen(false); }} type="button">Restore note</button><button onClick={() => { onDelete(note); setMenuOpen(false); }} type="button">Delete permanently</button></> : note.archived ? <><button onClick={() => { onRestore(note); setMenuOpen(false); }} type="button">Restore note</button><button onClick={() => { onDelete(note); setMenuOpen(false); }} type="button">Move to trash</button></> : <><button onClick={() => { onOpen(); setMenuOpen(false); }} type="button">Edit note</button><button onClick={() => { onDuplicate(note); setMenuOpen(false); }} type="button">Duplicate</button><button onClick={() => { onArchive(note); setMenuOpen(false); }} type="button">Archive</button><button onClick={() => { onDelete(note); setMenuOpen(false); }} type="button">Move to trash</button></>}</div>}</div></div></div>
      <button className="note-card-main" onClick={onOpen} type="button"><h3>{note.title}</h3><p>{note.content || 'No details yet.'}</p></button>
      <div className="note-card-tags">{note.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
      <div className="note-card-bottom"><span>{formatDate(note.updatedAt)}</span>{note.pinned && <span className="pinned-label"><Icon name="pin" size={12} /> Pinned</span>}</div>
    </article>
  );
}

function FoldersPage({ folders, notes, search, setSearch, archived, setArchived, onCreate, onOpen, onToggleFavorite, onToggleArchive, onChangeColor }) {
  const [layout, setLayout] = useState('grid');
  const [page, setPage] = useState(1);
  const pageSize = 9;
  const totalPages = Math.ceil(folders.length / pageSize);
  const pagedFolders = folders.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, archived]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="folders-page">
      <div className="folders-heading"><div><span className="page-eyebrow">EVERYTHING HAS ITS PLACE</span><h1>{archived ? 'Archived folders' : 'Your folders'}</h1><p>Save your notes, files, and conversations together.</p></div><button className="button button-primary" onClick={onCreate} type="button"><Icon name="plus" size={17} /> New folder</button></div>
      <section className="folder-workspace-banner"><div className="folder-banner-icon"><Icon name="folder" size={20} /></div><div><span>WORKSPACE</span><h2>A home for your saved things.</h2><p>Open any folder to see notes, files, and useful little things you’ve saved.</p></div><span className="folder-banner-decoration">✳</span></section>
      <div className="folders-controls"><label className="notes-search"><Icon name="search" size={16} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Search folders..." value={search} /></label><div className="folder-filter-tabs"><button className={!archived ? 'selected' : ''} onClick={() => setArchived(false)} type="button">All folders</button><button className={archived ? 'selected' : ''} onClick={() => setArchived(true)} type="button">Archived</button></div><div className="layout-toggle"><button aria-label="Grid view" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')} type="button"><Icon name="grid" size={16} /></button><button aria-label="List view" aria-pressed={layout === 'list'} onClick={() => setLayout('list')} type="button"><Icon name="list" size={16} /></button></div></div>
      <div className={`folder-grid${layout === 'list' ? ' folder-list-view' : ''}`}>
        {pagedFolders.map((folder) => {
          const itemCount = notes.filter((note) => note.folderId === folder.id && !note.archived && !note.deleted).length + (folder.files?.length || 0) + (folder.savedItems?.length || 0);
          return <article className={`folder-card folder-card-${folder.color}`} key={folder.id}><button className="folder-card-main" onClick={() => onOpen(folder)} type="button"><span className={`folder-card-icon folder-color-${folder.color}`}>{folder.icon}</span><span className="folder-card-text"><strong>{folder.name}</strong><small>{folder.description || 'A little place for your saved things.'}</small><span className="folder-items-count">{itemCount} saved item{itemCount === 1 ? '' : 's'} · Edited {formatDate(folder.updatedAt)}</span></span><Icon className="folder-open-arrow" name="chevron" size={16} /></button><div className="folder-card-actions"><div aria-label={`Change ${folder.name} folder color`} className="folder-card-color-picker">{['green', 'peach', 'lilac', 'blue', 'yellow'].map((color) => <button aria-label={`${color} color`} aria-pressed={folder.color === color} className={`folder-card-color-swatch folder-color-${color}`} key={color} onClick={() => onChangeColor(folder, color)} title={`${color} folder color`} type="button" />)}</div><button aria-label={folder.favorite ? 'Remove favorite folder' : 'Favorite folder'} aria-pressed={folder.favorite} onClick={() => onToggleFavorite(folder)} type="button"><Icon name="star" size={15} /></button><button onClick={() => onToggleArchive(folder)} type="button">{archived ? 'Restore' : 'Archive'}</button></div></article>;
        })}
        {!folders.length && <div className="empty-state"><span className="empty-state-icon">⌕</span><h3>No folders found</h3><p>Create a folder to give your ideas a home.</p></div>}
      </div>
      <Pagination currentPage={page} onPageChange={setPage} pageSize={pageSize} totalItems={folders.length} />
    </div>
  );
}

function Pagination({ currentPage, onPageChange, pageSize, totalItems }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const firstItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const visiblePages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => startPage + index);

  return (
    <nav aria-label="Pagination" className="pagination">
      <span className="pagination-summary">Showing {firstItem}–{lastItem} of {totalItems}</span>
      <div className="pagination-controls">
        <button aria-label="Previous page" disabled={currentPage === 1} onClick={() => onPageChange((page) => page - 1)} type="button">Previous</button>
        {visiblePages.map((page) => <button aria-current={page === currentPage ? 'page' : undefined} aria-label={`Page ${page}`} className={page === currentPage ? 'pagination-current' : ''} key={page} onClick={() => onPageChange(page)} type="button">{page}</button>)}
        <button aria-label="Next page" disabled={currentPage === totalPages} onClick={() => onPageChange((page) => page + 1)} type="button">Next</button>
      </div>
    </nav>
  );
}

function FolderDetail({ folder, notes, token, uploadError, onBack, onUpload, onNoteOpen, onRemoveFile, onRemoveSavedItem, onSaveLink, onAddChatFiles, onSendWorkspaceChat, onSendChat }) {
  const files = folder.files || [];
  const savedItems = folder.savedItems || [];
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const chatRef = useRef(null);
  const workspaceChatMessages = folder.workspaceChatMessages || [];
  const chatMessages = folder.chatMessages || [];
  const savedContent = [
    ...notes.map((note) => ({ id: note.id, type: 'Note', name: note.title, description: note.content, date: note.updatedAt, color: note.color, onOpen: () => onNoteOpen(note) })),
    ...files.map((file) => ({ id: file.id, type: file.type?.startsWith('image/') ? 'Image' : file.type || 'File', name: file.name, description: `${Math.max(1, Math.round(file.size / 1024))} KB · Added to this folder`, date: file.savedAt, color: 'file', onOpen: () => setPreviewFile(file) })),
    ...savedItems.map((item) => ({ id: item.id, type: item.type || item.source || 'Saved item', name: item.name, description: item.description, date: item.savedAt, color: item.type === 'Link' ? 'Link' : 'saved', onOpen: item.type === 'Link' && item.url ? () => window.open(item.url, '_blank', 'noopener,noreferrer') : null })),
  ];
  const visibleSavedContent = savedContent;

  useEffect(() => {
    if (!previewFile) return undefined;
    let active = true;
    let objectUrl = '';
    setPreviewUrl('');
    setPreviewError('');
    setPreviewLoading(true);

    async function loadOriginal() {
      try {
        let blob;
        if (token && previewFile.storage === 'mongodb') {
          const response = await fetch(`/api/files/${encodeURIComponent(previewFile.id)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Unable to load the original file.');
          }
          blob = await response.blob();
        } else if (previewFile.storage === 'browser') {
          const storedFile = await getBrowserFile(previewFile.id);
          if (!storedFile) throw new Error('The original file is not available. Upload this file again to view it.');
          blob = storedFile.blob;
        } else {
          throw new Error('This older upload has no stored original. Upload the file again to view it.');
        }

        objectUrl = URL.createObjectURL(blob);
        if (active) setPreviewUrl(objectUrl);
      } catch (error) {
        if (active) setPreviewError(error instanceof Error ? error.message : 'Unable to load the original file.');
      } finally {
        if (active) setPreviewLoading(false);
      }
    }

    loadOriginal();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewFile, token]);

  return (
    <div className="folder-detail-page">
      <section className="folder-detail-header-row" aria-label="Folder header">
        <button className="back-link" onClick={onBack} type="button"><Icon name="chevron" size={15} /> All folders</button>
        <div className="folder-detail-heading">
          <span className={`folder-detail-icon folder-color-${folder.color}`}>{folder.icon}</span>
          <div className="folder-title-block"><span className="page-eyebrow">YOUR WORKSPACE</span><h1>{folder.name}</h1><p>{folder.description || 'Everything you have saved in one place.'}</p></div>
          <div className="folder-detail-actions">
            <button className="button button-outline" onClick={onUpload} type="button"><Icon name="upload" size={16} /> Upload files</button>
            <button className="button button-primary" onClick={() => chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} type="button"><Icon name="sparkle" size={16} /> Open assistant</button>
          </div>
        </div>
      </section>
      <div className="folder-detail-content-grid">
      <section className="folder-saved-workspace" aria-labelledby="folder-workspace-title">
        <div className="folder-workspace-top">
          <div className="folder-workspace-title-row">
            <div className="panel-title-row">
              <div><span className="section-eyebrow">YOUR SAVED WORK, AT A GLANCE</span><h2 id="folder-workspace-title">Workspace</h2></div>
              <span className="saved-count">{savedContent.length} items</span>
            </div>
            <button className="button button-outline folder-add-link" onClick={() => setLinkDialogOpen(true)} type="button"><Icon name="link" size={14} /> Save a link</button>
          </div>
          <p className="folder-workspace-lead">Documents, notes, images, links, and conversations saved to this folder.</p>
          {uploadError && <p className="auth-error folder-upload-error" role="alert">{uploadError}</p>}
        </div>
        <div className="saved-items-grid">
          {visibleSavedContent.map((item) => (
            <article className={`saved-item-card saved-preview-${item.color}`} key={item.id}>
              <button aria-label={`Open ${item.type}: ${item.name}`} className="saved-preview-main" disabled={!item.onOpen} onClick={item.onOpen || undefined} type="button">
                <span className={`saved-preview-thumb preview-thumb-${item.color}`} aria-hidden="true"><Icon name={item.type === 'Note' ? 'note' : item.type === 'Community' ? 'users' : item.type === 'Image' ? 'image' : item.type === 'Link' ? 'link' : 'file'} size={18} /></span>
                <span className="saved-preview-type">{item.type}</span>
                <strong>{item.name}</strong>
                <small>{item.description || 'Saved in this folder'}</small>
                <span className="saved-preview-date">Saved {formatDate(item.date)}</span>
              </button>
              {files.some((file) => file.id === item.id) && <button aria-label={`Remove ${item.name}`} className="saved-preview-remove" onClick={() => onRemoveFile(files.find((file) => file.id === item.id))} type="button"><Icon name="x" size={13} /></button>}
              {savedItems.some((savedItem) => savedItem.id === item.id) && <button aria-label={`Remove ${item.name}`} className="saved-preview-remove" onClick={() => onRemoveSavedItem(item.id)} type="button"><Icon name="x" size={13} /></button>}
            </article>
          ))}
          {!savedContent.length && <div className="empty-state folder-empty-state"><span className="empty-state-icon">✳</span><h3>Your workspace is ready</h3><p>Save a note or upload a file to start filling this folder with good things.</p></div>}
          <button className="saved-item-add" onClick={onUpload} type="button"><span><Icon name="plus" size={17} /></span><strong>Upload files</strong><small>Documents and images</small></button>
        </div>
        <section aria-labelledby="workspace-assistant-title" className="workspace-assistant-embedded">
          <div className="workspace-assistant-embedded-heading">
            <div><span className="section-eyebrow">YOUR WORKSPACE ASSISTANT</span><h3 id="workspace-assistant-title">AI assistant</h3></div>
            <span className="folder-assistant-status"><span /> Folder chat</span>
          </div>
          <FolderAssistantChat folderName={folder.name} files={files} messages={workspaceChatMessages} onAddFiles={onAddChatFiles} onOpenFile={setPreviewFile} onSend={onSendWorkspaceChat} />
        </section>
      </section>
      <section className="folder-assistant-section" aria-labelledby="folder-assistant-title" ref={chatRef}>
        <div className="folder-assistant-heading"><div><span className="section-eyebrow">YOUR WORKSPACE ASSISTANT</span><h2 id="folder-assistant-title">AI assistant</h2><p>Ask about your saved documents, notes, and links in {folder.name}.</p></div><span className="folder-assistant-status"><span /> Folder chat</span></div>
        <FolderAssistantChat folderName={folder.name} files={files} messages={chatMessages} onAddFiles={onAddChatFiles} onOpenFile={setPreviewFile} onSend={onSendChat} />
      </section>
      </div>
      {linkDialogOpen && <SaveFolderLinkDialog onClose={() => setLinkDialogOpen(false)} onSave={(link) => { onSaveLink(link); setLinkDialogOpen(false); }} />}
      {previewFile && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewFile(null); }}><section aria-labelledby="file-preview-title" aria-modal="true" className="file-preview-dialog" role="dialog"><button aria-label="Close file preview" className="modal-close" onClick={() => setPreviewFile(null)} type="button"><Icon name="x" size={18} /></button><span className="dialog-eyebrow">ORIGINAL FILE</span><h2 id="file-preview-title">{previewFile.name}</h2><p>{previewFile.type} · {Math.max(1, Math.round(previewFile.size / 1024))} KB</p>{previewLoading && <p role="status">Loading original file…</p>}{previewError && <p className="auth-error" role="alert">{previewError}</p>}{previewUrl && previewFile.type?.startsWith('image/') && <img alt={previewFile.name} className="original-file-image" src={previewUrl} />}{previewUrl && previewFile.type === 'application/pdf' && <iframe className="original-file-frame" src={previewUrl} title={`Preview of ${previewFile.name}`} />}{previewUrl && previewFile.type?.startsWith('audio/') && <audio className="original-file-media" controls src={previewUrl} />}{previewUrl && previewFile.type?.startsWith('video/') && <video className="original-file-media" controls src={previewUrl} />}{previewUrl && !previewFile.type?.startsWith('image/') && previewFile.type !== 'application/pdf' && !previewFile.type?.startsWith('audio/') && !previewFile.type?.startsWith('video/') && <a className="button button-primary original-file-download" download={previewFile.name} href={previewUrl}>Download original file</a>}</section></div>}
    </div>
  );
}

function SaveFolderLinkDialog({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    try {
      const parsedUrl = new URL(url.trim());
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Use a web link that starts with https://.');
      onSave({ name: name.trim() || parsedUrl.hostname, url: parsedUrl.toString() });
    } catch (validationError) {
      setError(validationError instanceof Error && validationError.message ? validationError.message : 'Enter a valid web link.');
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form aria-labelledby="save-link-title" className="folder-dialog" onSubmit={handleSubmit}>
        <button aria-label="Close" className="modal-close" onClick={onClose} type="button"><Icon name="x" size={18} /></button>
        <span className="dialog-eyebrow">SAVE FOR LATER</span>
        <h2 id="save-link-title">Add a link</h2>
        <p>Keep a useful page with the rest of this folder.</p>
        <label htmlFor="folder-link-name">Link name <span>Optional</span></label>
        <input autoFocus id="folder-link-name" onChange={(event) => setName(event.target.value)} placeholder="e.g. Project inspiration" value={name} />
        <label htmlFor="folder-link-url">Web address</label>
        <input id="folder-link-url" onChange={(event) => { setUrl(event.target.value); setError(''); }} placeholder="https://example.com" required type="url" value={url} />
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="button button-primary dialog-submit" type="submit">Save link <Icon name="check" size={15} /></button>
      </form>
    </div>
  );
}

function FolderAssistantChat({ folderName, files, messages, onAddFiles, onOpenFile, onSend }) {
  const [draft, setDraft] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length]);

  const handleAttachmentSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selectedFiles.length) return;
    const addedFiles = await onAddFiles(selectedFiles);
    setPendingAttachments((attachments) => [...attachments, ...addedFiles.map((file) => ({ id: file.id, name: file.name, size: file.size, type: file.type, storage: file.storage }))]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text && !pendingAttachments.length) return;
    onSend(text || 'Please help me with these files.', pendingAttachments);
    setDraft('');
    setPendingAttachments([]);
  };

  return (
    <div className="folder-chat-window">
      <header className="folder-chat-header">
        <span className="assistant-avatar"><Icon name="sparkle" size={17} /></span>
        <div><strong>{folderName} assistant</strong><small>Folder conversation · preview mode</small></div>
        <span className="folder-chat-members"><span /> Just you</span>
      </header>
      <div aria-live="polite" className="folder-chat-messages">
        {!messages.length && <div className="folder-chat-welcome"><span className="assistant-welcome-spark">✳</span><strong>Welcome to your folder chat</strong><p>Ask about your saved items, or attach a document to include it in this conversation.</p><div className="folder-chat-suggestions"><button onClick={() => setDraft(`Help me organize the items in ${folderName}`)} type="button">Help organize this folder</button><button onClick={() => setDraft('What files are in this folder?')} type="button">List my folder files</button></div></div>}
        {messages.map((message) => (
          <article className={`folder-chat-message folder-chat-${message.role}`} key={message.id}>
            {message.role === 'assistant' && <span className="folder-chat-message-avatar"><Icon name="sparkle" size={13} /></span>}
            <div className="folder-chat-bubble"><span className="folder-chat-sender">{message.role === 'assistant' ? 'Assistant preview' : 'You'}</span><p>{message.text}</p>{message.attachments?.length > 0 && <ChatAttachmentGrid attachments={message.attachments} files={files} onOpenFile={onOpenFile} />}<small>{new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(message.createdAt))}</small></div>
            {message.role === 'user' && <span className="folder-chat-user-avatar">Y</span>}
          </article>
        ))}
        <div ref={endOfMessagesRef} />
      </div>
      <div className="folder-chat-context"><Icon name="file" size={14} /> {files.length ? `${files.length} folder file${files.length === 1 ? '' : 's'} available to attach` : 'Attach a file to add it to this folder workspace'}</div>
      <form className="folder-chat-compose" onSubmit={handleSubmit}>
        <input accept="image/*,.pdf,.doc,.docx,.txt,.md" aria-label="Attach files to chat" className="visually-hidden" multiple onChange={handleAttachmentSelect} ref={fileInputRef} type="file" />
        <button aria-label="Attach a file or image" className="folder-chat-attach" onClick={() => fileInputRef.current?.click()} type="button"><Icon name="paperclip" size={19} /></button>
        <textarea aria-label="Message the folder assistant" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={`Message ${folderName} assistant...`} rows={1} value={draft} />
        <button aria-label="Send message" className="folder-chat-send" disabled={!draft.trim() && !pendingAttachments.length} type="submit"><Icon name="arrow" size={17} /></button>
        {pendingAttachments.length > 0 && <div aria-label="Files ready to send" className="folder-chat-pending"><ChatAttachmentGrid attachments={pendingAttachments} files={files} onOpenFile={onOpenFile} onRemove={(file) => setPendingAttachments((items) => items.filter((item) => item.id !== file.id))} /></div>}
      </form>
      <p className="folder-chat-note">Messages are saved with this folder. Live AI responses are not connected in this preview.</p>
    </div>
  );
}

function ChatAttachmentGrid({ attachments, files, onOpenFile, onRemove }) {
  return (
    <div className="chat-attachment-grid">
      {attachments.map((attachment) => {
        const file = files.find((item) => item.id === attachment.id) || attachment;
        const canOpen = Boolean(file.storage);
        const fileType = file.type || '';
        const extension = file.name?.split('.').pop();
        const typeLabel = fileType.startsWith('image/') ? 'Image' : fileType === 'application/pdf' ? 'PDF' : extension && extension !== file.name ? extension.toUpperCase() : 'Document';
        const sizeLabel = file.size ? file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB` : typeLabel;

        return (
          <article className="chat-attachment-card" key={attachment.id}>
            <button aria-label={`Open ${file.name}`} className="chat-attachment-open" disabled={!canOpen} onClick={() => onOpenFile(file)} title={file.name} type="button">
              <span className="chat-attachment-icon"><Icon name={fileType.startsWith('image/') ? 'image' : 'file'} size={17} /></span>
              <strong>{file.name}</strong>
              <small>{typeLabel} · {sizeLabel}</small>
            </button>
            {onRemove && <button aria-label={`Remove ${file.name} from message`} className="chat-attachment-remove" onClick={() => onRemove(attachment)} type="button"><Icon name="x" size={12} /></button>}
          </article>
        );
      })}
    </div>
  );
}

function CommunityPage({ folders, onSavePost }) {
  const [selectedFolder, setSelectedFolder] = useState(folders.find((folder) => !folder.archived)?.id || '');
  const [savedPosts, setSavedPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const posts = [
    { id: 'p1', author: 'Maya Chen', initials: 'MC', category: 'Creative practice', title: 'Make a tiny ritual for starting', excerpt: 'A two-minute reset before a big task can turn an overwhelming blank page into a place to begin.', color: 'sage', likes: 28 },
    { id: 'p2', author: 'Jon Bell', initials: 'JB', category: 'Notes & ideas', title: 'Keep a “not now” list', excerpt: 'Give distractions somewhere to land. You can come back to them later without losing your focus today.', color: 'peach', likes: 19 },
    { id: 'p3', author: 'Ari Soto', initials: 'AS', category: 'Small wins', title: 'The walk is part of the work', excerpt: 'Some of my clearest ideas arrive when I leave enough room for a little fresh air.', color: 'lilac', likes: 34 },
  ];
  const activeFolders = folders.filter((folder) => !folder.archived);
  return (
    <div className="community-page">
      <div className="community-heading"><div><span className="page-eyebrow">GOOD IDEAS TRAVEL</span><h1>Community</h1><p>A thoughtful corner for sharing what helps you do your best work.</p></div><span className="community-online"><span /> A little inspiration, shared</span></div>
      <section className="community-feature"><span className="community-feature-icon">✳</span><div><span>THIS WEEK'S THEME</span><h2>Make room for a new idea.</h2><p>Small rituals, kind reminders, and things worth passing along.</p></div><span className="community-decoration">✿</span></section>
      <div className="community-feed-heading"><div><span className="section-eyebrow">FROM THE COMMUNITY</span><h2>Notes worth keeping</h2></div><label className="community-save-target">Save to<select aria-label="Choose a folder for saved posts" onChange={(event) => setSelectedFolder(event.target.value)} value={selectedFolder}><option value="">Choose a folder</option>{activeFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label></div>
      <div className="community-feed">{posts.map((post) => <article className={`community-post community-post-${post.color}`} key={post.id}><div className="community-post-meta"><span className="community-author-avatar">{post.initials}</span><span><strong>{post.author}</strong><small>{post.category} · 2 days ago</small></span><button aria-label={`Like ${post.title}`} aria-pressed={likedPosts.includes(post.id)} className={`community-like${likedPosts.includes(post.id) ? ' is-liked' : ''}`} onClick={() => setLikedPosts((items) => items.includes(post.id) ? items.filter((id) => id !== post.id) : [...items, post.id])} type="button">♡ {post.likes + Number(likedPosts.includes(post.id))}</button></div><h3>{post.title}</h3><p>{post.excerpt}</p><div className="community-post-footer"><span>Shared with care</span><button disabled={!selectedFolder || savedPosts.includes(post.id)} onClick={() => { onSavePost(selectedFolder, post); setSavedPosts((items) => [...items, post.id]); }} type="button"><Icon name="folder" size={14} />{savedPosts.includes(post.id) ? 'Saved to folder' : 'Save to workspace'}</button></div></article>)}</div>
      <p className="community-preview-label">Community posts are sample content in this preview.</p>
    </div>
  );
}

function WorkflowPage({ tasks, setTasks, draft, setDraft }) {
  const [filter, setFilter] = useState('All tasks');
  const filteredTasks = tasks.filter((task) => filter === 'All tasks' || (filter === 'Completed' ? task.done : !task.done));
  const addTask = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setTasks((items) => [...items, { id: `task-${Date.now()}`, title: draft.trim(), done: false, due: 'No date' }]);
    setDraft('');
  };
  return (
    <div className="workflow-page">
      <div className="workflow-heading"><div><span className="page-eyebrow">A CLEARER NEXT STEP</span><h1>Workflow</h1><p>Turn the big picture into a short, doable list.</p></div><span className="workflow-progress-ring"><strong>{tasks.length ? Math.round((tasks.filter((task) => task.done).length / tasks.length) * 100) : 0}%</strong><small>done</small></span></div>
      <section className="workflow-board"><div className="workflow-board-heading"><div><span className="section-eyebrow">YOUR PERSONAL FLOW</span><h2>Tasks &amp; reminders</h2></div><div className="folder-filter-tabs">{['All tasks', 'To do', 'Completed'].map((item) => <button className={filter === item ? 'selected' : ''} key={item} onClick={() => setFilter(item)} type="button">{item}</button>)}</div></div>
        <form className="add-task-form" onSubmit={addTask}><Icon name="plus" size={18} /><input aria-label="New task" onChange={(event) => setDraft(event.target.value)} placeholder="Add a small next step..." value={draft} /><button className="button button-primary" type="submit">Add task</button></form>
        <div className="workflow-task-list">{filteredTasks.map((task) => <div className={`workflow-task-row${task.done ? ' task-done' : ''}`} key={task.id}><label><input checked={task.done} onChange={() => setTasks((items) => items.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))} type="checkbox" /><span className="custom-check"><Icon name="check" size={12} /></span><span>{task.title}</span></label><span className="task-due">{task.due}</span><button aria-label={`Delete ${task.title}`} onClick={() => setTasks((items) => items.filter((item) => item.id !== task.id))} type="button"><Icon name="trash" size={15} /></button></div>)}{!filteredTasks.length && <div className="workflow-empty">A lovely clean slate. Add a task whenever you're ready.</div>}</div>
      </section>
      <section className="workflow-nudge"><span>✳</span><div><strong>Progress, not perfection.</strong><p>Pick one thing that would make today feel a little easier.</p></div></section>
    </div>
  );
}

function AssistantPage({ messages, prompt, setPrompt, onSend, notes }) {
  const [quickAction, setQuickAction] = useState('');
  const actions = ['Summarize', 'Explain', 'Improve', 'Rewrite', 'Translate'];
  return (
    <div className="assistant-page">
      <div className="assistant-page-heading"><div><span className="page-eyebrow">A HELPFUL HAND, WHEN YOU NEED ONE</span><h1>Your AI assistant</h1><p>Bring a question, a draft, or a note you want to think through.</p></div><span className="assistant-availability"><span /> Ready to help</span></div>
      <section className="assistant-chat-panel"><div className="assistant-chat-header"><span className="assistant-avatar"><Icon name="sparkle" size={17} /></span><div><strong>Lifeof assistant</strong><small>Here to help you think</small></div><button aria-label="Start a new chat" onClick={() => { setPrompt(''); setQuickAction(''); }} type="button"><Icon name="plus" size={17} /></button></div><div className="assistant-chat-body"><div className="assistant-welcome"><span className="assistant-welcome-spark">✳</span><h2>What would you like to work through?</h2><p>Try a quick action, or ask a question about your {notes.length} notes.</p><div className="assistant-quick-actions">{actions.map((action) => <button className={quickAction === action ? 'selected' : ''} key={action} onClick={() => { setQuickAction(action); setPrompt(`${action} my latest note`); }} type="button">{action}</button>)}</div></div>{messages.map((message, index) => <div className={`assistant-message message-${message.role}`} key={`${message.role}-${index}`}><span>{message.role === 'assistant' ? '✳' : 'You'}</span><p>{message.text}</p></div>)}</div><form className="assistant-compose" onSubmit={onSend}><button aria-label="Attach a file" onClick={() => setQuickAction('Attachments are available in a connected workspace.')} type="button"><Icon name="paperclip" size={18} /></button><input aria-label="Ask the assistant" onChange={(event) => setPrompt(event.target.value)} placeholder="Ask something about your workspace..." value={prompt} /><button aria-label="Send message" className="assistant-send" type="submit"><Icon name="arrow" size={16} /></button></form>{quickAction.startsWith('Attachments') && <p className="assistant-note">{quickAction}</p>}</section>
      <p className="assistant-disclaimer">AI preview replies are examples. Connect an AI provider to enable generated responses.</p>
    </div>
  );
}

function AssistantPanel() {
  const [prompt, setPrompt] = useState('');
  const [reply, setReply] = useState('');
  const prompts = ['Summarize', 'Find key points', 'Help me get started'];
  const submit = (event) => {
    event.preventDefault();
    if (prompt.trim()) {
      setReply('A good place to start: write down the one idea you want to keep, then choose a small next step.');
      setPrompt('');
    }
  };
  return (
    <section className="notes-assistant-panel"><div className="notes-assistant-copy"><span className="assistant-mini-icon"><Icon name="sparkle" size={17} /></span><div><span className="section-eyebrow">A HELPFUL HAND</span><h2>AI assistant</h2><p>Find the thread, make a plan, or get unstuck with your ideas.</p></div></div><div className="assistant-quick-actions">{prompts.map((item) => <button key={item} onClick={() => setPrompt(`${item} my latest note`)} type="button">{item}</button>)}</div><form className="assistant-inline-compose" onSubmit={submit}><input aria-label="Ask AI about your notes" onChange={(event) => setPrompt(event.target.value)} placeholder="Ask something about your notes..." value={prompt} /><button aria-label="Send to assistant" className="assistant-send" type="submit"><Icon name="arrow" size={16} /></button></form>{reply && <p className="assistant-inline-reply">{reply}</p>}<small className="assistant-preview-label">Preview responses are examples; connect an AI provider for generated answers.</small></section>
  );
}

function downloadNotes(notes) {
  const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'lifeof-hub-notes.json';
  link.click();
  URL.revokeObjectURL(url);
}
