import { type FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { PLATFORM_ROLES, useAuth } from "../context/AuthContext";
import { ExportButton } from "../components/ExportButton";

interface NoticeRow {
  id: string;
  title: string;
  content: string;
  audience: string | null;
  createdAt: string;
  postedById: string;
  postedBy: { name: string };
}

const AUDIENCES = ["ADMIN", "TEACHER", "STUDENT", "PARENT"] as const;

export function Notices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [form, setForm] = useState({ title: "", content: "", audience: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "", audience: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const canPost = !!user && (user.role === "ADMIN" || user.role === "TEACHER" || PLATFORM_ROLES.includes(user.role));
  const isAdminOrPlatform = !!user && (user.role === "ADMIN" || PLATFORM_ROLES.includes(user.role));
  const [audienceFilter, setAudienceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function load() {
    api.get("/notices").then((res) => setNotices(res.data));
  }

  useEffect(load, []);

  const filteredNotices = useMemo(
    () =>
      notices.filter((n) => {
        if (audienceFilter && n.audience !== audienceFilter) return false;
        const posted = n.createdAt.slice(0, 10);
        if (dateFrom && posted < dateFrom) return false;
        if (dateTo && posted > dateTo) return false;
        return true;
      }),
    [notices, audienceFilter, dateFrom, dateTo]
  );

  const exportRows = useMemo(
    () =>
      filteredNotices.map((n) => ({
        Title: n.title,
        Content: n.content,
        Audience: n.audience ? `${n.audience}s only` : "Everyone",
        "Posted By": n.postedBy.name,
        Date: new Date(n.createdAt).toLocaleDateString(),
      })),
    [filteredNotices]
  );

  function canEdit(n: NoticeRow) {
    return isAdminOrPlatform || n.postedById === user?.id;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post("/notices", {
      title: form.title,
      content: form.content,
      audience: form.audience || null,
    });
    setForm({ title: "", content: "", audience: "" });
    load();
  }

  function startEdit(n: NoticeRow) {
    setEditingId(n.id);
    setEditForm({ title: n.title, content: n.content, audience: n.audience ?? "" });
  }

  async function saveEdit(id: string) {
    await api.patch(`/notices/${id}`, {
      title: editForm.title,
      content: editForm.content,
      audience: editForm.audience || null,
    });
    setEditingId(null);
    load();
  }

  async function deleteNotice(id: string) {
    await api.delete(`/notices/${id}`);
    setConfirmDeleteId(null);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Notices</h1>
        <ExportButton filename="notices" rows={exportRows} />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <select value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Audiences</option>
          {AUDIENCES.map((a) => <option key={a} value={a}>{a}s only</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm" title="From date" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm" title="To date" />
      </div>

      {canPost && (
        <form onSubmit={handleSubmit} className="mb-6 grid gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <input required placeholder="Title" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <textarea required placeholder="Content" value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={3}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={form.audience}
            onChange={(e) => setForm({ ...form, audience: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Everyone</option>
            {AUDIENCES.map((a) => <option key={a} value={a}>{a}s only</option>)}
          </select>
          <button className="rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Post Notice
          </button>
        </form>
      )}

      <div className="space-y-3">
        {filteredNotices.map((n) => (
          <div key={n.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {editingId === n.id ? (
              <div className="grid gap-2">
                <input value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <textarea value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  rows={3}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <select value={editForm.audience}
                  onChange={(e) => setEditForm({ ...editForm, audience: e.target.value })}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Everyone</option>
                  {AUDIENCES.map((a) => <option key={a} value={a}>{a}s only</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(n.id)} className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800">{n.title}</h2>
                  <span className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-slate-600">{n.content}</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Posted by {n.postedBy.name}{n.audience ? ` · ${n.audience}s only` : ""}
                  </p>
                  {canEdit(n) && (
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => startEdit(n)} className="text-indigo-600 hover:underline">Edit</button>
                      {confirmDeleteId === n.id ? (
                        <>
                          <button onClick={() => deleteNotice(n.id)} className="text-red-600 hover:underline">Confirm?</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400 hover:underline">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(n.id)} className="text-red-500 hover:underline">Delete</button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        {filteredNotices.length === 0 && <p className="text-sm text-slate-400">No notices found.</p>}
      </div>
    </div>
  );
}
