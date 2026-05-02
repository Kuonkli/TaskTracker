export const PROJECT_COLORS = [
    // Фиолетовые
    { name: 'Violet', hex: '#8B5CF6', label: 'Violet' },
    { name: 'Purple', hex: '#A855F7', label: 'Purple' },
    { name: 'Fuchsia', hex: '#D946EF', label: 'Fuchsia' },
    { name: 'Amethyst', hex: '#9B59B6', label: 'Amethyst' },
    { name: 'Plum', hex: '#BE8FE6', label: 'Plum' },
    { name: 'Lavender', hex: '#B4A0E5', label: 'Lavender' },

    // Синие
    { name: 'Blue', hex: '#3B82F6', label: 'Blue' },
    { name: 'Royal Blue', hex: '#4F46E5', label: 'Royal Blue' },
    { name: 'Sky Blue', hex: '#60A5FA', label: 'Sky Blue' },
    { name: 'Cyan', hex: '#06B6D4', label: 'Cyan' },
    { name: 'Teal', hex: '#14B8A6', label: 'Teal' },
    { name: 'Cerulean', hex: '#4488D0', label: 'Cerulean' },
    { name: 'Sapphire', hex: '#2E4A8A', label: 'Sapphire' },

    // Зеленые
    { name: 'Emerald', hex: '#10B981', label: 'Emerald' },
    { name: 'Green', hex: '#22C55E', label: 'Green' },
    { name: 'Lime', hex: '#84CC16', label: 'Lime' },
    { name: 'Mint', hex: '#34D399', label: 'Mint' },
    { name: 'Jade', hex: '#2ECC71', label: 'Jade' },
    { name: 'Forest', hex: '#27AE60', label: 'Forest' },

    // Желтые и оранжевые
    { name: 'Amber', hex: '#F59E0B', label: 'Amber' },
    { name: 'Orange', hex: '#F97316', label: 'Orange' },
    { name: 'Gold', hex: '#EAB308', label: 'Gold' },
    { name: 'Coral', hex: '#FF6B6B', label: 'Coral' },
    { name: 'Tangerine', hex: '#FF8C42', label: 'Tangerine' },
    { name: 'Marigold', hex: '#F4A620', label: 'Marigold' },
    { name: 'Peach', hex: '#FB923C', label: 'Peach' },

    // Красные и розовые
    { name: 'Red', hex: '#EF4444', label: 'Red' },
    { name: 'Rose', hex: '#F43F5E', label: 'Rose' },
    { name: 'Pink', hex: '#EC4899', label: 'Pink' },
    { name: 'Crimson', hex: '#DC2626', label: 'Crimson' },
    { name: 'Ruby', hex: '#E74C3C', label: 'Ruby' },
    { name: 'Salmon', hex: '#FA8072', label: 'Salmon' },
    { name: 'Magenta', hex: '#E91E63', label: 'Magenta' },

    // Нейтральные
    { name: 'Gray', hex: '#6B7280', label: 'Gray' },
    { name: 'Slate', hex: '#64748B', label: 'Slate' },
    { name: 'Silver', hex: '#94A3B8', label: 'Silver' },
    { name: 'Charcoal', hex: '#4B5563', label: 'Charcoal' },
    { name: 'Steel', hex: '#717D7E', label: 'Steel' },
    { name: 'Chrome', hex: '#839192', label: 'Chrome' },

    // Индиго и специальные
    { name: 'Indigo', hex: '#6366F1', label: 'Indigo' },
    { name: 'Periwinkle', hex: '#7C8CD5', label: 'Periwinkle' },
    { name: 'Turquoise', hex: '#1ABC9C', label: 'Turquoise' },
    { name: 'Aquamarine', hex: '#5CE1E6', label: 'Aquamarine' },
    { name: 'Olive', hex: '#808000', label: 'Olive' },
    { name: 'Bronze', hex: '#CD7F32', label: 'Bronze' },
    { name: 'Copper', hex: '#B87333', label: 'Copper' },
];

// Функция для поиска цвета по hex
export const findColorByHex = (hex) => {
    return PROJECT_COLORS.find(c => c.hex.toUpperCase() === hex.toUpperCase());
};

// Функция для получения названия цвета по hex
export const getColorName = (hex) => {
    const color = findColorByHex(hex);
    return color ? color.label : hex;
};