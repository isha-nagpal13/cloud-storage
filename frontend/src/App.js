import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:5000/api';
const AI_URL = 'http://localhost:5001/ai';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('login');
  
  // Data states
  const [files, setFiles] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    if (token) {
      fetchUser();
      fetchFiles();
    }
  }, [token]);

  useEffect(() => {
    if (files.length > 0) {
      fetchRecommendations();
      checkDuplicates();
    }
  }, [files]);

  // ============================================
  // AUTH FUNCTIONS
  // ============================================

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
    } catch (error) {
      logout();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: formData.email,
        password: formData.password
      });

      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      setFormData({ username: '', email: '', password: '' });
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/signup`, formData);

      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      setFormData({ username: '', email: '', password: '' });
    } catch (error) {
      setError(error.response?.data?.error || 'Signup failed');
    }
    setLoading(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setFiles([]);
    setRecommendations([]);
    localStorage.removeItem('token');
  };

  // ============================================
  // FILE FUNCTIONS
  // ============================================

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/files`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API_URL}/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('✅ File uploaded successfully!');
      fetchFiles();
      e.target.value = '';
    } catch (error) {
      setError(error.response?.data?.error || 'Upload failed');
    }
    setLoading(false);
  };

  const handleDownload = async (fileId, filename) => {
    try {
      const response = await axios.get(`${API_URL}/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      fetchFiles();
    } catch (error) {
      setError('Download failed');
    }
  };

const handleDelete = async (fileId) => {
  if (!window.confirm('Delete this file?')) return;

  try {
    await axios.delete(`${API_URL}/files/${fileId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Immediately remove from UI
    setFiles(prevFiles =>
      prevFiles.filter(file => file._id !== fileId)
    );

    setSuccess('✅ File deleted');
  } catch (error) {
    setError('Delete failed');
  }
};

  // ============================================
  // AI FUNCTIONS
  // ============================================

  const fetchRecommendations = async () => {
    try {
      const response = await axios.post(`${AI_URL}/recommend`, {
        files: files.map(f => ({
          id: f._id,
          originalName: f.originalName,
          fileType: f.mimetype,
          size: f.size,
          accessCount: f.accessCount,
          lastAccessed: f.lastAccessed,
          uploadedAt: f.uploadedAt
        }))
      });

      if (response.data.success) {
        setRecommendations(response.data.recommendations.slice(0, 5));
      }
    } catch (error) {
      console.error('Recommendations error:', error);
    }
  };

const handleSmartSearch = async () => {
  if (!searchQuery.trim()) {
    setSearchResults([]);
    return;
  }

  try {
    const response = await axios.post(
      `${API_URL}/search`,
      { query: searchQuery },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setSearchResults(response.data.results);
  } catch (error) {
    console.error("Search error:", error);
    setError("Search failed");
  }
};


  const checkDuplicates = async () => {
    try {
      const response = await axios.post(`${AI_URL}/find-duplicates`, {
        files: files.map(f => ({
          _id: f._id,
          originalName: f.originalName,
          size: f.size
        }))
      });

      if (response.data.success) {
        setDuplicates(response.data.duplicates.slice(0, 3));
      }
    } catch (error) {
      console.error('Duplicate check error:', error);
    }
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype) => {
    if (!mimetype) return '📄';
    if (mimetype.includes('image')) return '🖼️';
    if (mimetype.includes('video')) return '🎥';
    if (mimetype.includes('audio')) return '🎵';
    if (mimetype.includes('pdf')) return '📕';
    if (mimetype.includes('zip')) return '📦';
    return '📄';
  };

  // ============================================
  // AUTH PAGES
  // ============================================

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">☁️</div>
            <h1>AI Cloud Storage</h1>
            <p>Intelligent file management powered by AI</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={page === 'login' ? handleLogin : handleSignup}>
            {page === 'signup' && (
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  placeholder="Enter your username"
                />
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="your@email.com"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="form-input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '⏳ Please wait...' : (page === 'login' ? '🔐 Login' : '🚀 Create Account')}
            </button>
          </form>

          <div className="auth-switch">
            {page === 'login' ? "Don't have an account? " : "Already have an account? "}
            <span
              className="auth-switch-link"
              onClick={() => {
                setPage(page === 'login' ? 'signup' : 'login');
                setError('');
              }}
            >
              {page === 'login' ? 'Sign up' : 'Login'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // DASHBOARD
  // ============================================

  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
  const storageLimit = user?.storageLimit || 5368709120;
  const storagePercent = Math.round((totalSize / storageLimit) * 100);

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-logo">
            <div className="dashboard-logo-icon">☁️</div>
            <h1>AI Cloud Storage</h1>
          </div>

          <div className="dashboard-user">
            <div className="user-info">
              <div className="user-name">👋 {user?.username}</div>
              <div className="user-email">{user?.email}</div>
            </div>
            <button className="btn-logout" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-main">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* AI Features Grid */}
        <div className="ai-features-grid">
          {/* Storage Stats */}
          <div className="ai-card">
            <div className="ai-card-header">
              <div className="ai-card-title">
                <div className="ai-icon ai-icon-purple">💾</div>
                Storage Usage
              </div>
            </div>
            <div className="stat-value">{formatSize(totalSize)}</div>
            <div className="stat-label">of {formatSize(storageLimit)} used</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${storagePercent}%` }} />
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="ai-card">
            <div className="ai-card-header">
              <div className="ai-card-title">
                <div className="ai-icon ai-icon-green">✨</div>
                AI Recommendations
              </div>
              <div className="ai-badge">ML</div>
            </div>
            {recommendations.length > 0 ? (
              <div>
                {recommendations.slice(0, 3).map((rec, i) => (
                  <div key={i} className="recommended-item">
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>
                      {rec.fileName}
                    </div>
                    <div className="recommended-score">{rec.score}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#999', fontSize: '14px' }}>
                Upload more files to see AI recommendations
              </div>
            )}
          </div>

          {/* Files Count */}
          <div className="ai-card">
            <div className="ai-card-header">
              <div className="ai-card-title">
                <div className="ai-icon ai-icon-blue">📁</div>
                Total Files
              </div>
            </div>
            <div className="stat-value">{files.length}</div>
            <div className="stat-label">files stored</div>
          </div>

          {/* Duplicates */}
          {duplicates.length > 0 && (
            <div className="ai-card">
              <div className="ai-card-header">
                <div className="ai-card-title">
                  <div className="ai-icon ai-icon-orange">🔍</div>
                  Duplicates Found
                </div>
                <div className="ai-badge">AI</div>
              </div>
              <div className="stat-value">{duplicates.length}</div>
              <div className="stat-label">groups of similar files</div>
            </div>
          )}
        </div>

        {/* Smart Search */}
        <div className="upload-section">
          <div className="ai-card-header">
            <div className="ai-card-title">
              <div className="ai-icon ai-icon-purple">🔍</div>
              Smart AI Search
            </div>
            <div className="ai-badge">NLP</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <input
              type="text"
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSmartSearch()}
              placeholder="Try: 'find my recent tax documents' or 'important files from last month'"
              style={{ flex: 1 }}
            />
            <button
              className="btn-primary"
              onClick={handleSmartSearch}
              style={{ width: 'auto', padding: '0 30px' }}
            >
              🔍 Search
            </button>
          </div>
          {searchResults.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <strong>Found {searchResults.length} matches:</strong>
              <div style={{ marginTop: '10px' }}>
                {searchResults.slice(0, 5).map((result, i) => (
                  <div key={i} className="recommended-item">
                    <div>
                      {result.file.originalName}
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {result.matchedOn}
                      </div>
                    </div>
                    <div className="recommended-score">{result.score}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* File Upload */}
        <div className="upload-section">
          <h2 className="section-title">📤 Upload Files</h2>
          <div className="upload-area">
            <input
              type="file"
              id="file-input"
              className="file-input"
              onChange={handleFileUpload}
              disabled={loading}
            />
            <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
              <div className="upload-icon">☁️</div>
              <div className="upload-text">
                {loading ? '⏳ Uploading...' : 'Click to upload file'}
              </div>
              <div className="upload-subtext">
                AI will auto-tag and analyze your file
              </div>
            </label>
          </div>
        </div>

        {/* Files List */}
        <div className="files-section">
          <div className="section-header">
            <h2 className="section-title">📂 My Files ({files.length})</h2>
          </div>

          {files.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-text">No files yet</div>
              <div className="empty-subtext">Upload your first file to see AI in action!</div>
            </div>
          ) : (
            <div className="file-grid">
              {files.map(file => (
                <div key={file._id} className="file-item">
                  <div className="file-main">
                    <div className="file-icon-wrapper">
                      {getFileIcon(file.mimetype)}
                    </div>
                    <div className="file-details">
                      <div className="file-name">{file.originalName}</div>
                      <div className="file-meta">
                        <span>{formatSize(file.size)}</span>
                        <span>•</span>
                        <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>📊 {file.accessCount || 0} accesses</span>
                        {file.tags && file.tags.length > 0 && (
                          <>
                            <span>•</span>
                            <span>🏷️ {file.tags[0].tag}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="file-actions">
                    <button
                      className="btn-icon btn-download"
                      onClick={() => handleDownload(file._id, file.originalName)}
                      title="Download"
                    >
                      ⬇️
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDelete(file._id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
