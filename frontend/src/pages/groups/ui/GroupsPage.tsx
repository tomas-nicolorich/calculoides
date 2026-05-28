import { Card } from "../../../shared/ui/Card";
import { Plus, Users, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { apiClient } from "../../../shared/api/client";
import { Group } from "../../../shared/api/types";

export function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchGroups = async () => {
      try {
        const data = await apiClient.groups.list();
        if (isMounted) setGroups(data);
      } catch (err: unknown) {
        console.error(
          "Failed to fetch groups",
          err instanceof Error ? err.message : String(err),
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void fetchGroups();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            My Groups
          </h1>
          <p className="text-slate-500">
            Select a group to view your dashboard
          </p>
        </div>

        <button
          onClick={() => {
            console.log("Group creation logic will be implemented in a future task.");
          }}

          className="flex items-center gap-2 px-4 py-2 bg-brand-income text-white rounded-xl hover:opacity-90 transition-opacity font-semibold"
        >
          <Plus size={18} />
          <span>New Group</span>
        </button>
      </header>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-balance"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <Link key={group.id} to={`/dashboard/${group.id}`}>
              <Card className="hover:border-brand-balance/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-balance/10 text-brand-balance rounded-2xl">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {group.name}
                      </h3>
                      <p className="text-sm text-slate-500 capitalize">
                        {group.role.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
                </div>
              </Card>
            </Link>
          ))}

          {groups.length === 0 && (
            <Card className="py-12 text-center">
              <p className="text-slate-500 mb-6">
                You are not part of any groups yet.
              </p>
              <button className="px-6 py-2 bg-brand-balance text-white rounded-xl font-semibold">
                Create your first group
              </button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
