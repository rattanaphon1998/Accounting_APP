import { useState, useEffect } from 'react';
import { apiUrl, authHeaders } from '../auth';
// const BalanceComponent = ({ setBalance }) => {
//   useEffect(() => {
//     // ดึงค่า balance จาก API เมื่อคอมโพเนนต์โหลด
//     fetch('http://localhost:5000/api/balance')
//       .then(response => response.json()) // แปลงข้อมูลจาก response เป็น JSON
//       .then(data => setBalance(data.balance)) // อัปเดต balance state ด้วยค่าที่ได้รับ
//       .catch(error => console.error('Error fetching balance:', error)); // หากมีข้อผิดพลาด
//   }, [setBalance]); // เพิ่ม setBalance เป็น dependency
//   return null; // เนื่องจากไม่ต้องแสดงอะไรในคอมโพเนนต์นี้
// };
const BalanceComponent = ({ setBalance, updateTrigger }) => {
  useEffect(() => {
    // ดึงค่า balance จาก API ด้วย POST Method
    fetch(`${apiUrl}/api/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        // user_id: 1, // สามารถส่ง user_id หรือข้อมูลอื่นที่ต้องการ
      }),
    })
      .then(response => response.json()) // แปลงข้อมูลจาก response เป็น JSON
      .then(data => setBalance(data.balance)) // อัปเดต balance state ด้วยค่าที่ได้รับ
      .catch(error => console.error('Error fetching balance:', error)); // หากมีข้อผิดพลาด
  }, [setBalance, updateTrigger]); // เพิ่ม setBalance เป็น dependency

  return null; // เนื่องจากไม่ต้องแสดงอะไรในคอมโพเนนต์นี้
};



export default function ExpenseTracker({ onUpdate, updateTrigger }) {
  const [balance, setBalance] = useState(0); // สร้าง state สำหรับเก็บ balance
  const [description, setDescription] = useState(''); // คำอธิบาย
  const [amount, setAmount] = useState(''); // จำนวนเงิน

  
  // useEffect(() => {
  //   fetch('http://localhost:5000/api/transactions')
  //     .then(response => response.json())
  //     .then(data => setTransactions(data))
  //     .catch(error => console.error('Error fetching transactions:', error));
  // }, []);


  // Function to add a new transaction
  const addTransaction = async () => {
    if (description && amount) {
      const newTransaction = {
        description, 
        amount: parseFloat(amount),
      };

      try {
        const response = await fetch(`${apiUrl}/api/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(newTransaction),
        });

        if (response.ok) {
          const data = await response.json(); // Parse the server response
          setBalance(data.balance);
          setDescription('');
          setAmount('');
          onUpdate();
        } else {
          console.error('Failed to add transaction');
        }
      } catch (error) {
        console.error('Error adding transaction:', error);
      }
    }
  };

  return (
    <section className="tracker-card">
      <BalanceComponent setBalance={setBalance} updateTrigger={updateTrigger} />
      <p className="card-kicker">ยอดคงเหลือปัจจุบัน</p>
      <h2 className="balance-value">{Number(balance).toLocaleString('th-TH', { minimumFractionDigits: 2 })} <small>บาท</small></h2>
      <form className="transaction-form" onSubmit={event => { event.preventDefault(); addTransaction(); }}>
        <label className="field-label">รายละเอียด
          <input className="app-input" type="text" placeholder="เช่น ค่าอาหารกลางวัน" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="field-label">จำนวนเงิน
          <input className="app-input" type="number" placeholder="รายรับเป็นบวก รายจ่ายเป็นลบ" value={amount} onChange={(event) => setAmount(event.target.value)} step="0.01" />
        </label>
        <button className="primary-button">+ เพิ่มรายการ</button>
      </form>
    </section>
  );
}
