class HabitTracker {
    constructor() {
        this.habits = [];
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.render();
        this.updateStatistics();
    }

    bindEvents() {
        const form = document.getElementById('habitForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addHabit();
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getTodayKey() {
        return new Date().toISOString().split('T')[0];
    }

    addHabit() {
        const input = document.getElementById('habitName');
        const habitName = input.value.trim();
        
        if (!habitName) return;

        const newHabit = {
            id: this.generateId(),
            name: habitName,
            createdAt: new Date().toISOString(),
            completedDates: [],
            currentStreak: 0,
            longestStreak: 0
        };

        this.habits.push(newHabit);
        this.saveToStorage();
        this.render();
        this.updateStatistics();
        
        input.value = '';
        input.focus();
    }

    deleteHabit(habitId) {
        this.habits = this.habits.filter(habit => habit.id !== habitId);
        this.saveToStorage();
        this.render();
        this.updateStatistics();
    }

    toggleHabitCompletion(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;

        const today = this.getTodayKey();
        const completedIndex = habit.completedDates.indexOf(today);

        if (completedIndex > -1) {
            habit.completedDates.splice(completedIndex, 1);
        } else {
            habit.completedDates.push(today);
            habit.completedDates.sort();
        }

        this.calculateStreaks(habit);
        this.saveToStorage();
        this.render();
        this.updateStatistics();
    }

    calculateStreaks(habit) {
        if (habit.completedDates.length === 0) {
            habit.currentStreak = 0;
            return;
        }

        const sortedDates = [...habit.completedDates].sort((a, b) => new Date(b) - new Date(a));
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;

        const today = this.getTodayKey();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().split('T')[0];

        let expectedDate = new Date(today);
        let foundToday = false;

        for (let i = 0; i < sortedDates.length; i++) {
            const dateKey = sortedDates[i];
            const currentDate = new Date(dateKey);
            
            if (i === 0 && (dateKey === today || dateKey === yesterdayKey)) {
                foundToday = true;
                currentStreak = 1;
                expectedDate = new Date(dateKey);
            } else if (foundToday) {
                expectedDate.setDate(expectedDate.getDate() - 1);
                const expectedKey = expectedDate.toISOString().split('T')[0];
                
                if (dateKey === expectedKey) {
                    currentStreak++;
                } else {
                    break;
                }
            }

            tempStreak++;
            if (i === 0 || new Date(sortedDates[i - 1]) - new Date(dateKey) === 86400000) {
                tempStreak = i === 0 ? 1 : tempStreak + 1;
            } else {
                tempStreak = 1;
            }
            
            longestStreak = Math.max(longestStreak, tempStreak);
        }

        if (!foundToday && sortedDates[0] !== yesterdayKey) {
            currentStreak = 0;
        }

        habit.currentStreak = currentStreak;
        habit.longestStreak = Math.max(habit.longestStreak, longestStreak);
    }

    isCompletedToday(habit) {
        const today = this.getTodayKey();
        return habit.completedDates.includes(today);
    }

    getTotalCompletedDays(habit) {
        return habit.completedDates.length;
    }

    render() {
        const container = document.getElementById('habitsContainer');
        const emptyState = document.getElementById('emptyState');

        if (this.habits.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        
        container.innerHTML = this.habits.map(habit => {
            const isCompleted = this.isCompletedToday(habit);
            const totalDays = this.getTotalCompletedDays(habit);
            
            return `
                <div class="habit-card" data-habit-id="${habit.id}">
                    <div class="habit-header">
                        <h3 class="habit-name">${this.escapeHtml(habit.name)}</h3>
                        <button class="delete-btn" onclick="tracker.deleteHabit('${habit.id}')">
                            Supprimer
                        </button>
                    </div>
                    <div class="habit-stats">
                        <div class="habit-stat">
                            <div class="habit-stat-value">${habit.currentStreak}</div>
                            <div class="habit-stat-label">Série actuelle</div>
                        </div>
                        <div class="habit-stat">
                            <div class="habit-stat-value">${habit.longestStreak}</div>
                            <div class="habit-stat-label">Meilleure série</div>
                        </div>
                        <div class="habit-stat">
                            <div class="habit-stat-value">${totalDays}</div>
                            <div class="habit-stat-label">Total jours</div>
                        </div>
                    </div>
                    <button 
                        class="check-btn ${isCompleted ? 'checked' : 'unchecked'}"
                        onclick="tracker.toggleHabitCompletion('${habit.id}')"
                    >
                        ${isCompleted ? '✓ Complété' : 'Marquer comme complété'}
                    </button>
                </div>
            `;
        }).join('');
    }

    updateStatistics() {
        const totalHabitsEl = document.getElementById('totalHabits');
        const todayCompletedEl = document.getElementById('todayCompleted');
        const longestStreakEl = document.getElementById('longestStreak');

        const totalHabits = this.habits.length;
        const todayCompleted = this.habits.filter(habit => this.isCompletedToday(habit)).length;
        const longestStreak = this.habits.length > 0 
            ? Math.max(...this.habits.map(habit => habit.longestStreak))
            : 0;

        totalHabitsEl.textContent = totalHabits;
        todayCompletedEl.textContent = todayCompleted;
        longestStreakEl.textContent = longestStreak;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveToStorage() {
        localStorage.setItem('habitTrackerData', JSON.stringify(this.habits));
    }

    loadFromStorage() {
        const stored = localStorage.getItem('habitTrackerData');
        if (stored) {
            try {
                this.habits = JSON.parse(stored);
                this.habits.forEach(habit => this.calculateStreaks(habit));
            } catch (error) {
                console.error('Error loading data from storage:', error);
                this.habits = [];
            }
        }
    }
}

const tracker = new HabitTracker();