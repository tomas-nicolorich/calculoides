import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./providers/AuthProvider";
import { ActiveGroupProvider } from "./providers/ActiveGroupContext";
import { ProtectedRoute } from "./providers/ProtectedRoute";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";
import { CompleteProfilePage } from "../pages/CompleteProfilePage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { DashboardPage } from "../pages/dashboard/ui/DashboardPage";
import { GroupsPage } from "../pages/groups/ui/GroupsPage";
import { ExpensesPage } from "../pages/expenses/ui/ExpensesPage";
import { ProfilePage } from "../pages/profile/ui/ProfilePage";
import { TransfersPage } from "../pages/transfers/ui/TransfersPage";
import { SavingsPage } from "../pages/savings/ui/SavingsPage";
import { AppShell } from "./ui/AppShell";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ActiveGroupProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/complete-profile" element={<CompleteProfilePage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Routes>
                      <Route
                        path="dashboard/:groupId"
                        element={<DashboardPage />}
                      />
                      <Route path="groups" element={<GroupsPage />} />
                      <Route
                        path="expenses/:groupId"
                        element={<ExpensesPage />}
                      />
                      <Route path="profile" element={<ProfilePage />} />
                      <Route
                        path="transfers/:groupId"
                        element={<TransfersPage />}
                      />
                      <Route
                        path="savings/:groupId"
                        element={<SavingsPage />}
                      />
                      <Route
                        path="*"
                        element={<Navigate to="/groups" replace />}
                      />
                    </Routes>
                  </AppShell>
                </ProtectedRoute>
              }
            />
          </Routes>
        </ActiveGroupProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
