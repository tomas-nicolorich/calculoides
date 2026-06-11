import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { ProtectedRoute } from './providers/ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { DashboardPage } from '../pages/dashboard/ui/DashboardPage';
import { GroupsPage } from '../pages/groups/ui/GroupsPage';
import { ExpensesPage } from '../pages/expenses/ui/ExpensesPage';
import { ProfilePage } from '../pages/profile/ui/ProfilePage';
import { TransfersPage } from '../pages/transfers/ui/TransfersPage';
import { SavingsPage } from '../pages/savings/ui/SavingsPage';
import { Layout } from './ui/Layout';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="dashboard/:groupId" element={<DashboardPage />} />
                    <Route path="groups" element={<GroupsPage />} />
                    <Route path="expenses" element={<ExpensesPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="transfers" element={<TransfersPage />} />
                    <Route path="savings/:groupId" element={<SavingsPage />} />
                    <Route path="*" element={<Navigate to="/groups" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
