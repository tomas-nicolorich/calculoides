import { useEffect, useState } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { DashboardSummary } from '../widgets/dashboard/DashboardSummary';
import { CreateGroupForm } from '../features/groups/CreateGroupForm';
import { MemberList } from '../features/members/MemberList';
import { SetIncomeForm } from '../features/members/SetIncomeForm';
import { InvitationList } from '../features/members/InvitationList';
import { CategoryList } from '../features/budget/CategoryList';
import { CategoryForm } from '../features/budget/CategoryForm';
import { ExpenseForm } from '../features/budget/ExpenseForm';
import { SavingsGoalList } from '../features/savings/SavingsGoalList';
import { SavingsGoalForm } from '../features/savings/SavingsGoalForm';
import { TransferForm } from '../features/transfers/TransferForm';
import { AdminPanel } from '../features/admin/AdminPanel';
import { InviteMemberForm } from '../features/members/InviteMemberForm';
import { apiClient } from '../shared/api/client';
import { Button, cn } from '../shared/ui';

type Tab = 'overview' | 'budget' | 'savings' | 'members' | 'admin';

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [myCurrentIncome, setMyCurrentIncome] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const data = await apiClient.groups.list();
      setGroups(data);
      if (data.length > 0) {
        if (!selectedGroupId) {
          setSelectedGroupId(data[0].id);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch groups', err);
      setLoading(false);
    }
  };

  const fetchCategories = async (groupId: string) => {
    try {
      const data = await apiClient.categories.list(groupId);
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  const fetchSavings = async (groupId: string) => {
    try {
      const data = await apiClient.savings.list(groupId);
      setSavingsGoals(data);
    } catch (err) {
      console.error('Failed to fetch savings', err);
    }
  };

  const fetchSummary = async (groupId: string) => {
    setLoading(true);
    try {
      const data = await apiClient.groups.getSummary(groupId);
      setSummary(data);
      
      const group = await apiClient.fetch(`/groups?id=${groupId}`);
      const myMembership = group.members.find((m: any) => m.userId === user?.id);
      if (myMembership) {
        setMyMemberId(myMembership.id);
        setMyCurrentIncome(myMembership.income);
      }
      setIsOwner(group.ownerId === user?.id);

      await fetchCategories(groupId);
      await fetchSavings(groupId);
    } catch (err) {
      console.error('Failed to fetch summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchSummary(selectedGroupId);
    }
  }, [selectedGroupId]);

  const refreshData = () => {
    if (selectedGroupId) fetchSummary(selectedGroupId);
  };

  const renderTabContent = () => {
    if (!selectedGroupId || !summary) return null;

    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <DashboardSummary 
              groupName={summary.groupName}
              totalIncome={summary.totalIncome}
              totalBudget={summary.totalBudget}
              totalSpent={summary.totalSpent}
              members={summary.members}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ExpenseForm categories={categories} onSuccess={refreshData} />
              {myMemberId && (
                <SetIncomeForm 
                  memberId={myMemberId} 
                  currentIncome={myCurrentIncome}
                  onUpdated={refreshData}
                />
              )}
            </div>
          </div>
        );
      case 'budget':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <CategoryList 
              categories={categories.map(c => ({
                ...c,
                spent: 0 // In real app, this should be fetched or calculated
              }))} 
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <CategoryForm groupId={selectedGroupId} onSuccess={refreshData} />
              {categories.length > 0 && (
                <TransferForm 
                  categoryId={categories[0].id}
                  categoryName={categories[0].name}
                  members={summary.members}
                  currentMemberId={user!.id}
                  isOwner={isOwner}
                  onSuccess={refreshData}
                />
              )}
            </div>
          </div>
        );
      case 'savings':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <SavingsGoalList 
              goals={savingsGoals}
              memberShares={summary.members.map((m: any) => ({
                id: m.id,
                name: m.name,
                share: m.share / 100
              }))}
            />
            <SavingsGoalForm groupId={selectedGroupId} onSuccess={refreshData} />
          </div>
        );
      case 'members':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Group Members</h2>
                <MemberList 
                  groupId={selectedGroupId} 
                  isOwner={isOwner}
                  currentUserId={user!.id}
                  onEditIncome={(member) => setEditingMember(member)}
                />
              </div>
              <div className="space-y-8">
                {(editingMember || myMemberId) && (
                  <SetIncomeForm 
                    memberId={editingMember?.id || myMemberId!} 
                    memberName={editingMember?.user?.name || editingMember?.user?.email}
                    currentIncome={editingMember?.income || myCurrentIncome}
                    onUpdated={() => {
                      setEditingMember(null);
                      refreshData();
                    }}
                    onCancel={editingMember ? () => setEditingMember(null) : undefined}
                  />
                )}
                <InviteMemberForm groupId={selectedGroupId} onInvited={refreshData} />
              </div>
            </div>
          </div>
        );
      case 'admin':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {isOwner ? (
              <AdminPanel 
                groupId={selectedGroupId}
                members={summary.members}
                currentOwnerId={user!.id}
                onSuccess={refreshData}
              />
            ) : (
              <div className="bg-white p-12 rounded-lg shadow text-center">
                <p className="text-gray-500">You must be the group owner to access admin settings.</p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {loading && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-primary">Calculoides</h1>
            {groups.length > 0 && (
              <select 
                value={selectedGroupId || ''} 
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="p-2 border rounded bg-gray-50 text-sm focus:ring-2 focus:ring-primary outline-none"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-4 items-center">
            <span className="text-sm text-gray-500 hidden sm:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </div>
        
        {selectedGroupId && (
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
            {(['overview', 'budget', 'savings', 'members', 'admin'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab 
                    ? "border-primary text-primary" 
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <InvitationList onAction={fetchGroups} />
        {!selectedGroupId ? (
          <div className="h-full flex items-center justify-center">
            <div className="bg-white p-12 rounded-lg shadow-xl text-center max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Welcome to Calculoides</h2>
              <p className="text-gray-500 mb-8">Create your first group to start managing your shared household budget.</p>
              <CreateGroupForm onCreated={fetchGroups} />
            </div>
          </div>
        ) : (
          renderTabContent()
        )}
      </main>
      
      <footer className="bg-white border-t py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-xs">
          © 2026 Calculoides Core App. Proportional Sharing Automated.
        </div>
      </footer>
    </div>
  );
}
