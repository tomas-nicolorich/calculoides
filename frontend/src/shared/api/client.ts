import { supabase } from "./supabase";
import type {
  Group,
  Category,
  Member,
  Summary,
  Invitation,
  SavingsGoal,
} from "./types";

const pendingRequests = new Map<
  string,
  { promise: Promise<unknown>; timestamp: number }
>();

export const apiClient = {
  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { signal, ...fetchOptions } = options;
    const cacheKey = `${fetchOptions.method ?? "GET"}:${endpoint}:${(fetchOptions.body as string | undefined) ?? ""}`;
    const now = Date.now();
    const pending = pendingRequests.get(cacheKey);

    let promise: Promise<unknown>;

    if (pending && now - pending.timestamp < 100) {
      promise = pending.promise;
    } else {
      promise = (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const token = session?.access_token;

          const res = await fetch(`/api${endpoint}`, {
            ...fetchOptions,
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...Object.fromEntries(
                new Headers(fetchOptions.headers).entries(),
              ),
            },
          });

          if (!res.ok) {
            const error = await (
              res.json() as Promise<{ error: string }>
            ).catch(() => ({ error: "Unknown error" }));
            throw new Error(error.error || "API request failed");
          }

          if (res.status === 204) return null;
          return await (res.json() as Promise<T>);
        } catch (err) {
          // Remove from pending immediately if it fails so subsequent retries don't get the error
          pendingRequests.delete(cacheKey);
          throw err;
        } finally {
          // Remove from pending after some time to allow deduplication of rapid successive calls
          // but not keep it forever.
          setTimeout(() => {
            pendingRequests.delete(cacheKey);
          }, 100);
        }
      })();
      pendingRequests.set(cacheKey, { promise, timestamp: now });
    }

    if (!signal) return promise as Promise<T>;

    return Promise.race([
      promise as Promise<T>,
      new Promise<T>((_, reject) => {
        if (signal.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        signal.addEventListener(
          "abort",
          () => {
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      }),
    ]);
  },

  /** Only for testing purposes */
  clearPendingRequests() {
    pendingRequests.clear();
  },

  groups: {
    list: () => {
      return apiClient.fetch<Group[]>("/groups");
    },
    create: (name: string) =>
      apiClient.fetch<Group>("/groups", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    getSummary: (groupId: string) =>
      apiClient.fetch<Summary>(`/summary?groupId=${groupId}`),
  },

  categories: {
    list: (groupId: string) =>
      apiClient.fetch<Category[]>(`/categories?groupId=${groupId}`),
    create: (
      groupId: string,
      data: {
        name: string;
        monthlyBudget: number;
        icon?: string;
        memberIds?: string[];
      },
    ) =>
      apiClient.fetch<Category>(`/categories?groupId=${groupId}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  expenses: {
    log: (data: {
      categoryId: string;
      description: string;
      amount: number;
      date?: string;
      payerId?: string;
    }) =>
      apiClient.fetch<undefined>("/expenses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiClient.fetch<undefined>(`/transactions/${id}`, {
        method: "DELETE",
      }),
  },

  invitations: {
    list: () => apiClient.fetch<Invitation[]>("/invitations"),
    create: (groupId: string, email: string) =>
      apiClient.fetch<Invitation>(`/invitations?groupId=${groupId}`, {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    respond: (token: string, action: "ACCEPT" | "REJECT") =>
      apiClient.fetch<undefined>("/respond-invitation", {
        method: "POST",
        body: JSON.stringify({ token, action }),
      }),
  },

  members: {
    list: (groupId: string) =>
      apiClient.fetch<Member[]>(`/members?groupId=${groupId}`),
    updateIncome: (memberId: string, income: number) =>
      apiClient.fetch<Member>(`/members?id=${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ income }),
      }),
    remove: (groupId: string, memberId: string) =>
      apiClient.fetch<undefined>(`/members?id=${memberId}&groupId=${groupId}`, {
        method: "DELETE",
      }),
  },

  savings: {
    list: (groupId: string) =>
      apiClient.fetch<SavingsGoal[]>(`/savings?groupId=${groupId}`),
    create: (
      groupId: string,
      data: {
        name: string;
        targetAmount: number;
        startingAmount?: number;
        targetDate: string;
      },
    ) =>
      apiClient.fetch<SavingsGoal>(`/savings?groupId=${groupId}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      goalId: string,
      data: {
        name: string;
        targetAmount: number;
        startingAmount?: number;
        targetDate: string;
      },
    ) =>
      apiClient.fetch<SavingsGoal>(`/savings?goalId=${goalId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    upsertContribution: (goalId: string, memberId: string, amount: number) =>
      apiClient.fetch<undefined>(
        `/savings/contribution?goalId=${goalId}&memberId=${memberId}`,
        {
          method: "POST",
          body: JSON.stringify({ amount }),
        },
      ),
    delete: (goalId: string) =>
      apiClient.fetch<undefined>(`/savings?goalId=${goalId}`, {
        method: "DELETE",
      }),
  },
};
