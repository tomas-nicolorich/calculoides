import { Card } from '../../../shared/ui/Card';
import { User, Lock, Save } from 'lucide-react';
import { useState } from 'react';

export function ProfilePage() {
  const [name, setName] = useState('User Name');

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Profile</h1>
        <p className="text-slate-500">Manage your personal information and security</p>
      </header>

      <Card title="Personal Information">
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Display Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={name} 
                onChange={(e) => { setName(e.target.value); }}
                className="w-full pl-10 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-balance transition-all" 
              />
            </div>
          </div>
          <button 
            onClick={() => { console.log('Profile update logic will be implemented in a future task.'); }}
            className="flex items-center justify-center gap-2 w-full py-3 bg-brand-balance text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            <Save size={18} />
            <span>Update Profile</span>
          </button>
        </div>
      </Card>

      <Card title="Security">
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full pl-10 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-balance transition-all" 
              />
            </div>
          </div>
          <button 
            onClick={() => { console.log('Password change logic will be implemented in a future task.'); }}
            className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
          >
            <span>Change Password</span>
          </button>
        </div>
      </Card>
    </div>
  );
}
