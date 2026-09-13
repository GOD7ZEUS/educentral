import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { extractErrorMessage } from "../api/errors";

interface ClassRow {
  id: string;
  name: string;
}

interface StructureRow {
  id: string;
  term: string;
  amount: number;
  dueDate: string;
  class: { name: string };
}

interface StudentRow {
  id: string;
  admissionNo: string;
  user: { name: string };
}

interface PaymentRow {
  id: string;
  amountPaid: number;
  status: string;
  paymentDate: string;
  student: { user: { name: string }; admissionNo: string };
  feeStructure: { term: string; class: { name: string } };
}

export function Fees() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [structures, setStructures] = useState<StructureRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [structureError, setStructureError] = useState<string | null>(null);

  const [structureForm, setStructureForm] = useState({ classId: "", term: "", amount: "", dueDate: "" });
  const [paymentForm, setPaymentForm] = useState({ studentId: "", feeStructureId: "", amountPaid: "", method: "" });

  const [editingStructureId, setEditingStructureId] = useState<string | null>(null);
  const [structureEditForm, setStructureEditForm] = useState({ term: "", amount: "", dueDate: "" });
  const [confirmDeleteStructureId, setConfirmDeleteStructureId] = useState<string | null>(null);

  function loadPayments() {
    api.get("/fees/payments").then((res) => setPayments(res.data));
  }
  function loadStructures() {
    api.get("/fees/structures").then((res) => setStructures(res.data));
  }

  useEffect(() => {
    api.get("/classes").then((res) => setClasses(res.data));
    api.get("/students").then((res) => setStudents(res.data));
    loadStructures();
    loadPayments();
  }, []);

  async function addStructure(e: FormEvent) {
    e.preventDefault();
    await api.post("/fees/structures", {
      classId: structureForm.classId,
      term: structureForm.term,
      amount: Number(structureForm.amount),
      dueDate: new Date(structureForm.dueDate).toISOString(),
    });
    setStructureForm({ classId: "", term: "", amount: "", dueDate: "" });
    loadStructures();
  }

  function startEditStructure(s: StructureRow) {
    setEditingStructureId(s.id);
    setStructureEditForm({ term: s.term, amount: String(s.amount), dueDate: s.dueDate.slice(0, 10) });
    setStructureError(null);
  }

  async function saveStructureEdit(id: string) {
    setStructureError(null);
    try {
      await api.patch(`/fees/structures/${id}`, {
        term: structureEditForm.term,
        amount: Number(structureEditForm.amount),
        dueDate: new Date(structureEditForm.dueDate).toISOString(),
      });
      setEditingStructureId(null);
      loadStructures();
    } catch (err: any) {
      setStructureError(extractErrorMessage(err, "Could not save changes"));
    }
  }

  async function deleteStructure(id: string) {
    setStructureError(null);
    try {
      await api.delete(`/fees/structures/${id}`);
      setConfirmDeleteStructureId(null);
      loadStructures();
    } catch (err: any) {
      setStructureError(extractErrorMessage(err, "Could not delete fee structure"));
      setConfirmDeleteStructureId(null);
    }
  }

  async function recordPayment(e: FormEvent) {
    e.preventDefault();
    await api.post("/fees/payments", {
      studentId: paymentForm.studentId,
      feeStructureId: paymentForm.feeStructureId,
      amountPaid: Number(paymentForm.amountPaid),
      method: paymentForm.method || undefined,
    });
    setPaymentForm({ studentId: "", feeStructureId: "", amountPaid: "", method: "" });
    loadPayments();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Fees</h1>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-700">Fee Structures</h2>
          <form onSubmit={addStructure} className="mb-4 grid grid-cols-2 gap-2">
            <select required value={structureForm.classId}
              onChange={(e) => setStructureForm({ ...structureForm, classId: e.target.value })}
              className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Select class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input required placeholder="Term (e.g. Term 1)" value={structureForm.term}
              onChange={(e) => setStructureForm({ ...structureForm, term: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            <input required type="number" placeholder="Amount" value={structureForm.amount}
              onChange={(e) => setStructureForm({ ...structureForm, amount: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            <input required type="date" value={structureForm.dueDate}
              onChange={(e) => setStructureForm({ ...structureForm, dueDate: e.target.value })}
              className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            <button className="col-span-2 rounded-md bg-indigo-600 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
              Add Fee Structure
            </button>
          </form>
          {structureError && <p className="mb-2 text-sm text-red-600">{structureError}</p>}
          <ul className="space-y-1 text-sm text-slate-600">
            {structures.map((s) => (
              <li key={s.id} className="border-t border-slate-100 py-1">
                {editingStructureId === s.id ? (
                  <div className="grid grid-cols-3 gap-1 py-1">
                    <input value={structureEditForm.term}
                      onChange={(e) => setStructureEditForm({ ...structureEditForm, term: e.target.value })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs" />
                    <input type="number" value={structureEditForm.amount}
                      onChange={(e) => setStructureEditForm({ ...structureEditForm, amount: e.target.value })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs" />
                    <input type="date" value={structureEditForm.dueDate}
                      onChange={(e) => setStructureEditForm({ ...structureEditForm, dueDate: e.target.value })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs" />
                    <div className="col-span-3 flex gap-2">
                      <button onClick={() => saveStructureEdit(s.id)} className="text-xs text-indigo-600 hover:underline">Save</button>
                      <button onClick={() => setEditingStructureId(null)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span>{s.class.name} — {s.term}</span>
                    <div className="flex items-center gap-2">
                      <span>₹{s.amount.toLocaleString()} due {new Date(s.dueDate).toLocaleDateString()}</span>
                      <button onClick={() => startEditStructure(s)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                      {confirmDeleteStructureId === s.id ? (
                        <>
                          <button onClick={() => deleteStructure(s.id)} className="text-xs text-red-600 hover:underline">Confirm?</button>
                          <button onClick={() => setConfirmDeleteStructureId(null)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteStructureId(s.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-700">Record Payment</h2>
          <form onSubmit={recordPayment} className="grid grid-cols-2 gap-2">
            <select required value={paymentForm.studentId}
              onChange={(e) => setPaymentForm({ ...paymentForm, studentId: e.target.value })}
              className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Select student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.admissionNo} — {s.user.name}</option>)}
            </select>
            <select required value={paymentForm.feeStructureId}
              onChange={(e) => setPaymentForm({ ...paymentForm, feeStructureId: e.target.value })}
              className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Select fee structure</option>
              {structures.map((s) => <option key={s.id} value={s.id}>{s.class.name} — {s.term} (₹{s.amount})</option>)}
            </select>
            <input required type="number" placeholder="Amount paid" value={paymentForm.amountPaid}
              onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            <input placeholder="Method (cash/UPI/etc.)" value={paymentForm.method}
              onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            <button className="col-span-2 rounded-md bg-indigo-600 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
              Record Payment
            </button>
          </form>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Fee</th>
              <th className="px-4 py-2">Amount Paid</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2">{p.student.admissionNo} — {p.student.user.name}</td>
                <td className="px-4 py-2">{p.feeStructure.class.name} — {p.feeStructure.term}</td>
                <td className="px-4 py-2">₹{p.amountPaid.toLocaleString()}</td>
                <td className="px-4 py-2">{p.status}</td>
                <td className="px-4 py-2">{new Date(p.paymentDate).toLocaleDateString()}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No payments recorded yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
