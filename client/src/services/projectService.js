import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "./config";

export const projectService = {
    async userProjects() {
        try {
            const response = await apiClient.get(API_ENDPOINTS.projects.list);
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to load projects';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async getBoard(projectId) {
        try {
            const response = await apiClient.get(API_ENDPOINTS.projects.board(projectId));
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to load board';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async getProjectDetails(projectId) {
        try {
            const response = await apiClient.get(API_ENDPOINTS.projects.detail(projectId));
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to load board';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async updateTaskStatus(projectId, taskId, statusId) {
        try {
            const response = await apiClient.put(
                API_ENDPOINTS.tasks.update(projectId, taskId),
                {
                    status_id: statusId
                }
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to update task status';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async createProject(project) {
        try {
            const response = await apiClient.post(API_ENDPOINTS.projects.create, project);
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to create task';
                throw new Error(message);
            } else if (error.request) {
                throw new Error('No response from server. Please check if the backend is running.');
            }
            throw new Error('Network error: ' + error.message);
        }
    },

    async createTask(projectId, taskData) {
        try {
            const response = await apiClient.post(API_ENDPOINTS.tasks.create(projectId), taskData);
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to create task';
                throw new Error(message);
            } else if (error.request) {
                throw new Error('No response from server. Please check if the backend is running.');
            }
            throw new Error('Network error: ' + error.message);
        }
    },

    async getTask(projectId, taskId) {
        try {
            const response = await apiClient.get(API_ENDPOINTS.tasks.detail(projectId, taskId));
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to load task';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async getAllTasks(projectId, params) {
        try {
            const response = await apiClient.get(API_ENDPOINTS.tasks.list(projectId, params));
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to load tasks';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    getTaskActivities: async (projectId, taskId, limit = 30, offset = 0) => {
        try {
            const response = await apiClient.get(API_ENDPOINTS.tasks.activities(projectId, taskId, limit, offset));
            return response.data;
        } catch (error) {
            console.error('Error fetching task activities:', error);
            throw error;
        }
    },

    getTaskComments: async (projectId, taskId, limit = 30, offset = 0) => {
        try {
            const response = await apiClient.get(API_ENDPOINTS.tasks.comments(projectId, taskId, limit, offset));
            return response.data;
        } catch (error) {
            console.error('Error fetching comments:', error);
            throw error;
        }
    },

    getTaskChanges: async (projectId, taskId, fieldName = "", limit = 30, offset = 0) => {
        try {
            const response = await apiClient.get(API_ENDPOINTS.tasks.changes(projectId, taskId, fieldName, limit, offset));
            return response.data;
        } catch (error) {
            console.error('Error fetching changes:', error);
            throw error;
        }
    },

    // Получить свой профиль в проекте
    async getMyProfile(projectId) {
        try {
            const response = await apiClient.get(API_ENDPOINTS.projects.profile(projectId));
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to load profile';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    // Получить профиль участника проекта
    async getMemberProfile(projectId, userId) {
        try {
            const response = await apiClient.get(API_ENDPOINTS.projects.memberProfile(projectId, userId));
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to load member profile';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    // Получить активности участника проекта
    async getMemberActivities(projectId, userId, limit = 15, offset = 0) {
        try {
            const response = await apiClient.get(API_ENDPOINTS.projects.memberActivities(projectId, userId, limit, offset));
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to load activities';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    // Получить задачи пользователя в проекте
    async getUserTasks(projectId, userId, page = 1, len = 10) {
        try {
            const query = `page=${page}&len=${len}&assigneeId=${userId}`;
            const response = await apiClient.get(API_ENDPOINTS.tasks.list(projectId, query));
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to load tasks';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async getProjectTags(projectId) {
        try {
            const response = await apiClient.get(API_ENDPOINTS.tags.list(projectId));
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to load activities';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async getProjectMembers(projectId) {
        try {
            const response = await apiClient.get(API_ENDPOINTS.projects.members(projectId));
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to load members';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async getProjectStatuses(projectId) {
        try {
            const response = await apiClient.get(API_ENDPOINTS.projects.statuses(projectId));
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to load members';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async updateTask(projectId, taskId, data) {
        try {
            const response = await apiClient.put(API_ENDPOINTS.tasks.update(projectId, taskId), data);
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to update task';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async updateTaskAssignee(projectId, taskId, assigneeId) {
        try {
            const response = await apiClient.put(API_ENDPOINTS.tasks.update(projectId, taskId), {
                assignee_id: assigneeId
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to update assignee';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async createComment(projectId, taskId, content) {
        try {
            const response = await apiClient.post(API_ENDPOINTS.tasks.comments(projectId, taskId), {
                content
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to add comment';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async addTagToTask(projectId, taskId, tagId) {
        try {
            const response = await apiClient.post(API_ENDPOINTS.tasks.addTag(projectId, taskId, tagId));
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to add tag';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async removeTagFromTask(projectId, taskId, tagId) {
        try {
            const response = await apiClient.delete(API_ENDPOINTS.tasks.removeTag(projectId, taskId, tagId));
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to remove tag';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    }
};