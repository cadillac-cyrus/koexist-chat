import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { PusherProvider } from './context/PusherContext';
import Login from './components/Login';
import SignUp from './components/SignUp';
import ChatList from './components/ChatList';
import ChatDetail from './components/ChatDetail';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import PrivateRoute from './components/PrivateRoute';
import Profile from './components/Profile';
import GroupList from './components/GroupList';
import Settings from './components/Settings';

function AppLayout({ children }) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Sidebar - Hidden on mobile */}
        <div className="hidden md:block w-80 border-r border-white/10">
          <div className="h-full flex flex-col">
            <Sidebar />
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto pb-16 md:pb-0">
            {children}
          </div>
        </div>

        {/* Mobile Navigation */}
        <MobileNav />
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <SocketProvider>
            <PusherProvider>
              <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route
                    path="/"
                    element={
                      <PrivateRoute>
                        <AppLayout>
                          <ChatList />
                        </AppLayout>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/chats"
                    element={
                      <PrivateRoute>
                        <AppLayout>
                          <ChatList />
                        </AppLayout>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/chat/:chatId"
                    element={
                      <PrivateRoute>
                        <AppLayout>
                          <ChatDetail />
                        </AppLayout>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <PrivateRoute>
                        <AppLayout>
                          <Profile />
                        </AppLayout>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/profile/:userId"
                    element={
                      <PrivateRoute>
                        <AppLayout>
                          <Profile userId={useParams().userId} />
                        </AppLayout>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/groups"
                    element={
                      <PrivateRoute>
                        <AppLayout>
                          <GroupList />
                        </AppLayout>
                      </PrivateRoute>
                    }
                  />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </div>
            </PusherProvider>
          </SocketProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
