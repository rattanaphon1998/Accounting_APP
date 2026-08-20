import { useState } from 'react';
import { apiUrl, saveSession } from '../auth';

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async event => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiUrl}/api/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
      saveSession(data);
      onAuthenticated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return <main className="auth-page">
    <form onSubmit={submit} className="auth-card">
        <div className="brand"><span className="brand-mark">฿</span><span>Expenses tracker</span></div>
        <h1>{mode === 'login' ? 'ยินดีต้อนรับ' : 'เริ่มจัดการเงินของคุณ'}</h1>
        <p>{mode === 'login' ? 'เข้าสู่ระบบเพื่อดูภาพรวมการเงินของคุณ' : 'สร้างบัญชีฟรี ใช้งานได้ทันที'}</p>
        <div className="auth-form">
        {mode === 'register' && <input className="app-input" placeholder="ชื่อ (ไม่บังคับ)" value={name} onChange={e => setName(e.target.value)} />}
        <input className="app-input" type="email" placeholder="อีเมล" required value={email} onChange={e => setEmail(e.target.value)} />
        <input className="app-input" type="password" placeholder="รหัสผ่านอย่างน้อย 8 ตัวอักษร" minLength="8" required value={password} onChange={e => setPassword(e.target.value)} />
        {error && <p className="text-error text-sm">{error}</p>}
        <button className="primary-button" disabled={loading}>{loading ? 'กำลังดำเนินการ…' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'}</button>
        <button type="button" className="secondary-button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'ยังไม่มีบัญชี? สร้างบัญชี' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
        </button>
        </div>
    </form>
  </main>;
}
