export const mockUsers = [
    {
        id: '1',
        first_name: 'Артем',
        last_name: 'Коротких',
        email: 'john@example.com',
        color: '#8B5CF6',
        permission_level: "owner"
    },
    {
        id: '2',
        first_name: 'Sarah',
        last_name: 'Smith',
        email: 'sarah@example.com',
        color: '#3B82F6',
        permission_level: "admin"
    },
    {
        id: '3',
        first_name: 'Mike',
        last_name: 'Chen',
        email: 'mike@example.com',
        color: '#F97316',
        permission_level: "member"
    },
    {
        id: '4',
        first_name: 'Emma',
        last_name: 'Wilson',
        email: 'emma@example.com',
        color: '#EF4444',
        permission_level: "member"
    }
];

export const mockProject = {
    id: '880e8400-e29b-41d4-a716-446655440000',
    name: 'Product Development'
};

export const mockStatuses = [
    {
        id: 'to-do',
        name: 'To Do',
        color: '#4B5563',
        status_type: 'todo'
    },
    {
        id: 'in-progress',
        name: 'In Progress',
        color: '#3B82F6',
        status_type: 'progress'
    },
    {
        id: 'in-review',
        name: 'In Review',
        color: '#F97316',
        status_type: 'progress'
    },
    {
        id: 'need-info',
        name: 'Need Info',
        color: '#8B5CF6',
        status_type: 'paused'
    },
    {
        id: 'done',
        name: 'Done',
        color: '#10B981',
        status_type: 'completed'
    },
    {
        id: 'cancelled',
        name: 'Cancelled',
        color: '#EF4444',
        status_type: 'cancelled'
    }
];

export const mockTags = [
    // Коммуникация и взаимодействие
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c31', title: 'Need Input', color: '#8B5CF6' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c32', title: 'For Client', color: '#3B82F6' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c33', title: 'Team Sync', color: '#10B981' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c34', title: 'Stakeholder', color: '#F97316' },

    // Тип контента/работы
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c35', title: 'Brainstorm', color: '#8B5CF6' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c36', title: 'Research', color: '#3B82F6' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c37', title: 'Draft', color: '#6B7280' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c38', title: 'Final Version', color: '#10B981' },

    // Оценка и сложность
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c39', title: 'Small', color: '#10B981' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c40', title: 'Medium', color: '#F97316' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c41', title: 'Large', color: '#DC2626' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c42', title: 'Unknown', color: '#6B7280' },

    // Контекст выполнения
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c43', title: 'Solo', color: '#8B5CF6' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c44', title: 'Pair', color: '#3B82F6' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c45', title: 'Team', color: '#10B981' },

    // Качество/состояние
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c46', title: 'Needs Polish', color: '#F97316' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c47', title: 'Good First Issue', color: '#10B981' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c48', title: 'Experiment', color: '#8B5CF6' },

    // Зависимости
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c49', title: 'Blocking Others', color: '#DC2626' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c50', title: 'Blocked By', color: '#F97316' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c51', title: 'Independent', color: '#10B981' },

    // Временные характеристики
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c52', title: 'Time Sensitive', color: '#DC2626' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c53', title: 'Anytime', color: '#6B7280' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c54', title: 'Future', color: '#3B82F6' },

    // Дополнительные полезные метки
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c55', title: 'Quick Win', color: '#10B981' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c56', title: 'Tech Debt', color: '#F97316' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c57', title: 'Spike', color: '#8B5CF6' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c58', title: 'MVP', color: '#3B82F6' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c59', title: 'Nice to Have', color: '#6B7280' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c60', title: 'Critical Path', color: '#DC2626' },
    { id: 'f16130ff-9ceb-420a-b625-f73cf6400c61', title: 'run', color: '#10B981' }
];

export const mockTasks = [
    {
        id: '990e8400-e29b-41d4-a716-446655440001',
        project_id: '73779afc-c7be-4921-86ab-59a39dadfa3c',
        title: 'Редизайн пользовательской панели управления',
        description: 'Выполнить редизайн пользовательской панели управления с новыми виджетами аналитики и улучшенным пользовательским опытом. Новый дизайн должен фокусироваться на визуализации данных и простоте использования.',
        creator_id: mockUsers[0].id,
        assignee_id: mockUsers[1].id,
        status_id: mockStatuses[1].id,
        priority: 'critical',
        start_date: '2026-03-01T09:00:00Z',
        due_date: '2026-03-25T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-02-28T10:30:00Z',
        updated_at: '2026-03-02T15:45:00Z',
        creator: mockUsers[0],
        assignee: mockUsers[1],
        status: mockStatuses[1],
        tags: [mockTags[1], mockTags[16], mockTags[25]],
        comment_count: 3,
        subtask_count: 5
    },
    {
        id: '990e8400-e29b-41d4-a716-446655440002',
        project_id: '73779afc-c7be-4921-86ab-59a39dadfa3c',
        title: 'Интеграция платежного API',
        description: 'Интегрировать сторонний платежный API с обработкой ошибок и ретраями. Необходимо обеспечить безопасную передачу данных и соответствие требованиям PCI DSS.',
        creator_id: mockUsers[1].id,
        assignee_id: mockUsers[2].id,
        status_id: mockStatuses[1].id,
        priority: 'critical',
        start_date: '2026-03-01T10:00:00Z',
        due_date: '2026-03-10T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-02-25T14:20:00Z',
        updated_at: '2026-03-01T09:15:00Z',
        creator: mockUsers[1],
        assignee: mockUsers[2],
        status: mockStatuses[1],
        tags: [mockTags[1], mockTags[19], mockTags[30]],
        comment_count: 5,
        subtask_count: 3
    },
    {
        id: '990e8400-e29b-41d4-a716-446655440003',
        project_id: '73779afc-c7be-4921-86ab-59a39dadfa3c',
        title: 'Оптимизация запросов к базе данных',
        description: 'Провести анализ производительности и оптимизировать медленные запросы к базе данных. Сфокусироваться на запросах к таблицам с большим объемом данных.',
        creator_id: mockUsers[2].id,
        assignee_id: null,
        status_id: mockStatuses[2].id,
        priority: 'medium',
        start_date: '2026-03-05T11:00:00Z',
        due_date: '2026-03-20T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-02-20T16:45:00Z',
        updated_at: '2026-03-03T10:20:00Z',
        creator: mockUsers[2],
        assignee: null,
        status: mockStatuses[2],
        tags: [mockTags[5], mockTags[10], mockTags[26]],
        comment_count: 2,
        subtask_count: 4
    },
    {
        id: '990e8400-e29b-41d4-a716-446655440004',
        project_id: '73779afc-c7be-4921-86ab-59a39dadfa3c',
        title: 'Спринт тестирования',
        description: 'Провести полное end-to-end тестирование всех функций перед релизом. Включает функциональное, интеграционное и регрессионное тестирование.',
        creator_id: mockUsers[0].id,
        assignee_id: mockUsers[3].id,
        status_id: mockStatuses[0].id,
        priority: 'high',
        start_date: '2026-03-15T09:00:00Z',
        due_date: '2026-03-25T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-02-15T13:30:00Z',
        updated_at: '2026-03-01T11:10:00Z',
        creator: mockUsers[0],
        assignee: mockUsers[3],
        status: mockStatuses[0],
        tags: [mockTags[2], mockTags[9], mockTags[17]],
        comment_count: 1,
        subtask_count: 6
    },
    {
        id: '990e8400-e29b-41d4-a716-446655440005',
        project_id: '73779afc-c7be-4921-86ab-59a39dadfa3c',
        title: 'Обновление документации API',
        description: 'Обновить документацию API с описанием новых эндпоинтов и примеров использования. Добавить информацию об обработке ошибок и кодах ответов.',
        creator_id: mockUsers[3].id,
        assignee_id: mockUsers[1].id,
        status_id: mockStatuses[5].id,
        priority: 'low',
        start_date: '2026-03-01T14:00:00Z',
        due_date: '2026-03-05T18:00:00Z',
        completed_at: '2026-03-05T16:30:00Z',
        parent_task_id: null,
        created_at: '2026-02-10T09:15:00Z',
        updated_at: '2026-03-05T16:30:00Z',
        creator: mockUsers[3],
        assignee: mockUsers[1],
        status: mockStatuses[5],
        tags: [mockTags[6], mockTags[7], mockTags[12]],
        comment_count: 0,
        subtask_count: 2
    },
    {
        id: '990e8400-e29b-41d4-a716-446655440006',
        project_id: '73779afc-c7be-4921-86ab-59a39dadfa3c',
        title: 'Адаптивный дизайн для мобильных устройств',
        description: 'Обеспечить корректное отображение всех компонентов панели управления на мобильных устройствах. Реализовать адаптивную верстку и оптимизировать touch-взаимодействия.',
        creator_id: mockUsers[1].id,
        assignee_id: mockUsers[0].id,
        status_id: mockStatuses[1].id,
        priority: 'high',
        start_date: '2026-03-02T10:00:00Z',
        due_date: '2026-03-18T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-03-01T15:40:00Z',
        updated_at: '2026-03-03T12:15:00Z',
        creator: mockUsers[1],
        assignee: mockUsers[0],
        status: mockStatuses[1],
        tags: [mockTags[4], mockTags[13], mockTags[18]],
        comment_count: 2,
        subtask_count: 4
    },
    {
        id: '990e8400-e29b-41d4-a716-446655440007',
        project_id: '73779afc-c7be-4921-86ab-59a39dadfa3c',
        title: 'Внедрение middleware для аутентификации',
        description: 'Создать middleware для JWT-аутентификации и контроля доступа на основе ролей. Реализовать механизм обновления токенов и защиту от CSRF.',
        creator_id: mockUsers[1].id,
        assignee_id: mockUsers[2].id,
        status_id: mockStatuses[0].id,
        priority: 'critical',
        start_date: '2026-03-03T09:30:00Z',
        due_date: '2026-03-12T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-03-01T11:20:00Z',
        updated_at: '2026-03-02T14:30:00Z',
        creator: mockUsers[1],
        assignee: mockUsers[2],
        status: mockStatuses[0],
        tags: [mockTags[19], mockTags[27], mockTags[30]],
        comment_count: 0,
        subtask_count: 3
    },
    {
        id: '990e8400-e29b-41d4-a716-446655440021',
        project_id: '73779afc-c7be-4921-86ab-59a39dadfa3c',
        title: 'Внедрение middleware для аутентификации',
        description: 'Создать middleware для JWT-аутентификации и контроля доступа на основе ролей. Реализовать механизм обновления токенов и защиту от CSRF.',
        creator_id: mockUsers[1].id,
        assignee_id: mockUsers[2].id,
        status_id: mockStatuses[0].id,
        priority: 'critical',
        start_date: '2026-03-03T09:30:00Z',
        due_date: '2026-03-12T18:00:00Z',
        completed_at: null,
        parent_task_id: '990e8400-e29b-41d4-a716-446655440007',
        created_at: '2026-03-01T11:20:00Z',
        updated_at: '2026-03-02T14:30:00Z',
        creator: mockUsers[1],
        assignee: mockUsers[2],
        status: mockStatuses[0],
        tags: [mockTags[19], mockTags[27], mockTags[30]],
        comment_count: 0,
        subtask_count: 3
    },
    {
        id: '990e8400-e29b-41d4-a716-446655440008',
        project_id: '880e8400-e29b-41d4-a716-446655440000',
        title: 'Модульные тесты для API',
        description: 'Написать модульные тесты для всех эндпоинтов API с использованием Jest. Достичь покрытия не менее 80%. Включить тесты для позитивных и негативных сценариев.',
        creator_id: mockUsers[0].id,
        assignee_id: mockUsers[3].id,
        status_id: mockStatuses[0].id,
        priority: 'medium',
        start_date: '2026-03-08T11:00:00Z',
        due_date: '2026-03-22T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-03-02T13:45:00Z',
        updated_at: '2026-03-03T09:20:00Z',
        creator: mockUsers[0],
        assignee: mockUsers[3],
        status: mockStatuses[0],
        tags: [mockTags[2], mockTags[9], mockTags[27]],
        comment_count: 1,
        subtask_count: 7
    },
    {
        id: '990e8400-e29b-41d4-a716-446655440009',
        project_id: '880e8400-e29b-41d4-a716-446655440000',
        title: 'Онбординг новых пользователей',
        description: 'Разработать и внедрить пошаговый онбординг для новых пользователей. Включить приветственные подсказки, обучение основным функциям и чеклист первых шагов.',
        creator_id: mockUsers[0].id,
        assignee_id: mockUsers[1].id,
        status_id: mockStatuses[1].id,
        priority: 'high',
        start_date: '2026-03-04T10:15:00Z',
        due_date: '2026-03-19T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-03-03T16:30:00Z',
        updated_at: '2026-03-04T11:45:00Z',
        creator: mockUsers[0],
        assignee: mockUsers[1],
        status: mockStatuses[1],
        tags: [mockTags[3], mockTags[4], mockTags[28]],
        comment_count: 4,
        subtask_count: 5
    },
    {
        id: '990e8400-e29b-41d4-a716-446655440010',
        project_id: '880e8400-e29b-41d4-a716-446655440000',
        title: 'Исправление утечки памяти',
        description: 'Исследовать и исправить утечку памяти в модуле аналитики, вызывающую падение производительности. Провести профилирование и оптимизировать работу с событиями.',
        creator_id: mockUsers[3].id,
        assignee_id: mockUsers[2].id,
        status_id: mockStatuses[2].id,
        priority: 'critical',
        start_date: '2026-03-01T13:00:00Z',
        due_date: '2026-03-08T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-02-28T12:10:00Z',
        updated_at: '2026-03-02T17:30:00Z',
        creator: mockUsers[3],
        assignee: mockUsers[2],
        status: mockStatuses[2],
        tags: [mockTags[19], mockTags[26], mockTags[22]],
        comment_count: 6,
        subtask_count: 2
    },
    {
        id: '990e8400-e29b-41d4-a716-446655440011',
        project_id: '880e8400-e29b-41d4-a716-446655440000',
        title: 'Библиотека компонентов дизайн-системы',
        description: 'Создать переиспользуемую библиотеку компонентов с документацией в Storybook. Включить базовые компоненты: кнопки, инпуты, модальные окна, карточки и навигационные элементы.',
        creator_id: mockUsers[0].id,
        assignee_id: mockUsers[1].id,
        status_id: mockStatuses[1].id,
        priority: 'high',
        start_date: '2026-03-10T09:00:00Z',
        due_date: '2026-04-05T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-03-05T14:30:00Z',
        updated_at: '2026-03-06T11:20:00Z',
        creator: mockUsers[0],
        assignee: mockUsers[1],
        status: mockStatuses[1],
        tags: [mockTags[4], mockTags[14], mockTags[25]],
        comment_count: 2,
        subtask_count: 8
    },

    // 12. Внедрение WebSocket для уведомлений
    {
        id: '990e8400-e29b-41d4-a716-446655440012',
        project_id: '880e8400-e29b-41d4-a716-446655440000',
        title: 'WebSocket для real-time уведомлений',
        description: 'Реализовать поддержку WebSocket для отправки уведомлений в реальном времени. Добавить механизм переподключения при обрыве связи и очередь сообщений.',
        creator_id: mockUsers[2].id,
        assignee_id: null,
        status_id: mockStatuses[0].id,
        priority: 'medium',
        start_date: '2026-03-12T10:30:00Z',
        due_date: '2026-03-28T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-03-06T09:15:00Z',
        updated_at: '2026-03-07T13:40:00Z',
        creator: mockUsers[2],
        assignee: null,
        status: mockStatuses[0],
        tags: [mockTags[5], mockTags[27], mockTags[22]],
        comment_count: 0,
        subtask_count: 4
    },

    // 13. Аудит доступности (Accessibility)
    {
        id: '990e8400-e29b-41d4-a716-446655440013',
        project_id: '880e8400-e29b-41d4-a716-446655440000',
        title: 'Аудит доступности интерфейса',
        description: 'Провести аудит доступности согласно WCAG 2.1. Проверить контрастность, навигацию с клавиатуры, поддержку скринридеров и ARIA-атрибуты. Исправить критические нарушения.',
        creator_id: mockUsers[0].id,
        assignee_id: mockUsers[3].id,
        status_id: mockStatuses[0].id,
        priority: 'high',
        start_date: '2026-03-15T11:00:00Z',
        due_date: '2026-03-30T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-03-07T16:45:00Z',
        updated_at: '2026-03-08T10:30:00Z',
        creator: mockUsers[0],
        assignee: mockUsers[3],
        status: mockStatuses[0],
        tags: [mockTags[2], mockTags[17], mockTags[29]],
        comment_count: 3,
        subtask_count: 5
    },

    // 14. Настройка интернационализации (i18n)
    {
        id: '990e8400-e29b-41d4-a716-446655440014',
        project_id: '880e8400-e29b-41d4-a716-446655440000',
        title: 'Настройка интернационализации',
        description: 'Настроить i18n с поддержкой русского и английского языков. Добавить переключатель языка, подготовить файлы переводов для всех интерфейсных строк.',
        creator_id: mockUsers[1].id,
        assignee_id: mockUsers[2].id,
        status_id: mockStatuses[4].id,
        priority: 'low',
        start_date: '2026-03-18T09:45:00Z',
        due_date: '2026-04-10T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-03-08T12:20:00Z',
        updated_at: '2026-03-09T14:15:00Z',
        creator: mockUsers[1],
        assignee: mockUsers[2],
        status: mockStatuses[4],
        tags: [mockTags[6], mockTags[12], mockTags[24]],
        comment_count: 1,
        subtask_count: 3
    },

    // 15. Дашборд мониторинга производительности
    {
        id: '990e8400-e29b-41d4-a716-446655440015',
        project_id: '880e8400-e29b-41d4-a716-446655440000',
        title: 'Дашборд мониторинга производительности',
        description: 'Создать дашборд для отслеживания метрик производительности: время загрузки страниц, ошибки API, использование ресурсов. Интегрировать с существующей системой мониторинга.',
        creator_id: mockUsers[2].id,
        assignee_id: mockUsers[0].id,
        status_id: mockStatuses[5].id,
        priority: 'medium',
        start_date: '2026-02-20T13:00:00Z',
        due_date: '2026-03-05T18:00:00Z',
        completed_at: '2026-03-05T15:30:00Z',
        parent_task_id: null,
        created_at: '2026-02-15T10:10:00Z',
        updated_at: '2026-03-05T15:30:00Z',
        creator: mockUsers[2],
        assignee: mockUsers[0],
        status: mockStatuses[5],
        tags: [mockTags[1], mockTags[26], mockTags[28]],
        comment_count: 5,
        subtask_count: 3
    },

    // 16. Темная тема
    {
        id: '990e8400-e29b-41d4-a716-446655440016',
        project_id: '880e8400-e29b-41d4-a716-446655440000',
        title: 'Реализация темной темы',
        description: 'Добавить поддержку темной темы во всем приложении. Реализовать переключатель темы, сохранять выбор пользователя. Обеспечить плавный переход между темами.',
        creator_id: mockUsers[3].id,
        assignee_id: mockUsers[0].id,
        status_id: mockStatuses[0].id,
        priority: 'medium',
        start_date: '2026-03-22T10:00:00Z',
        due_date: '2026-04-15T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-03-09T15:50:00Z',
        updated_at: '2026-03-10T09:25:00Z',
        creator: mockUsers[3],
        assignee: mockUsers[0],
        status: mockStatuses[0],
        tags: [mockTags[4], mockTags[18], mockTags[25]],
        comment_count: 2,
        subtask_count: 4
    },

    // 17. Автоматизация резервного копирования
    {
        id: '990e8400-e29b-41d4-a716-446655440017',
        project_id: '880e8400-e29b-41d4-a716-446655440000',
        title: 'Автоматизация резервного копирования БД',
        description: 'Настроить автоматическое ежедневное резервное копирование базы данных. Реализовать политику хранения (30 дней), настроить уведомления об успехе/неудаче.',
        creator_id: mockUsers[1].id,
        assignee_id: mockUsers[2].id,
        status_id: mockStatuses[2].id,
        priority: 'high',
        start_date: '2026-03-14T14:30:00Z',
        due_date: '2026-03-25T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-03-10T11:40:00Z',
        updated_at: '2026-03-11T16:20:00Z',
        creator: mockUsers[1],
        assignee: mockUsers[2],
        status: mockStatuses[2],
        tags: [mockTags[5], mockTags[19], mockTags[27]],
        comment_count: 0,
        subtask_count: 3
    },

    // 18. Страница профиля пользователя
    {
        id: '990e8400-e29b-41d4-a716-446655440018',
        project_id: '880e8400-e29b-41d4-a716-446655440000',
        title: 'Страница профиля пользователя',
        description: 'Разработать страницу профиля с возможностью редактирования личных данных, загрузки аватара, изменения пароля и настройки уведомлений.',
        creator_id: mockUsers[0].id,
        assignee_id: mockUsers[1].id,
        status_id: mockStatuses[1].id,
        priority: 'high',
        start_date: '2026-03-16T09:15:00Z',
        due_date: '2026-03-29T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-03-11T13:30:00Z',
        updated_at: '2026-03-12T10:45:00Z',
        creator: mockUsers[0],
        assignee: mockUsers[1],
        status: mockStatuses[1],
        tags: [mockTags[3], mockTags[4], mockTags[23]],
        comment_count: 4,
        subtask_count: 3
    },

    // 19. Сервис email-уведомлений
    {
        id: '990e8400-e29b-41d4-a716-446655440019',
        project_id: '880e8400-e29b-41d4-a716-446655440000',
        title: 'Сервис email-уведомлений',
        description: 'Реализовать сервис для отправки email-уведомлений. Поддержать шаблоны для разных типов событий (назначение задачи, комментарий, приближение дедлайна).',
        creator_id: mockUsers[3].id,
        assignee_id: mockUsers[2].id,
        status_id: mockStatuses[2].id,
        priority: 'medium',
        start_date: '2026-03-05T12:00:00Z',
        due_date: null,
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-03-01T08:45:00Z',
        updated_at: '2026-03-12T14:30:00Z',
        creator: mockUsers[3],
        assignee: mockUsers[2],
        status: mockStatuses[2],
        tags: [mockTags[1], mockTags[27], mockTags[30]],
        comment_count: 3,
        subtask_count: 2
    },

    // 20. Комплексный аудит безопасности
    {
        id: '990e8400-e29b-41d4-a716-446655440020',
        project_id: '880e8400-e29b-41d4-a716-446655440000',
        title: 'Комплексный аудит безопасности',
        description: 'Провести комплексный аудит безопасности: анализ кода, сканирование зависимостей, тестирование на проникновение. Подготовить отчет и план исправления уязвимостей.',
        creator_id: mockUsers[0].id,
        assignee_id: null,
        status_id: mockStatuses[2].id,
        priority: 'critical',
        start_date: '2026-03-25T10:00:00Z',
        due_date: '2026-04-20T18:00:00Z',
        completed_at: null,
        parent_task_id: null,
        created_at: '2026-03-12T15:20:00Z',
        updated_at: '2026-03-13T09:10:00Z',
        creator: mockUsers[0],
        assignee: null,
        status: mockStatuses[2],
        tags: [mockTags[19], mockTags[26], mockTags[30]],
        comment_count: 0,
        subtask_count: 8
    }
];

export const mockColumns = [
    {
        id: '12d41def-040c-4894-acff-d905dc412301',
        project_id: mockProject.id,
        status_id: mockStatuses.find(st => st.id === 'to-do').id,
        position: 1,
        created_at: '2026-03-01T10:45:00Z',
        updated_at: '2026-03-01T10:45:00Z',

        status: mockStatuses.find(st => st.id === 'to-do')
    },
    {
        id: '12d41def-040c-4894-acff-d905dc412302',
        project_id: mockProject.id,
        status_id: mockStatuses.find(st => st.id === 'in-progress').id,
        position: 2,
        created_at: '2026-03-01T10:45:00Z',
        updated_at: '2026-03-01T10:45:00Z',

        status: mockStatuses.find(st => st.id === 'in-progress'),
    },
    {
        id: '12d41def-040c-4894-acff-d905dc412303',
        project_id: mockProject.id,
        status_id: mockStatuses.find(st => st.id === 'in-review').id,
        position: 3,
        created_at: '2026-03-01T10:45:00Z',
        updated_at: '2026-03-01T10:45:00Z',

        status: mockStatuses.find(st => st.id === 'in-review'),
    },
    {
        id: '12d41def-040c-4894-acff-d905dc412304',
        project_id: mockProject.id,
        status_id: mockStatuses.find(st => st.id === 'done').id,
        position: 4,
        created_at: '2026-03-01T10:45:00Z',
        updated_at: '2026-03-01T10:45:00Z',

        status: mockStatuses.find(st => st.id === 'done'),
    },
];

export const mockLanes = [
    {
        id: '95c8d8b9-5fc2-4f4f-bff2-3a07b044a701',
        project_id: mockProject.id,
        title: 'Critical Priority',
        description: '',
        position: 1,
        color: '#EF4444',
        rule_condition: {
            logic: null,
            conditions: [
                {
                    field: 'priority',
                    operator: '=',
                    value: 'critical',
                }
            ]
        },
        created_at: '2026-03-01T09:10:00Z',
        updated_at: '2026-03-01T09:10:00Z',

        tasks: mockTasks.filter(task => task.priority === 'critical' &&
            (task.status.id === 'to-do' || task.status.id === 'in-progress' || task.status.id === 'in-review' || task.status.id === 'done')),
    },
    {
        id: '95c8d8b9-5fc2-4f4f-bff2-3a07b044a702',
        project_id: mockProject.id,
        title: 'High Priority',
        description: '',
        position: 2,
        color: '#F59E0B',
        rule_condition: {
            logic: null,
            conditions: [
                {
                    field: 'priority',
                    operator: '=',
                    value: 'high',
                }
            ]
        },
        created_at: '2026-03-01T09:10:00Z',
        updated_at: '2026-03-01T09:10:00Z',

        tasks: mockTasks.filter(task => task.priority === 'high' &&
            (task.status.id === 'to-do' || task.status.id === 'in-progress' || task.status.id === 'in-review' || task.status.id === 'done')),
    },
    {
        id: '95c8d8b9-5fc2-4f4f-bff2-3a07b044a703',
        project_id: mockProject.id,
        title: 'Medium Priority',
        description: '',
        position: 3,
        color: '#3B82F6',
        rule_condition: {
            logic: null,
            conditions: [
                {
                    field: 'priority',
                    operator: '=',
                    value: 'medium',
                }
            ]
        },
        created_at: '2026-03-01T09:10:00Z',
        updated_at: '2026-03-01T09:10:00Z',

        tasks: mockTasks.filter(task => task.priority === 'medium' &&
            (task.status.id === 'to-do' || task.status.id === 'in-progress' || task.status.id === 'in-review' || task.status.id === 'done')),
    },
    {
        id: '95c8d8b9-5fc2-4f4f-bff2-3a07b044a704',
        project_id: mockProject.id,
        title: 'Low Priority',
        description: '',
        position: 4,
        color: '#6B7280',
        rule_condition: {
            logic: null,
            conditions: [
                {
                    field: 'priority',
                    operator: '=',
                    value: 'low',
                }
            ]
        },
        created_at: '2026-03-01T09:10:00Z',
        updated_at: '2026-03-01T09:10:00Z',

        tasks: mockTasks.filter(task => task.priority === 'low' &&
            (task.status.id === 'to-do' || task.status.id === 'in-progress' || task.status.id === 'in-review' || task.status.id === 'done')),
    },
]

export const mockActivityEvents = [
    {
        id: '1',
        user: mockUsers[1],
        action: 'moved',
        task: 'API Integration',
        time: '5 min ago',
        type: 'status',
        comment: 'Moving to review'
    },
    {
        id: '2',
        user: mockUsers[0],
        action: 'created',
        task: 'User Dashboard Redesign',
        time: '15 min ago',
        type: 'system'
    },
    {
        id: '3',
        user: mockUsers[2],
        action: 'commented on',
        task: 'Database Optimization',
        time: '1 hour ago',
        type: 'comment',
        comment: 'Need to check indexes'
    },
    {
        id: '4',
        user: mockUsers[3],
        action: 'assigned',
        task: 'Testing Sprint',
        time: '2 hours ago',
        type: 'assign'
    },
    {
        id: '5',
        user: mockUsers[1],
        action: 'completed',
        task: 'Documentation Update',
        time: '3 hours ago',
        type: 'status'
    }
];