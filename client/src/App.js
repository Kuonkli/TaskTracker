import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, Outlet, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import BoardView from './components/BoardView';
import ListView from './components/ListView';
import SummaryView from './components/SummaryView';
import TaskPage from './components/TaskPage';
import ProfilePage from './components/ProfilePage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import CreateProjectPage from './components/CreateProjectPage';
import { mockUsers, mockTasks, mockActivityEvents } from './mocks';
import { authService } from './services/authService';
import './App.css';
import Preloader from "./components/CommonComponents";
import { projectService } from "./services/projectService";
import {ToastProvider} from "./contexts/ToastContext";
import {ToastInitializer} from "./components/Toast/ToastInitializer";
import ProjectSettingsPage from "./components/ProjectSettingsPage";

function App() {
    const [isActivityOpen, setIsActivityOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userProjects, setUserProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [projectsLoaded, setProjectsLoaded] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const loadUserProjects = useCallback(async () => {
        try {
            const projects = await projectService.userProjects();
            setUserProjects(projects);
            setProjectsLoaded(true);
            return projects;
        } catch (error) {
            setProjectsLoaded(true);
            return [];
        }
    }, []);

    const checkAuth = async () => {
        setIsLoading(true);
        setProjectsLoaded(false);

        try {
            const user = await authService.getProfile();
            if (user) {
                setCurrentUser(user);
                setIsAuthenticated(true);
                await loadUserProjects();
            } else {
                setIsAuthenticated(false);
                setCurrentUser(null);
                setProjectsLoaded(true);
            }
        } catch (error) {
            setIsAuthenticated(false);
            setCurrentUser(null);
            setProjectsLoaded(true);
        } finally {
            setIsLoading(false);
            setAuthChecked(true);
        }
    };

    const handleLogin = async (user) => {
        setCurrentUser(user);
        setIsAuthenticated(true);
        setIsLoading(true);
        await loadUserProjects(user.id);
        setIsLoading(false);
    };

    const handleLogout = async () => {
        await authService.logout();
        setCurrentUser(null);
        setIsAuthenticated(false);
        setUserProjects([]);
        setProjectsLoaded(false);
    };

    const handleProjectCreated = async (newProject) => {
        try {
            const fullProject = await projectService.getProjectDetails(newProject.id);

            setUserProjects(prev => {
                const updated = [...prev, fullProject];
                setProjectsLoaded(true);
                return updated;
            });
        } catch (error) {
            setUserProjects(prev => {
                const updated = [...prev, newProject];
                setProjectsLoaded(true);
                return updated;
            });
        }
    };

    const getStartRoute = () => {
        if (!isAuthenticated) return '/login';
        if (userProjects.length === 0) return '/projects/new';

        const projectsWithLastSeen = userProjects.map(project => {
            // Ищем запись текущего пользователя в members
            const userMember = project.members?.find(m => m.user_id === currentUser?.id);
            const lastSeen = userMember?.last_seen_at || project.created_at;

            return { project, lastSeen };
        });

        projectsWithLastSeen.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));

        const lastProject = projectsWithLastSeen[0].project;
        return `/projects/${lastProject.id}/board`;
    };

    if (isLoading || !authChecked || (isAuthenticated && !projectsLoaded)) {
        return (
            <div className="app-loading-container">
                <div className={"spinner-container"}>
                    <Preloader/>
                </div>
            </div>
        );
    }

    return (
        <ToastProvider>
            <ToastInitializer />
            <Router>
                <Routes>
                    <Route
                        path="/login"
                        element={
                            !isAuthenticated ? (
                                <LoginPage onLogin={handleLogin} />
                            ) : (
                                <Navigate to={getStartRoute()} replace />
                            )
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            !isAuthenticated ? (
                                <RegisterPage onRegister={handleLogin} />
                            ) : (
                                <Navigate to={getStartRoute()} replace />
                            )
                        }
                    />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <Navigate to={getStartRoute()} replace />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/projects/new"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <CreateProjectPage
                                    user={currentUser}
                                    onProjectCreated={handleProjectCreated}
                                />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/projects/:projectId"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <ProjectLayout
                                    user={currentUser}
                                    onLogout={handleLogout}
                                    isActivityOpen={isActivityOpen}
                                    setIsActivityOpen={setIsActivityOpen}
                                    activityEvents={mockActivityEvents}
                                    projects={userProjects}
                                />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="board" replace />} />
                        <Route path="board" element={<BoardView />} />
                        <Route path="list" element={<ListView />} />
                        <Route path="summary" element={<SummaryView tasks={mockTasks} users={mockUsers} />} />
                        <Route path="task/:taskId" element={<TaskPage currentUser={currentUser}/>} />
                        <Route path="profile" element={<ProfilePage />} />
                        <Route path="member/:userId" element={<ProfilePage />} />
                        <Route path="settings" element={<ProjectSettingsPage user={currentUser} />} />
                    </Route>
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </Router>
        </ToastProvider>
    );
}

function ProtectedRoute({ isAuthenticated, children }) {
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

function ProjectLayout({ user, onLogout, isActivityOpen, setIsActivityOpen, activityEvents, projects }) {
    const { projectId } = useParams();
    const navigate = useNavigate();

    const currentProject = projects.find(p => p.id === projectId);

    useEffect(() => {
        if (!currentProject && projects.length > 0) {
            navigate(`/projects/${projects[0].id}/board`, { replace: true });
        } else if (!currentProject && projects.length === 0) {
            navigate('/projects/new', { replace: true });
        }
    }, [currentProject, projects, navigate]);

    if (!currentProject) {
        return (
            <div className="app-loading-container">
                <div className={"spinner-container"}>
                    <Preloader/>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <Header
                project={currentProject}
                user={user}
                onActivityToggle={() => setIsActivityOpen(!isActivityOpen)}
                onLogout={onLogout}
                projects={projects}
            />
            <div className="main-layout">
                <Sidebar
                    user={user}
                    teamMembers={currentProject?.members || []}
                />
                <main className="content-area">
                    <Outlet context={{
                        onLogout,
                        currentUser: user,
                        members: currentProject?.members,
                        project: currentProject
                    }} />
                </main>
                <RightSidebar
                    events={activityEvents}
                    isOpen={isActivityOpen}
                    onClose={() => setIsActivityOpen(false)}
                />
            </div>
        </div>
    );
}

function NotFoundPage() {
    return (
        <div className="not-found-page">
            <h1>404</h1>
            <p>Page not found</p>
        </div>
    );
}

export default App;