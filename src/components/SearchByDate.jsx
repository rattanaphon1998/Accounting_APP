import { useState } from "react";
import { Link } from "react-router";
import moment from "moment-timezone";
import { apiUrl, authHeaders } from "../auth";
export default function SearchByDate() {
  const [transactions, setTransactions] = useState([]);
  const [dateTime, setDateTime] = useState("");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fetchTransactions = async () => {
    console.log("วันที่ที่ส่งมา:", { date: dateTime });
    try {
      const response = await fetch(`${apiUrl}/api/transactionsbydate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ date: dateTime }),
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
        console.log("1", data);
      } else {
        setError("ไม่สามารถค้นหารายการได้");
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
      setError("ไม่สามารถค้นหารายการได้");
    }
  };
  function handleDateTimeChange(event) {
    setDateTime(event.target.value);
  }
  const startEdit = (transaction) => {
    setEditingTransaction(transaction);
    setDescription(transaction.description);
    setAmount(transaction.amount);
    setError("");
  };
  const closeEdit = () => {
    setEditingTransaction(null);
    setDescription("");
    setAmount("");
    setError("");
  };
  const saveEdit = async (event) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (
      !description.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount === 0
    ) {
      setError("กรุณากรอกรายละเอียดและจำนวนเงินที่ไม่เป็นศูนย์");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(
        `${apiUrl}/api/transactions/${editingTransaction.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            description: description.trim(),
            amount: parsedAmount,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "ไม่สามารถแก้ไขรายการได้");
      closeEdit();
      await fetchTransactions();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };
  const deleteTransaction = async (transaction) => {
    if (!window.confirm(`ลบรายการ “${transaction.description}” ใช่หรือไม่?`))
      return;
    setError("");
    try {
      const response = await fetch(
        `${apiUrl}/api/transactions/${transaction.id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "ไม่สามารถลบรายการได้");
      await fetchTransactions();
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="page-container topbar-inner">
          <Link className="brand" to="/">
            <span className="brand-mark">฿</span>
            <span>Expenses tracker</span>
          </Link>
          <Link className="nav-link" to="/">
            กลับหน้าหลัก
          </Link>
        </div>
      </header>
      <main className="page-container dashboard">
        <section className="search-card">
          <p className="eyebrow">History</p>
          <h1>ค้นหารายการตามวันที่</h1>
          <p>เลือกวันที่เพื่อดูรายการที่บันทึกไว้ทั้งหมด</p>
          <form
            className="search-controls"
            onSubmit={(event) => {
              event.preventDefault();
              fetchTransactions();
            }}
          >
            <input
              id="datetime"
              type="date"
              className="app-input date-input"
              value={dateTime}
              onChange={handleDateTimeChange}
              onClick={(event) => {
                event.currentTarget.showPicker?.();
              }}
              required
            />

            <button className="primary-button">ค้นหา</button>
          </form>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>รายละเอียด</th>
                  <th>จำนวนเงิน</th>
                  <th>
                    <span className="sr-only">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      {moment
                        .tz(t.created_at, "YYYY-MM-DD HH:mm:ss", "Asia/Bangkok")
                        .format("YYYY-MM-DD HH:mm:ss")}
                    </td>
                    <td>{t.description}</td>
                    <td
                      className={
                        Number(t.amount) >= 0
                          ? "amount-income"
                          : "amount-expense"
                      }
                    >
                      {Number(t.amount).toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="whitespace-nowrap">
                      <button
                        className="action-button"
                        onClick={() => startEdit(t)}
                      >
                        แก้ไข
                      </button>
                      <button
                        className="action-button delete-button"
                        onClick={() => deleteTransaction(t)}
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {transactions.length === 0 && dateTime && (
            <div className="empty-state">
              <strong>ไม่พบรายการ</strong>ลองเลือกวันอื่น
              หรือเพิ่มรายการใหม่จากหน้าหลัก
            </div>
          )}
          {error && <p className="text-error text-center mt-3">{error}</p>}
        </section>
      </main>
      {editingTransaction && (
        <dialog open className="modal">
          <div className="modal-box bg-[#1c2947] text-white border border-[#33456d] shadow-2xl">
            <h2 className="font-bold text-xl mb-4 text-white">แก้ไขรายการ</h2>

            <form onSubmit={saveEdit} className="space-y-3">
              <input
                className="input input-bordered w-full bg-[#263858] text-white border-[#4b638f] placeholder:text-gray-300 focus:border-blue-400"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="คำอธิบาย"
                autoFocus
              />

              <input
                className="input input-bordered w-full bg-[#263858] text-white border-[#4b638f] placeholder:text-gray-300 focus:border-blue-400"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="จำนวนเงิน"
                step="0.01"
              />

              {error && <p className="text-error text-sm">{error}</p>}

              <div className="modal-action">
                <button
                  type="button"
                  className="btn bg-[#344563] text-white border-none hover:bg-[#435a82]"
                  onClick={closeEdit}
                  disabled={isSaving}
                >
                  ยกเลิก
                </button>

                <button
                  className="btn bg-blue-600 text-white border-none hover:bg-blue-700"
                  disabled={isSaving}
                >
                  {isSaving ? "กำลังบันทึก…" : "บันทึก"}
                </button>
              </div>
            </form>
          </div>

          <form method="dialog" className="modal-backdrop">
            <button onClick={closeEdit}>ปิด</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
