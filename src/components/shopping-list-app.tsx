"use client";

import { Check, Plus, RefreshCw, Share2, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShoppingItem, ShoppingListDetail, ShoppingListSummary } from "@/lib/shopping/types";

type ApiState = {
  lists: ShoppingListSummary[];
  active: ShoppingListDetail | null;
  error: string | null;
  loading: boolean;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
}

export function ShoppingListApp() {
  const [state, setState] = useState<ApiState>({
    lists: [],
    active: null,
    error: null,
    loading: true,
  });
  const [newListName, setNewListName] = useState("Market run");
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [shareEmail, setShareEmail] = useState("viewer@example.test");
  const [shareRole, setShareRole] = useState<"editor" | "viewer">("viewer");

  const canEditItems = state.active?.role === "admin" || state.active?.role === "editor";
  const canAdmin = state.active?.role === "admin";

  async function load(activeId?: string) {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const listResponse = await api<{ lists: ShoppingListSummary[] }>("/api/lists");
      const nextActiveId = activeId ?? listResponse.lists[0]?.id;
      const active = nextActiveId
        ? (await api<{ list: ShoppingListDetail }>(`/api/lists/${nextActiveId}`)).list
        : null;
      setState({ lists: listResponse.lists, active, loading: false, error: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load lists",
      }));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createList() {
    const response = await api<{ list: ShoppingListSummary }>("/api/lists", {
      method: "POST",
      body: JSON.stringify({ name: newListName }),
    });
    setNewListName("");
    await load(response.list.id);
  }

  async function addNewItem() {
    if (!state.active || !itemName.trim()) {
      return;
    }
    await api<{ item: ShoppingItem }>(`/api/lists/${state.active.id}/items`, {
      method: "POST",
      body: JSON.stringify({ name: itemName, quantity: itemQuantity || null }),
    });
    setItemName("");
    setItemQuantity("");
    await load(state.active.id);
  }

  async function toggleItem(item: ShoppingItem) {
    if (!state.active) {
      return;
    }
    await api<{ item: ShoppingItem }>(`/api/lists/${state.active.id}/items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ checked: !item.checked }),
    });
    await load(state.active.id);
  }

  async function removeItem(item: ShoppingItem) {
    if (!state.active) {
      return;
    }
    await api(`/api/lists/${state.active.id}/items/${item.id}`, { method: "DELETE" });
    await load(state.active.id);
  }

  async function share() {
    if (!state.active) {
      return;
    }
    await api(`/api/lists/${state.active.id}/members`, {
      method: "POST",
      body: JSON.stringify({ email: shareEmail, role: shareRole }),
    });
    await load(state.active.id);
  }

  const checkedCount = useMemo(
    () => state.active?.items.filter((item) => item.checked).length ?? 0,
    [state.active],
  );

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[300px_1fr]">
        <aside className="border-b border-slate-200 bg-white px-5 py-5 lg:border-b-0 lg:border-r">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-normal">Shopping List</h1>
              <p className="mt-1 text-sm text-slate-500">Secure shared groceries</p>
            </div>
            <Button variant="secondary" size="icon" onClick={() => load(state.active?.id)} aria-label="Refresh">
              <RefreshCw className="size-4" />
            </Button>
          </div>

          <div className="mb-6 flex gap-2">
            <Input
              value={newListName}
              onChange={(event) => setNewListName(event.target.value)}
              placeholder="New list"
            />
            <Button size="icon" onClick={createList} aria-label="Create list">
              <Plus className="size-4" />
            </Button>
          </div>

          <nav className="space-y-2" aria-label="Shopping lists">
            {state.lists.map((list) => (
              <button
                key={list.id}
                onClick={() => load(list.id)}
                className={`w-full rounded-md px-3 py-3 text-left transition ${
                  state.active?.id === list.id
                    ? "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200"
                    : "hover:bg-slate-50"
                }`}
              >
                <span className="block text-sm font-medium">{list.name}</span>
                <span className="mt-1 block text-xs capitalize text-slate-500">{list.role}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="px-5 py-6 sm:px-8 lg:px-10">
          {state.error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {state.error}
            </div>
          ) : null}

          {!state.active && !state.loading ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
              <ShieldCheck className="mb-4 size-12 text-emerald-700" />
              <h2 className="text-2xl font-semibold">Create your first shared list</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                The first creator becomes admin. Share roles are enforced by the server and the MCP endpoint.
              </p>
            </div>
          ) : null}

          {state.active ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
              <div>
                <header className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
                  <div>
                    <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
                      <ShieldCheck className="size-4" />
                      {state.active.role} access
                    </p>
                    <h2 className="text-3xl font-semibold tracking-normal">{state.active.name}</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {checkedCount} of {state.active.items.length} items checked
                    </p>
                  </div>
                </header>

                <div className="mb-5 grid gap-2 sm:grid-cols-[1fr_160px_auto]">
                  <Input
                    value={itemName}
                    disabled={!canEditItems}
                    onChange={(event) => setItemName(event.target.value)}
                    placeholder={canEditItems ? "Add item" : "Viewer role is read-only"}
                  />
                  <Input
                    value={itemQuantity}
                    disabled={!canEditItems}
                    onChange={(event) => setItemQuantity(event.target.value)}
                    placeholder="Qty"
                  />
                  <Button onClick={addNewItem} disabled={!canEditItems || !itemName.trim()}>
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>

                <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                  {state.active.items.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">
                      No items yet. Add the first thing you need.
                    </p>
                  ) : (
                    state.active.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                      >
                        <Button
                          variant={item.checked ? "default" : "secondary"}
                          size="icon"
                          disabled={!canEditItems}
                          onClick={() => toggleItem(item)}
                          aria-label={item.checked ? "Mark unchecked" : "Mark checked"}
                        >
                          <Check className="size-4" />
                        </Button>
                        <div>
                          <p className={item.checked ? "text-sm line-through text-slate-400" : "text-sm font-medium"}>
                            {item.name}
                          </p>
                          {item.quantity ? <p className="mt-1 text-xs text-slate-500">{item.quantity}</p> : null}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!canEditItems}
                          onClick={() => removeItem(item)}
                          aria-label="Delete item"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-md border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Share2 className="size-4 text-emerald-700" />
                    Share list
                  </h3>
                  <div className="space-y-3">
                    <Input
                      value={shareEmail}
                      disabled={!canAdmin}
                      onChange={(event) => setShareEmail(event.target.value)}
                      placeholder="teammate@example.com"
                    />
                    <select
                      value={shareRole}
                      disabled={!canAdmin}
                      onChange={(event) => setShareRole(event.target.value as "editor" | "viewer")}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <Button className="w-full" disabled={!canAdmin} onClick={share}>
                      Share
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold">Members</h3>
                  <div className="space-y-3">
                    {state.active.members.map((member) => (
                      <div key={member.userId} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{member.name}</p>
                          <p className="truncate text-xs text-slate-500">{member.email}</p>
                        </div>
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs capitalize text-slate-700">
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
