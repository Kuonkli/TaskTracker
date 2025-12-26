import React, { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import Sidebar from '../components/Layout/SideBar';
import ProjectCard from '../components/Projects/ProjectCard';
import ProjectForm from '../components/Projects/ProjectForm';
import ProjectDetail from '../components/Projects/ProjectDetail';
import Loader from '../components/Common/Loader';
import ErrorAlert from '../components/Common/ErrorAlert';
import api from '../services/api';
import '../styles/projects.css';

const ProjectsPage = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [editingProject, setEditingProject] = useState(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/projects');

            // ЗАЩИТА ОТ NULL - ДОБАВЬТЕ ЭТУ СТРОЧКУ
            const projectsData = response?.data ? response.data : [];

            setProjects(projectsData);
            setError('');
        } catch (error) {
            setError('Failed to fetch projects');
            console.error('Error fetching projects:', error);
            setProjects([]); // Устанавливаем пустой массив при ошибке
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (projectData) => {
        try {
            const response = await api.post('/api/projects', projectData);
            setProjects([response.data, ...projects]);
            setShowForm(false);
            setError('');
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create project');
        }
    };

    const handleUpdateProject = async (id, projectData) => {
        try {
            const response = await api.put(`/api/projects/${id}`, projectData);
            setProjects(projects.map(project =>
                project.id === id ? response.data : project
            ));
            setEditingProject(null);
            setShowForm(false);
            setError('');
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update project');
        }
    };

    const handleDeleteProject = async (id) => {
        if (!window.confirm('Are you sure you want to delete this project? All tasks in this project will remain but will lose project assignment.')) {
            return;
        }

        try {
            await api.delete(`/api/projects/${id}`);
            setProjects(projects.filter(project => project.id !== id));
            setError('');
        } catch (error) {
            setError('Failed to delete project');
        }
    };

    const handleViewProject = (project) => {
        setSelectedProject(project);
        setShowDetail(true);
    };

    const handleSave = (projectData) => {
        if (editingProject) {
            handleUpdateProject(editingProject.id, projectData);
        } else {
            handleCreateProject(projectData);
        }
    };

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="app-container">
            <Header />
            <Sidebar />
            <main className="main-content">
                <h1 className="page-title">Projects</h1>
                <p className="page-subtitle">Organize your tasks into projects</p>

                {error && <ErrorAlert message={error} />}

                <div className="tasks-header" style={{ marginBottom: '20px' }}>
                    <h3>Your Projects ({projects.length || 0})</h3>
                    <div className="tasks-actions">
                        <button
                            onClick={() => setShowForm(true)}
                            className="btn btn-primary"
                        >
                            + New Project
                        </button>
                    </div>
                </div>

                {/* ДОБАВЬТЕ ПРОВЕРКУ НА NULL ЗДЕСЬ */}
                {!projects || projects.length === 0 ? (
                    <div className="no-projects">
                        <div className="no-projects-icon">📁</div>
                        <h3 className="no-projects-title">No projects yet</h3>
                        <p className="no-projects-description">
                            Projects help you organize your tasks. Create your first project to start grouping related tasks together.
                        </p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="btn btn-primary"
                        >
                            Create First Project
                        </button>
                    </div>
                ) : (
                    <div className="projects-grid">
                        {(projects || []).map(project => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onView={handleViewProject}
                                onEdit={(project) => {
                                    setEditingProject(project);
                                    setShowForm(true);
                                }}
                                onDelete={handleDeleteProject}
                            />
                        ))}
                    </div>
                )}

                {/* Project Form Modal */}
                {showForm && (
                    <ProjectForm
                        project={editingProject}
                        onSave={handleSave}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingProject(null);
                        }}
                    />
                )}

                {/* Project Detail Modal */}
                {showDetail && selectedProject && (
                    <ProjectDetail
                        project={selectedProject}
                        onClose={() => {
                            setShowDetail(false);
                            setSelectedProject(null);
                        }}
                        onEdit={(project) => {
                            setEditingProject(project);
                            setShowDetail(false);
                            setShowForm(true);
                        }}
                        onDelete={handleDeleteProject}
                    />
                )}
            </main>
        </div>
    );
};

export default ProjectsPage;