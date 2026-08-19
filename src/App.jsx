import { useState } from 'react'
import './App.css'
import Nav from './components/Nav'
import ExpenseTracker from './components/ExpenseTracker'
import TransactionList from './components/TransactionList'
import AuthPage from './components/AuthPage'
import { clearSession, getSession } from './auth'
function App() {
  const [updateTrigger, setUpdateTrigger] = useState(false);
  const [session, setSession] = useState(getSession);
  const handleUpdate = () => {
    setUpdateTrigger(prev => !prev); // เปลี่ยนค่าเพื่อ trigger useEffect
};

  if (!session) return <AuthPage onAuthenticated={setSession} />;

  const logout = () => {
    clearSession();
    setSession(null);
  };

  return (
    <div className="app-shell">
      <Nav user={session.user} onLogout={logout} />
      <main className="page-container dashboard">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Personal finance</p>
            <h1>เงินของคุณ<br />ชัดเจนขึ้นทุกวัน</h1>
            <p>บันทึกรายรับรายจ่าย แล้วติดตามยอดคงเหลือได้ในที่เดียว</p>
          </div>
          <div className="hero-note">อัปเดตล่าสุดจากรายการของคุณ</div>
        </section>
        <section className="dashboard-grid">
          <ExpenseTracker onUpdate={handleUpdate} updateTrigger={updateTrigger} />
          <TransactionList updateTrigger={updateTrigger} onChanged={handleUpdate} />
        </section>
      </main>
    </div>
  )
}

export default App
