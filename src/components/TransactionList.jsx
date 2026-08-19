import { useCallback, useEffect, useState } from 'react';
import { apiUrl, authHeaders } from '../auth';

export default function TransactionList({ updateTrigger, onChanged }) {
    const [transactions, setTransactions] = useState([]);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [balance, setBalance] = useState(0);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchTransactions = useCallback(async () => {
        try {
            const response = await fetch(`${apiUrl}/api/transactions`, { headers: authHeaders() });
            if (!response.ok) throw new Error('Unable to load transactions');
            const data = await response.json();
            setTransactions(data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setError('ไม่สามารถโหลดรายการได้');
        }
    }, []);

const fetchbalance = useCallback(async () => {
    try {
        const response = await fetch(`${apiUrl}/api/balance`, {
            headers: authHeaders()
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || 'Unable to load balance');
        }

        const data = await response.json();

        console.log('Balance:', data.balance);
        setBalance(Number(data.balance));

    } catch (error) {
        console.error('Error fetching balance:', error);
        setError('ไม่สามารถโหลด balance ได้');
    }
}, []);

    useEffect(() => {
    fetchTransactions();
    fetchbalance();
}, [fetchTransactions, fetchbalance, updateTrigger]);

    const startEdit = transaction => {
        setEditingTransaction(transaction);
        setDescription(transaction.description);
        setAmount(transaction.amount);
        setError('');
    };

    const closeEdit = () => {
        setEditingTransaction(null);
        setDescription('');
        setAmount('');
        setError('');
    };

    const saveEdit = async event => {
        event.preventDefault();
        const parsedAmount = Number(amount);
        if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount === 0) {
            setError('กรุณากรอกรายละเอียดและจำนวนเงินที่ไม่เป็นศูนย์');
            return;
        }

        setIsSaving(true);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/transactions/${editingTransaction.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ description: description.trim(), amount: parsedAmount }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'ไม่สามารถแก้ไขรายการได้');
            closeEdit();
            await fetchTransactions();
            onChanged();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteTransaction = async transaction => {
        if (!window.confirm(`ลบรายการ “${transaction.description}” ใช่หรือไม่?`)) return;
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/transactions/${transaction.id}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'ไม่สามารถลบรายการได้');
            await fetchTransactions();
            onChanged();
        } catch (requestError) {
            setError(requestError.message);
        }
    };

    return (
        <section className="transaction-card">
            <div className="transaction-heading">
                <div><p className="card-kicker">ประวัติการเงิน</p><h2>รายการล่าสุด</h2></div>
                <span>สูงสุด 10 รายการ</span>
            </div>
            <div className="overflow-x-auto">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>รายละเอียด</th>
                        <th>จำนวนเงิน</th>
                        <th><span className="sr-only">จัดการ</span></th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((t, index) => (
                        <tr key={t.id}>
                            <th>{index + 1}</th>
                            <td>{t.description}</td>
                            <td className={Number(t.amount) >= 0 ? 'amount-income' : 'amount-expense'}>{Number(t.amount) >= 0 ? '+' : ''}{Number(t.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                            <td className="whitespace-nowrap">
                                <button className="action-button" onClick={() => startEdit(t)}>แก้ไข</button>
                                <button className="action-button delete-button" onClick={() => deleteTransaction(t)}>ลบ</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
            {transactions.length === 0 && !error && <div className="empty-state"><strong>ยังไม่มีรายการ</strong>เริ่มบันทึกรายรับหรือรายจ่ายรายการแรกได้เลย</div>}
            {error && <p className="text-error text-center mt-3">{error}</p>}

            {editingTransaction && (
                <dialog open className="modal">
                    <div className="modal-box">
                        <h2 className="font-bold text-xl mb-4">แก้ไขรายการ</h2>
                        <form onSubmit={saveEdit} className="space-y-3">
                            <input className="input input-bordered w-full" value={description} onChange={event => setDescription(event.target.value)} placeholder="คำอธิบาย" autoFocus />
                            <input className="input input-bordered w-full" type="number" value={amount} onChange={event => setAmount(event.target.value)} placeholder="จำนวนเงิน" step="0.01" />
                            {error && <p className="text-error text-sm">{error}</p>}
                            <div className="modal-action">
                                <button type="button" className="btn" onClick={closeEdit} disabled={isSaving}>ยกเลิก</button>
                                <button className="btn btn-primary" disabled={isSaving}>{isSaving ? 'กำลังบันทึก…' : 'บันทึก'}</button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop"><button onClick={closeEdit}>ปิด</button></form>
                </dialog>
            )}
        </section>
    );
}
