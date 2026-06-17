import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "./config";

export const projectService = {
    async getProjectSummary(projectId, period = '30d') {
        try {
            const response = await apiClient.get(
                API_ENDPOINTS.projects.summary(projectId, period)
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to load summary';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async searchUsers(query) {
        try {
            const response = await apiClient.get(API_ENDPOINTS.search.users(query));
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to load users';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

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

    async getProjectActivities(projectId, limit = 20, offset = 0) {
        try {
            const response = await apiClient.get(API_ENDPOINTS.projects.projectActivity(projectId, limit, offset));
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to load activities';
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
            const response = await apiClient.get(API_ENDPOINTS.members.profile(projectId, userId));
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
            const response = await apiClient.get(API_ENDPOINTS.members.activities(projectId, userId, limit, offset));
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
            const query = `page=${page}&len=${len}&assigneeId=${userId}&closedAt=null`;
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

    // ==================== STATUSES ====================
    async createStatus(projectId, status) {
        try {
            const response = await apiClient.post(
                API_ENDPOINTS.statuses.create(projectId),
                status
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to create status';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async updateStatus(projectId, statusId, data) {
        try {
            const response = await apiClient.put(
                API_ENDPOINTS.statuses.update(projectId, statusId),
                data
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to update status';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async deleteStatus(projectId, statusId) {
        try {
            await apiClient.delete(
                API_ENDPOINTS.statuses.delete(projectId, statusId)
            );
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to delete status';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    // ==================== TAGS ====================
    async createTag (projectId, tag) {
        try {
            const response = await apiClient.post(
                API_ENDPOINTS.tags.create(projectId),
                tag
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to create tag';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async deleteTag(projectId, tagId) {
        try {
            await apiClient.delete(API_ENDPOINTS.tags.delete(projectId, tagId));
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to delete tag';
            }
            throw new Error('Network error');
        }
    },

    // ==================== LANES ====================
    async createLane(projectId, data) {
        try {
            const response = await apiClient.post(
                API_ENDPOINTS.lanes.create(projectId),
                data
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to create lane';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async updateLane(projectId, laneId, data) {
        try {
            const response = await apiClient.put(
                API_ENDPOINTS.lanes.update(projectId, laneId),
                data
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to update lane';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async deleteLane(projectId, laneId) {
        try {
            await apiClient.delete(
                API_ENDPOINTS.lanes.delete(projectId, laneId)
            );
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to delete lane';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async reorderLanes(projectId, laneIds) {
        try {
            // Преобразуем массив ID в объект positions
            const positions = {};
            laneIds.forEach((id, index) => {
                positions[id] = index + 1;
            });

            const response = await apiClient.put(
                API_ENDPOINTS.lanes.reorder(projectId),
                { positions }
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to reorder lanes';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    // ==================== COLUMNS ====================
    async addColumnToBoard(projectId, statusId) {
        try {
            const response = await apiClient.post(
                API_ENDPOINTS.columns.create(projectId),
                { status_id: statusId }
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to add column';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async removeColumnFromBoard(projectId, columnId) {
        try {
            await apiClient.delete(
                API_ENDPOINTS.columns.delete(projectId, columnId)
            );
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to remove column';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async reorderColumns(projectId, positions) {
        try {
            const response = await apiClient.put(
                API_ENDPOINTS.columns.reorder(projectId),
                { positions }
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to reorder columns';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    // ==================== MEMBERS ====================
    async addMember(projectId, data) {
        try {
            const response = await apiClient.post(
                API_ENDPOINTS.members.create(projectId),
                data
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to add member';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async updateMember(projectId, memberId, data) {
        try {
            const response = await apiClient.put(
                API_ENDPOINTS.members.update(projectId, memberId),
                data
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to update member';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async removeMember(projectId, memberId) {
        try {
            const response = await apiClient.delete(
                API_ENDPOINTS.members.delete(projectId, memberId)
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to delete member';
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
            const response = await apiClient.post(API_ENDPOINTS.comments.create(projectId, taskId), {
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
    },

    async uploadAttachment(projectId, taskId, file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await apiClient.post(
                API_ENDPOINTS.attachments.upload(projectId, taskId),
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 60000
                }
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to upload file';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async downloadAttachment(projectId, taskId, attachmentId) {
        try {
            const response = await apiClient.get(
                API_ENDPOINTS.attachments.download(projectId, taskId, attachmentId),
                { responseType: 'blob' }
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to download file';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async deleteAttachment(projectId, taskId, attachmentId) {
        try {
            const response = await apiClient.delete(
                API_ENDPOINTS.attachments.delete(projectId, taskId, attachmentId)
            );
            return response.data;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Failed to delete attachment';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },
};