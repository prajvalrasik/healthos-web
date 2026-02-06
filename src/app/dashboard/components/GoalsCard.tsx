"use client";
import { useEffect, useState } from "react";

interface HealthGoal {
  id: string;
  user_id: string;
  goal_type: string;
  marker_name?: string;
  target_value: number;
  unit: string;
  start_date: string;
  end_date?: string;
  status: string;
  streak: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  userId: string;
}

export default function GoalsCard({ userId }: Props) {
  const [goals, setGoals] = useState<HealthGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    goal_type: "steps",
    marker_name: "",
    target_value: 10000,
    unit: "steps",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: ""
  });
  const [snapshot, setSnapshot] = useState<any>(null);
  const [editingGoal, setEditingGoal] = useState<HealthGoal | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  // Fetch goals
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/health/goals?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setGoals(data.goals || []);
        setError(null);
      })
      .catch(() => setError("Failed to load goals"))
      .finally(() => setLoading(false));
  }, [userId]);

  // Fetch health snapshot for progress
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/health/snapshot?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setSnapshot(data.snapshot))
      .catch(() => setSnapshot(null));
  }, [userId]);

  // Auto-update completed goals
  useEffect(() => {
    if (!snapshot || goals.length === 0) return;
    goals.forEach(async (goal) => {
      const { progress, currentValue } = getGoalProgress(goal, snapshot);
      if (progress >= 1 && goal.status !== "completed") {
        // Mark as completed
        await fetch("/api/health/goals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: goal.id, status: "completed" })
        });
        setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, status: "completed" } : g));
      }
    });
  }, [snapshot, goals]);

  // Streak logic: check if daily goals are met and update streaks
  useEffect(() => {
    if (!snapshot || goals.length === 0) return;
    goals.forEach(async (goal) => {
      if (goal.status === "completed") return;
      const { progress } = getGoalProgress(goal, snapshot);
      // Only for daily goals (steps, calories)
      if (["steps", "calories"].includes(goal.goal_type)) {
        const today = new Date().toISOString().slice(0, 10);
        if (goal.updated_at.slice(0, 10) !== today && progress >= 1) {
          // Increment streak
          await fetch("/api/health/goals", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: goal.id, streak: goal.streak + 1, updated_at: new Date().toISOString() })
          });
          setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, streak: g.streak + 1, updated_at: new Date().toISOString() } : g));
        } else if (goal.updated_at.slice(0, 10) !== today && progress < 1) {
          // Reset streak if missed
          if (goal.streak !== 0) {
            await fetch("/api/health/goals", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: goal.id, streak: 0, updated_at: new Date().toISOString() })
            });
            setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, streak: 0, updated_at: new Date().toISOString() } : g));
          }
        }
      }
    });
  }, [snapshot, goals]);

  // Calculate progress for a goal
  function getGoalProgress(goal: HealthGoal, snapshot: any) {
    let currentValue = 0;
    if (goal.goal_type === "steps") {
      currentValue = snapshot?.fitness?.stepsToday || 0;
    } else if (goal.goal_type === "calories") {
      currentValue = snapshot?.fitness?.caloriesToday || 0;
    } else if (goal.goal_type === "lab_marker") {
      const marker = snapshot?.labHighlights?.find((m: any) => m.marker_name === goal.marker_name);
      currentValue = marker?.value || 0;
    }
    const progress = Math.min(currentValue / goal.target_value, 1);
    return { progress, currentValue };
  }

  // Create goal
  const createGoal = async () => {
    setLoading(true);
    setError(null);
    const payload = { ...form, user_id: userId };
    if (!payload.goal_type || !payload.target_value || !payload.unit || !payload.start_date) {
      setError("Please fill all required fields");
      setLoading(false);
      return;
    }
    const res = await fetch("/api/health/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      setGoals([data.goal, ...goals]);
      setShowForm(false);
      setForm({
        goal_type: "steps",
        marker_name: "",
        target_value: 10000,
        unit: "steps",
        start_date: new Date().toISOString().slice(0, 10),
        end_date: ""
      });
    } else {
      setError(data.error || "Failed to create goal");
    }
    setLoading(false);
  };

  // Delete goal
  const deleteGoal = async (id: string) => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/health/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      setGoals(goals.filter((g) => g.id !== id));
    } else {
      setError("Failed to delete goal");
    }
    setLoading(false);
  };

  // Edit goal
  const startEdit = (goal: HealthGoal) => {
    setEditingGoal(goal);
    setEditForm({
      goal_type: goal.goal_type,
      marker_name: goal.marker_name || "",
      target_value: goal.target_value,
      unit: goal.unit,
      start_date: goal.start_date,
      end_date: goal.end_date || ""
    });
  };

  const saveEdit = async () => {
    if (!editingGoal) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/health/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingGoal.id, ...editForm })
    });
    const data = await res.json();
    if (res.ok) {
      setGoals((prev) => prev.map((g) => g.id === editingGoal.id ? { ...g, ...editForm } : g));
      setEditingGoal(null);
      setEditForm(null);
    } else {
      setError(data.error || "Failed to update goal");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white/70 rounded-xl p-6 border border-white/50 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">My Health Goals</h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "Add Goal"}
        </button>
      </div>
      {showForm && (
        <div className="mb-4 bg-slate-50 p-4 rounded">
          <div className="flex gap-2 mb-2">
            <select
              className="border rounded px-2 py-1"
              value={form.goal_type}
              onChange={(e) => setForm((f) => ({ ...f, goal_type: e.target.value, unit: e.target.value === "steps" ? "steps" : e.target.value === "calories" ? "kcal" : "" }))}
            >
              <option value="steps">Steps</option>
              <option value="calories">Calories</option>
              <option value="lab_marker">Lab Marker</option>
            </select>
            {form.goal_type === "lab_marker" && (
              <input
                className="border rounded px-2 py-1"
                placeholder="Marker Name (e.g. Hemoglobin)"
                value={form.marker_name}
                onChange={(e) => setForm((f) => ({ ...f, marker_name: e.target.value }))}
              />
            )}
            <input
              className="border rounded px-2 py-1 w-24"
              type="number"
              placeholder="Target"
              value={form.target_value}
              onChange={(e) => setForm((f) => ({ ...f, target_value: Number(e.target.value) }))}
            />
            <input
              className="border rounded px-2 py-1 w-20"
              placeholder="Unit"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              disabled={form.goal_type !== "lab_marker"}
            />
            <input
              className="border rounded px-2 py-1"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
            <input
              className="border rounded px-2 py-1"
              type="date"
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            />
            <button
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              onClick={createGoal}
              disabled={loading}
            >
              Save
            </button>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>
      )}
      {editingGoal && (
        <div className="mb-4 bg-yellow-50 p-4 rounded border border-yellow-200">
          <div className="mb-2 font-semibold">Edit Goal</div>
          <div className="flex gap-2 mb-2">
            <select
              className="border rounded px-2 py-1"
              value={editForm.goal_type}
              onChange={(e) => setEditForm((f: any) => ({ ...f, goal_type: e.target.value }))}
              disabled
            >
              <option value="steps">Steps</option>
              <option value="calories">Calories</option>
              <option value="lab_marker">Lab Marker</option>
            </select>
            {editForm.goal_type === "lab_marker" && (
              <input
                className="border rounded px-2 py-1"
                placeholder="Marker Name"
                value={editForm.marker_name}
                onChange={(e) => setEditForm((f: any) => ({ ...f, marker_name: e.target.value }))}
              />
            )}
            <input
              className="border rounded px-2 py-1 w-24"
              type="number"
              placeholder="Target"
              value={editForm.target_value}
              onChange={(e) => setEditForm((f: any) => ({ ...f, target_value: Number(e.target.value) }))}
            />
            <input
              className="border rounded px-2 py-1 w-20"
              placeholder="Unit"
              value={editForm.unit}
              onChange={(e) => setEditForm((f: any) => ({ ...f, unit: e.target.value }))}
              disabled={editForm.goal_type !== "lab_marker"}
            />
            <input
              className="border rounded px-2 py-1"
              type="date"
              value={editForm.start_date}
              onChange={(e) => setEditForm((f: any) => ({ ...f, start_date: e.target.value }))}
            />
            <input
              className="border rounded px-2 py-1"
              type="date"
              value={editForm.end_date}
              onChange={(e) => setEditForm((f: any) => ({ ...f, end_date: e.target.value }))}
            />
            <button
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              onClick={saveEdit}
              disabled={loading}
            >
              Save
            </button>
            <button
              className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
              onClick={() => { setEditingGoal(null); setEditForm(null); }}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>
      )}
      {loading && <div>Loading...</div>}
      {!loading && goals.length === 0 && <div className="text-slate-500">No goals yet. Add one!</div>}
      <ul className="space-y-4">
        {goals.map((goal) => {
          const { progress, currentValue } = getGoalProgress(goal, snapshot);
          return (
            <li key={goal.id} className={`bg-slate-100 rounded p-4 flex items-center justify-between ${goal.status === "completed" ? "opacity-60" : ""}`}>
              <div className="w-full">
                <div className="font-semibold">
                  {goal.goal_type === "lab_marker"
                    ? `${goal.marker_name} (${goal.unit})`
                    : `${goal.goal_type.charAt(0).toUpperCase() + goal.goal_type.slice(1)} (${goal.unit})`}
                </div>
                <div className="text-slate-600 text-sm mb-1">
                  Target: <span className="font-medium">{goal.target_value}</span> | Status: <span className="font-medium capitalize">{goal.status}</span> | Streak: <span className="font-medium">{goal.streak}</span>
                </div>
                <div className="text-xs text-slate-500 mb-1">
                  {goal.start_date} {goal.end_date ? `→ ${goal.end_date}` : "(Ongoing)"}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-48 bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full ${progress >= 1 ? "bg-green-500" : "bg-blue-500"}`}
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-mono">
                    {currentValue} / {goal.target_value} {goal.unit} ({Math.round(progress * 100)}%)
                  </span>
                  {goal.status === "completed" && <span className="ml-2 text-green-600 font-bold">✓ Completed</span>}
                </div>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                <button
                  className="text-blue-600 hover:underline"
                  onClick={() => startEdit(goal)}
                  disabled={loading}
                >
                  Edit
                </button>
                <button
                  className="text-red-600 hover:underline"
                  onClick={() => deleteGoal(goal.id)}
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
} 