 // =====================================================
// FinCalc Pro - JavaScript
// Smart Interest & Loan Planner
// =====================================================

// Global Variables
let currentTheme = 'light';
let growthChart = null;
let breakdownChart = null;
let comparisonChart = null;
let calculationHistory = [];
let currentCurrency = 'USD';
let lastCalculation = null;
let lastComparison = null;
let lastInstallment = null;

// Currency Symbols
const currencySymbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'JPY': '¥',
    'AUD': 'A$',
    'PKR': '₨'
};

// API Configuration
const API_BASE_URL = 'http://localhost:8080/api';
let isApiAvailable = false;
let currencyThemes = {};

// Currency Themes (with fallback)
const defaultCurrencyThemes = {
    'USD': { color: '#2563eb', accent: '#8b5cf6', backgroundColor: '#eff6ff', symbol: '$', position: 'before' },
    'EUR': { color: '#059669', accent: '#10b981', backgroundColor: '#ecfdf5', symbol: '€', position: 'after' },
    'GBP': { color: '#7c3aed', accent: '#a78bfa', backgroundColor: '#faf5ff', symbol: '£', position: 'before' },
    'INR': { color: '#d97706', accent: '#f59e0b', backgroundColor: '#fffbeb', symbol: '₹', position: 'before' },
    'JPY': { color: '#dc2626', accent: '#f87171', backgroundColor: '#fef2f2', symbol: '¥', position: 'before' },
    'AUD': { color: '#0891b2', accent: '#06b6d4', backgroundColor: '#ecf8fa', symbol: 'A$', position: 'before' },
    'PKR': { color: '#01411C', accent: '#FFB81C', backgroundColor: '#f0fdf4', symbol: '₨', position: 'before' }
};

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    loadTheme();
    loadHistory();
    setupEventListeners();
    loadCurrency();
    checkApiAvailability();
    loadCurrencyThemes();
});

// =====================================================
// Theme Management
// =====================================================

function setupEventListeners() {
    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Navigation Links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            switchSection(section);
        });
    });

    // Currency Select
    document.getElementById('currencySelect').addEventListener('change', (e) => {
        currentCurrency = e.target.value;
        localStorage.setItem('selectedCurrency', currentCurrency);
        applyCurrencyTheme(currentCurrency);
        refreshDisplayedResults();
        showSuccess(`Currency changed to ${currentCurrency}`);
    });

    // Modal Close Button
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeDeleteModal();
            }
        });
    }
}

function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    currentTheme = body.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    currentTheme = savedTheme;
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.getElementById('themeToggle').querySelector('i');
    if (currentTheme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

function loadCurrency() {
    const savedCurrency = localStorage.getItem('selectedCurrency') || 'USD';
    currentCurrency = savedCurrency;
    document.getElementById('currencySelect').value = currentCurrency;
    applyCurrencyTheme(currentCurrency);
}

// =====================================================
// API Integration - Backend Sync
// =====================================================

async function checkApiAvailability() {
    try {
        const response = await fetch(`${API_BASE_URL}/currencies`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            isApiAvailable = true;
            console.log('✅ Backend API is available');
            syncHistoryWithBackend();
        }
    } catch (error) {
        console.warn('⚠️ Backend API not available. Using local storage only.');
        isApiAvailable = false;
    }
}

async function loadCurrencyThemes() {
    if (isApiAvailable) {
        try {
            const response = await fetch(`${API_BASE_URL}/currencies`);
            if (response.ok) {
                const themes = await response.json();
                themes.forEach(theme => {
                    const defaults = defaultCurrencyThemes[theme.currencyCode] || {};
                    currencyThemes[theme.currencyCode] = { ...defaults, ...theme };
                    if (theme.symbol) {
                        currencySymbols[theme.currencyCode] = theme.symbol;
                    }
                });
                applyCurrencyTheme(currentCurrency);
            }
        } catch (error) {
            console.warn('Failed to load currency themes from API');
            currencyThemes = defaultCurrencyThemes;
        }
    } else {
        currencyThemes = defaultCurrencyThemes;
    }
}

function applyCurrencyTheme(currency) {
    const theme = currencyThemes[currency] || defaultCurrencyThemes[currency];
    if (theme) {
        const root = document.documentElement;
        if (theme.color) {
            root.style.setProperty('--primary-color', theme.color);
        }
        if (theme.accent || theme.color) {
            root.style.setProperty('--accent-color', theme.accent || '#8b5cf6');
        }
        if (theme.backgroundColor) {
            root.style.setProperty('--bg-primary', theme.backgroundColor);
        }
        document.body.classList.toggle('pkr-theme', currency === 'PKR');
    }
}

function getCurrencySymbol(currencyCode = currentCurrency) {
    const theme = currencyThemes[currencyCode] || defaultCurrencyThemes[currencyCode];
    return theme?.symbol || currencySymbols[currencyCode] || '';
}

function formatCurrency(amount, currencyCode = currentCurrency) {
    const locale = currencyCode === 'PKR' ? 'en-PK' : currencyCode === 'INR' ? 'en-IN' : 'en-US';
    const formatted = parseFloat(amount).toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    if (currencyCode === 'PKR') {
        return `PKR ${formatted}`;
    }
    const symbol = getCurrencySymbol(currencyCode);
    const theme = currencyThemes[currencyCode] || defaultCurrencyThemes[currencyCode];
    if (theme?.position === 'after') {
        return `${formatted}${symbol}`;
    }
    return `${symbol}${formatted}`;
}

function getChartColors() {
    const theme = currencyThemes[currentCurrency] || defaultCurrencyThemes[currentCurrency];
    return {
        primary: theme?.color || '#2563eb',
        accent: theme?.accent || '#8b5cf6'
    };
}

function getChartTooltipOptions() {
    return {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { family: 'Outfit', size: 13 },
        bodyFont: { family: 'Outfit', size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
            label: (ctx) => {
                const label = ctx.dataset.label || '';
                return `${label}: ${formatCurrency(ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed)}`;
            }
        }
    };
}

function animateValue(element, start, end, duration, formatter) {
    const range = end - start;
    const startTime = performance.now();
    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + range * eased;
        element.textContent = formatter(current);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function refreshDisplayedResults() {
    if (lastCalculation) {
        const c = lastCalculation;
        displayResults(c.principal, c.rate, c.time, c.simpleInterest, c.simpleAmount, c.compoundInterest, c.compoundAmount);
        generateGrowthChart(c.principal, c.rate, c.time, c.frequency || 1);
    }
    if (lastComparison) {
        const { result1, result2, p1, p2, t1, t2 } = lastComparison;
        displayComparisonResults(result1, result2);
        generateComparisonChart(result1, result2, p1, p2, t1, t2);
    }
    if (lastInstallment) {
        const i = lastInstallment;
        displayEMIDetails(i.loanAmount, i.loanRate, i.loanTenure, i.emi, i.totalPayment, i.totalInterest);
        generateAmortizationSchedule(i.loanAmount, i.monthlyRate, i.emi, i.loanTenure);
    }
    displayHistory();
}

async function syncHistoryWithBackend() {
    try {
        const response = await fetch(`${API_BASE_URL}/history`);
        if (response.ok) {
            const backendHistory = await response.json();
            const localHistory = JSON.parse(localStorage.getItem('calculationHistory') || '[]');
            
            // Merge: backend history + unsync local items
            const merged = mergeHistories(backendHistory, localHistory);
            calculationHistory = merged;
            displayHistory();
            console.log('✅ History synced with backend');
        }
    } catch (error) {
        console.warn('Failed to sync history with backend:', error);
    }
}

function mergeHistories(backendHistory, localHistory) {
    const backendIds = new Set(backendHistory.map(h => h.id));
    const merged = [...backendHistory];
    
    // Add local items that don't exist in backend (new unsync items)
    localHistory.forEach(local => {
        if (!backendIds.has(local.id)) {
            merged.push(local);
        }
    });
    
    return merged.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
}

async function saveCalculationToBackend(calculation) {
    if (!isApiAvailable) return null;
    
    try {
        const payload = {
            calculationType: calculation.type || 'interest',
            currency: currentCurrency,
            title: calculation.title || `Calculation on ${new Date().toLocaleDateString()}`,
            inputs: JSON.stringify({
                principal: calculation.principal,
                rate: calculation.rate,
                time: calculation.time,
                frequency: calculation.frequency
            }),
            result: JSON.stringify({
                compoundAmount: calculation.compoundAmount,
                simpleInterest: calculation.simpleInterest,
                compoundInterest: calculation.compoundInterest
            })
        };

        const response = await fetch(`${API_BASE_URL}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const saved = await response.json();
            console.log('✅ Calculation saved to backend');
            return saved;
        }
    } catch (error) {
        console.warn('Failed to save to backend:', error);
    }
    return null;
}

async function deleteHistoryItemFromBackend(id) {
    if (!isApiAvailable) return false;
    
    try {
        const response = await fetch(`${API_BASE_URL}/history/${id}`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch (error) {
        console.warn('Failed to delete from backend:', error);
        return false;
    }
}

async function clearAllHistoryFromBackend() {
    if (!isApiAvailable) return false;
    
    try {
        const response = await fetch(`${API_BASE_URL}/history`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch (error) {
        console.warn('Failed to clear backend history:', error);
        return false;
    }
}

// =====================================================
// Navigation
// =====================================================

function switchSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(sectionName);
    if (section) {
        section.classList.add('active');
    }

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionName) {
            link.classList.add('active');
        }
    });

    // Scroll to top
    window.scrollTo(0, 0);
}

// =====================================================
// Interest Calculations
// =====================================================

function calculateInterest() {
    const principal = parseFloat(document.getElementById('principal').value);
    const rate = parseFloat(document.getElementById('rate').value);
    const time = parseFloat(document.getElementById('time').value);
    const frequency = parseInt(document.getElementById('compoundFrequency').value);

    // Validation
    if (!validateInputs(principal, rate, time)) {
        showError('Please enter valid positive numbers');
        return;
    }

    // Calculate Simple Interest
    const simpleInterest = (principal * rate * time) / 100;
    const simpleAmount = principal + simpleInterest;

    // Calculate Compound Interest
    const compoundAmount = principal * Math.pow(1 + (rate / 100) / frequency, frequency * time);
    const compoundInterest = compoundAmount - principal;

    // Store calculation
    lastCalculation = {
        type: 'interest',
        principal,
        rate,
        time,
        simpleInterest,
        simpleAmount,
        compoundInterest,
        compoundAmount,
        frequency,
        date: new Date()
    };

    // Display Results
    displayResults(principal, rate, time, simpleInterest, simpleAmount, compoundInterest, compoundAmount);

    // Generate Chart
    generateGrowthChart(principal, rate, time, frequency);

    // Generate Recommendations
    generateRecommendations(principal, rate, time, simpleAmount, compoundAmount);

    // Show save button
    document.getElementById('saveCalculation').style.display = 'inline-flex';
}

function displayResults(principal, rate, time, si, sa, ci, ca) {
    const resultsContainer = document.getElementById('resultsContainer');
    const difference = ca - sa;
    const percentDiff = ((difference / sa) * 100).toFixed(2);

    resultsContainer.innerHTML = `
        <div class="stat-cards">
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-wallet"></i></div>
                <div class="stat-label">Principal</div>
                <div class="stat-value" id="statPrincipal">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
                <div class="stat-label">Compound Total</div>
                <div class="stat-value" id="statCompound">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-star"></i></div>
                <div class="stat-label">Extra Earnings</div>
                <div class="stat-value" id="statExtra">0</div>
            </div>
        </div>

        <div class="result-highlight">
            <div class="result-item">
                <span class="result-label">Rate of Interest:</span>
                <span class="result-value">${rate.toFixed(2)}% per annum</span>
            </div>
            <div class="result-item">
                <span class="result-label">Time Period:</span>
                <span class="result-value">${time} years</span>
            </div>
        </div>

        <div style="margin-top: 1.5rem;">
            <h4 class="result-section-title si"><i class="fas fa-percentage"></i> Simple Interest</h4>
            <div class="result-item">
                <span class="result-label">Interest Earned:</span>
                <span class="result-value">${formatCurrency(si)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Total Amount:</span>
                <span class="result-value">${formatCurrency(sa)}</span>
            </div>
        </div>

        <div style="margin-top: 1.5rem;">
            <h4 class="result-section-title ci"><i class="fas fa-chart-line"></i> Compound Interest</h4>
            <div class="result-item">
                <span class="result-label">Interest Earned:</span>
                <span class="result-value">${formatCurrency(ci)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Total Amount:</span>
                <span class="result-value">${formatCurrency(ca)}</span>
            </div>
        </div>

        <div class="extra-earnings-box">
            <div class="result-item">
                <span class="result-label"><i class="fas fa-bolt"></i> Extra Earnings (CI vs SI):</span>
                <span class="result-value" style="color: var(--success-color);">
                    ${formatCurrency(difference)} (${percentDiff}% more)
                </span>
            </div>
        </div>
    `;

    setTimeout(() => {
        const fmt = (v) => formatCurrency(v);
        const elP = document.getElementById('statPrincipal');
        const elC = document.getElementById('statCompound');
        const elE = document.getElementById('statExtra');
        if (elP) animateValue(elP, 0, principal, 1200, fmt);
        if (elC) animateValue(elC, 0, ca, 1200, fmt);
        if (elE) animateValue(elE, 0, difference, 1200, fmt);
    }, 50);
}

function generateGrowthChart(principal, rate, time, frequency) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    const chartSection = document.getElementById('chartSection');
    chartSection.style.display = 'block';

    const colors = getChartColors();
    const labels = [];
    const siData = [];
    const ciData = [];

    for (let year = 0; year <= time; year += 0.25) {
        labels.push(year.toFixed(2));
        const si = (principal * rate * year) / 100;
        siData.push(principal + si);
        const ci = principal * Math.pow(1 + (rate / 100) / frequency, frequency * year);
        ciData.push(ci);
    }

    if (growthChart) growthChart.destroy();

    const gradientSI = ctx.createLinearGradient(0, 0, 0, 350);
    gradientSI.addColorStop(0, colors.primary + '40');
    gradientSI.addColorStop(1, colors.primary + '05');

    const gradientCI = ctx.createLinearGradient(0, 0, 0, 350);
    gradientCI.addColorStop(0, colors.accent + '40');
    gradientCI.addColorStop(1, colors.accent + '05');

    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Simple Interest',
                    data: siData,
                    borderColor: colors.primary,
                    backgroundColor: gradientSI,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    borderWidth: 3
                },
                {
                    label: 'Compound Interest',
                    data: ciData,
                    borderColor: colors.accent,
                    backgroundColor: gradientCI,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    borderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 1500, easing: 'easeOutQuart' },
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, padding: 15, font: { family: 'Outfit' } }
                },
                tooltip: getChartTooltipOptions()
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(148, 163, 184, 0.15)' },
                    title: { display: true, text: `Amount (${currentCurrency})`, font: { family: 'Outfit' } },
                    ticks: {
                        callback: (v) => formatCurrency(v),
                        font: { family: 'Outfit', size: 10 }
                    }
                },
                x: {
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                    title: { display: true, text: 'Years', font: { family: 'Outfit' } }
                }
            }
        }
    });

    const compoundInterest = ciData[ciData.length - 1] - principal;
    generateBreakdownChart(principal, compoundInterest);
}

function generateBreakdownChart(principal, interest) {
    const canvas = document.getElementById('breakdownChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const colors = getChartColors();

    if (breakdownChart) breakdownChart.destroy();

    breakdownChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Principal', 'Compound Interest'],
            datasets: [{
                data: [principal, interest],
                backgroundColor: [colors.primary, colors.accent],
                borderColor: ['#fff', '#fff'],
                borderWidth: 3,
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '65%',
            animation: { animateRotate: true, duration: 1500 },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, padding: 20, font: { family: 'Outfit' } }
                },
                tooltip: {
                    ...getChartTooltipOptions(),
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}`
                    }
                }
            }
        }
    });
}

// =====================================================
// Comparison Feature
// =====================================================

function compareScenarios() {
    const p1 = parseFloat(document.getElementById('comp1Principal').value);
    const r1 = parseFloat(document.getElementById('comp1Rate').value);
    const t1 = parseFloat(document.getElementById('comp1Time').value);

    const p2 = parseFloat(document.getElementById('comp2Principal').value);
    const r2 = parseFloat(document.getElementById('comp2Rate').value);
    const t2 = parseFloat(document.getElementById('comp2Time').value);

    if (!validateInputs(p1, r1, t1) || !validateInputs(p2, r2, t2)) {
        showError('Please enter valid positive numbers in all fields');
        return;
    }

    // Calculate results for both scenarios
    const result1 = calculateScenarioResult(p1, r1, t1);
    const result2 = calculateScenarioResult(p2, r2, t2);

    lastComparison = { result1, result2, p1, p2, t1, t2 };

    displayComparisonResults(result1, result2);
    generateComparisonChart(result1, result2, p1, p2, t1, t2);
}

function calculateScenarioResult(principal, rate, time) {
    const simpleInterest = (principal * rate * time) / 100;
    const simpleAmount = principal + simpleInterest;
    const compoundAmount = principal * Math.pow(1 + rate / 100, time);
    const compoundInterest = compoundAmount - principal;

    return {
        principal,
        rate,
        time,
        simpleInterest,
        simpleAmount,
        compoundInterest,
        compoundAmount
    };
}

function displayComparisonResults(result1, result2) {
    const container = document.getElementById('comparisonResults');
    const colors = getChartColors();
    const winner = result1.compoundAmount >= result2.compoundAmount ? 'Scenario 1' : 'Scenario 2';
    const difference = Math.abs(result1.compoundAmount - result2.compoundAmount);

    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid var(--border-color);">
                <th style="text-align: left; padding: 0.75rem; color: var(--text-primary);">Metric</th>
                <th style="text-align: right; padding: 0.75rem; color: var(--primary-color);">Scenario 1</th>
                <th style="text-align: right; padding: 0.75rem; color: var(--accent-color);">Scenario 2</th>
            </tr>
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem;">Principal</td>
                <td style="text-align: right; padding: 0.75rem;">${formatCurrency(result1.principal)}</td>
                <td style="text-align: right; padding: 0.75rem;">${formatCurrency(result2.principal)}</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem;">Rate (%)</td>
                <td style="text-align: right; padding: 0.75rem;">${result1.rate.toFixed(2)}%</td>
                <td style="text-align: right; padding: 0.75rem;">${result2.rate.toFixed(2)}%</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem;">Time (years)</td>
                <td style="text-align: right; padding: 0.75rem;">${result1.time}</td>
                <td style="text-align: right; padding: 0.75rem;">${result2.time}</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem; font-weight: bold;">CI Amount</td>
                <td style="text-align: right; padding: 0.75rem; font-weight: bold; color: var(--primary-color);">${formatCurrency(result1.compoundAmount)}</td>
                <td style="text-align: right; padding: 0.75rem; font-weight: bold; color: var(--accent-color);">${formatCurrency(result2.compoundAmount)}</td>
            </tr>
        </table>

        <div class="extra-earnings-box" style="margin-top: 1rem;">
            <p style="color: var(--success-color); font-weight: bold; margin: 0;">
                <i class="fas fa-trophy"></i> ${winner} is better by ${formatCurrency(difference)}
            </p>
        </div>
    `;
}

function generateComparisonChart(result1, result2, p1, p2, t1, t2) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    const chartSection = document.getElementById('comparisonChartSection');
    chartSection.style.display = 'block';
    const colors = getChartColors();

    const maxTime = Math.max(t1, t2);
    const labels = [];
    const data1 = [];
    const data2 = [];

    for (let year = 0; year <= maxTime; year += 0.5) {
        labels.push(year.toFixed(1));
        data1.push(p1 * Math.pow(1 + result1.rate / 100, year));
        data2.push(p2 * Math.pow(1 + result2.rate / 100, year));
    }

    if (comparisonChart) comparisonChart.destroy();

    const grad1 = ctx.createLinearGradient(0, 0, 0, 350);
    grad1.addColorStop(0, colors.primary + '35');
    grad1.addColorStop(1, colors.primary + '05');

    const grad2 = ctx.createLinearGradient(0, 0, 0, 350);
    grad2.addColorStop(0, colors.accent + '35');
    grad2.addColorStop(1, colors.accent + '05');

    comparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `Scenario 1 (${result1.rate}%)`,
                    data: data1,
                    borderColor: colors.primary,
                    backgroundColor: grad1,
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6
                },
                {
                    label: `Scenario 2 (${result2.rate}%)`,
                    data: data2,
                    borderColor: colors.accent,
                    backgroundColor: grad2,
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 1500 },
            plugins: {
                legend: { position: 'top', labels: { font: { family: 'Outfit' } } },
                tooltip: getChartTooltipOptions()
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(148, 163, 184, 0.15)' },
                    ticks: { callback: (v) => formatCurrency(v), font: { family: 'Outfit', size: 10 } }
                },
                x: { grid: { color: 'rgba(148, 163, 184, 0.1)' } }
            }
        }
    });
}

// =====================================================
// Installment Calculator
// =====================================================

function calculateInstallment() {
    const loanAmount = parseFloat(document.getElementById('loanAmount').value);
    const loanRate = parseFloat(document.getElementById('loanRate').value);
    const loanTenure = parseInt(document.getElementById('loanTenure').value);

    if (!validateInputs(loanAmount, loanRate, loanTenure) || loanTenure < 1) {
        showError('Please enter valid positive numbers');
        return;
    }

    // Calculate EMI
    const monthlyRate = loanRate / 12 / 100;
    const emi = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTenure)) / 
                (Math.pow(1 + monthlyRate, loanTenure) - 1);

    const totalPayment = emi * loanTenure;
    const totalInterest = totalPayment - loanAmount;

    lastInstallment = { loanAmount, loanRate, loanTenure, emi, totalPayment, totalInterest, monthlyRate };

    displayEMIDetails(loanAmount, loanRate, loanTenure, emi, totalPayment, totalInterest);
    generateAmortizationSchedule(loanAmount, monthlyRate, emi, loanTenure);
}

function displayEMIDetails(principal, rate, tenure, emi, totalPayment, totalInterest) {
    const resultsDiv = document.getElementById('installmentResults');

    resultsDiv.innerHTML = `
        <div class="stat-cards">
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
                <div class="stat-label">Monthly EMI</div>
                <div class="stat-value">${formatCurrency(emi)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-percentage"></i></div>
                <div class="stat-label">Total Interest</div>
                <div class="stat-value">${formatCurrency(totalInterest)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div>
                <div class="stat-label">Total Payment</div>
                <div class="stat-value">${formatCurrency(totalPayment)}</div>
            </div>
        </div>

        <div class="result-highlight">
            <div class="result-item">
                <span class="result-label">Loan Amount:</span>
                <span class="result-value">${formatCurrency(principal)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Interest Rate:</span>
                <span class="result-value">${rate.toFixed(2)}% per annum</span>
            </div>
            <div class="result-item">
                <span class="result-label">Tenure:</span>
                <span class="result-value">${tenure} months</span>
            </div>
        </div>
    `;
}

function generateAmortizationSchedule(principal, monthlyRate, emi, tenure) {
    const tableBody = document.getElementById('installmentTableBody');
    const tableSection = document.getElementById('installmentTableSection');
    tableBody.innerHTML = '';

    let balance = principal;

    for (let month = 1; month <= tenure; month++) {
        const interest = balance * monthlyRate;
        const principalPaid = emi - interest;
        balance -= principalPaid;
        if (balance < 0) balance = 0;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${month}</td>
            <td>${formatCurrency(principalPaid)}</td>
            <td>${formatCurrency(interest)}</td>
            <td>${formatCurrency(emi)}</td>
            <td>${formatCurrency(Math.max(0, balance))}</td>
        `;
        tableBody.appendChild(row);
    }

    tableSection.style.display = 'block';
}

// =====================================================
// Modal Functions
// =====================================================

function openDeleteModal() {
    document.getElementById('deleteModal').classList.add('show');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('show');
}

function confirmDeleteHistory() {
    clearHistory();
    closeDeleteModal();
}

// =====================================================
// History & Persistence
// =====================================================

function saveCalculation() {
    if (!lastCalculation) return;

    const historyItem = {
        id: Date.now(),
        ...lastCalculation,
        currency: currentCurrency
    };

    calculationHistory.unshift(historyItem);
    if (calculationHistory.length > 50) {
        calculationHistory.pop();
    }

    localStorage.setItem('calculationHistory', JSON.stringify(calculationHistory));
    
    // Save to backend if available
    if (isApiAvailable) {
        saveCalculationToBackend(historyItem);
    }
    
    document.getElementById('saveCalculation').style.display = 'none';
    showSuccess('Calculation saved to history!');
}

function loadHistory() {
    const saved = localStorage.getItem('calculationHistory');
    calculationHistory = saved ? JSON.parse(saved) : [];
    displayHistory();
}

function displayHistory() {
    const container = document.getElementById('historyContainer');

    if (calculationHistory.length === 0) {
        container.innerHTML = '<p class="placeholder">No calculations saved yet</p>';
        return;
    }

    container.innerHTML = calculationHistory.map(item => `
        <div class="history-card">
            <h4>
                ${item.type === 'interest' ? '📊 Interest Calculation' : 'Calculation'}
            </h4>
            <div class="history-card-content">
                <p><strong>Principal:</strong> ${formatCurrency(item.principal, item.currency || 'USD')}</p>
                <p><strong>Rate:</strong> ${item.rate}% p.a.</p>
                <p><strong>Time:</strong> ${item.time} years</p>
                <p><strong>CI Amount:</strong> ${formatCurrency(item.compoundAmount, item.currency || 'USD')}</p>
                <p><strong>Date:</strong> ${new Date(item.date).toLocaleDateString()}</p>
            </div>
            <div class="history-card-actions">
                <button class="btn btn-secondary" onclick="downloadReport(${item.id})">
                    <i class="fas fa-download"></i> PDF
                </button>
                <button class="btn btn-danger" onclick="deleteHistoryItem(${item.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function deleteHistoryItem(id) {
    calculationHistory = calculationHistory.filter(item => item.id !== id);
    localStorage.setItem('calculationHistory', JSON.stringify(calculationHistory));
    
    // Delete from backend if available
    if (isApiAvailable) {
        deleteHistoryItemFromBackend(id);
    }
    
    displayHistory();
    showSuccess('Calculation deleted!');
}

function clearHistory() {
    calculationHistory = [];
    localStorage.removeItem('calculationHistory');
    
    // Clear backend history if available
    if (isApiAvailable) {
        clearAllHistoryFromBackend();
    }
    
    displayHistory();
    showSuccess('All history cleared!');
}

// =====================================================
// PDF Report Generation
// =====================================================

function downloadReport(id) {
    const item = calculationHistory.find(h => h.id === id);
    if (!item) return;

    const element = document.createElement('div');
    const itemCurrency = item.currency || 'USD';
    let chartImageData = '';
    
    // Generate chart as image
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        
        const labels = [];
        const siData = [];
        const ciData = [];
        
        for (let year = 0; year <= item.time; year += 0.25) {
            labels.push(year.toFixed(2));
            
            const si = (item.principal * item.rate * year) / 100;
            siData.push(item.principal + si);
            
            const ci = item.principal * Math.pow(1 + (item.rate / 100) / item.frequency, item.frequency * year);
            ciData.push(ci);
        }
        
        // Simple chart rendering
        const maxValue = Math.max(...siData, ...ciData);
        const padding = 50;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;
        
        // Draw background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw axes
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();
        
        // Draw SI line
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < siData.length; i++) {
            const x = padding + (i / (siData.length - 1)) * chartWidth;
            const y = canvas.height - padding - (siData[i] / maxValue) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        // Draw CI line
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < ciData.length; i++) {
            const x = padding + (i / (ciData.length - 1)) * chartWidth;
            const y = canvas.height - padding - (ciData[i] / maxValue) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        // Add legend
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px Arial';
        ctx.fillText('SI (Blue) vs CI (Purple)', padding + 10, padding + 15);
        
        chartImageData = canvas.toDataURL('image/jpeg', 0.9);
    } catch (err) {
        console.log('Chart generation skipped');
    }

    element.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h1>FinCalc Pro - Financial Report</h1>
            <p style="color: #666;">Generated on: ${new Date(item.date).toLocaleString()}</p>
            
            ${chartImageData ? `<img src="${chartImageData}" style="width: 100%; margin: 20px 0; border-radius: 8px;">` : ''}
            
            <h2 style="color: #2563eb; margin-top: 20px;">Calculation Details</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f0f0f0;">
                    <td style="border: 1px solid #ddd; padding: 10px;"><strong>Principal Amount</strong></td>
                    <td style="border: 1px solid #ddd; padding: 10px;">${formatCurrency(item.principal, itemCurrency)}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ddd; padding: 10px;"><strong>Rate of Interest</strong></td>
                    <td style="border: 1px solid #ddd; padding: 10px;">${item.rate.toFixed(2)}% per annum</td>
                </tr>
                <tr style="background-color: #f0f0f0;">
                    <td style="border: 1px solid #ddd; padding: 10px;"><strong>Time Period</strong></td>
                    <td style="border: 1px solid #ddd; padding: 10px;">${item.time} years</td>
                </tr>
            </table>

            <h2 style="color: #2563eb; margin-top: 20px;">Results</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #e3f2fd;">
                    <td style="border: 1px solid #ddd; padding: 10px;"><strong>Simple Interest</strong></td>
                    <td style="border: 1px solid #ddd; padding: 10px;">${formatCurrency(item.simpleInterest, itemCurrency)}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ddd; padding: 10px;"><strong>Simple Amount</strong></td>
                    <td style="border: 1px solid #ddd; padding: 10px;">${formatCurrency(item.simpleAmount, itemCurrency)}</td>
                </tr>
                <tr style="background-color: #f3e5f5;">
                    <td style="border: 1px solid #ddd; padding: 10px;"><strong>Compound Interest</strong></td>
                    <td style="border: 1px solid #ddd; padding: 10px;">${formatCurrency(item.compoundInterest, itemCurrency)}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ddd; padding: 10px;"><strong>Compound Amount</strong></td>
                    <td style="border: 1px solid #ddd; padding: 10px;">${formatCurrency(item.compoundAmount, itemCurrency)}</td>
                </tr>
                <tr style="background-color: #f0f0f0;">
                    <td style="border: 1px solid #ddd; padding: 10px;"><strong>Extra Earnings</strong></td>
                    <td style="border: 1px solid #ddd; padding: 10px;">
                        ${formatCurrency(item.compoundAmount - item.simpleAmount, itemCurrency)}
                        (${(((item.compoundAmount - item.simpleAmount) / item.simpleAmount) * 100).toFixed(2)}%)
                    </td>
                </tr>
            </table>

            <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; text-align: center;">
                Generated by FinCalc Pro - Smart Interest & Loan Planner
            </p>
        </div>
    `;

    const opt = {
        margin: 10,
        filename: `FinCalc_Report_${new Date(item.date).getTime()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(opt).from(element).save();
    showSuccess('Report downloaded!');
}

function downloadAllReports() {
    if (calculationHistory.length === 0) {
        showError('No calculations to download');
        return;
    }

    let htmlContent = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h1>FinCalc Pro - All Calculations Report</h1>
            <p style="color: #666;">Generated on: ${new Date().toLocaleString()}</p>
            <p>Total Calculations: ${calculationHistory.length}</p>
    `;

    calculationHistory.forEach((item, index) => {
        const itemCurrency = item.currency || 'USD';
        htmlContent += `
            <div style="page-break-after: always; margin-top: 40px; padding-top: 20px; border-top: 2px solid #2563eb;">
                <h2>Calculation #${index + 1}</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 10px;"><strong>Date</strong></td>
                        <td style="border: 1px solid #ddd; padding: 10px;">${new Date(item.date).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 10px;"><strong>Principal</strong></td>
                        <td style="border: 1px solid #ddd; padding: 10px;">${formatCurrency(item.principal, itemCurrency)}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 10px;"><strong>Rate</strong></td>
                        <td style="border: 1px solid #ddd; padding: 10px;">${item.rate.toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 10px;"><strong>Time</strong></td>
                        <td style="border: 1px solid #ddd; padding: 10px;">${item.time} years</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 10px;"><strong>CI Amount</strong></td>
                        <td style="border: 1px solid #ddd; padding: 10px;">${formatCurrency(item.compoundAmount, itemCurrency)}</td>
                    </tr>
                </table>
            </div>
        `;
    });

    htmlContent += `
        <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; text-align: center;">
            Generated by FinCalc Pro - Smart Interest & Loan Planner
        </p>
    </div>`;

    const element = document.createElement('div');
    element.innerHTML = htmlContent;

    const opt = {
        margin: 10,
        filename: `FinCalc_AllReports_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(opt).from(element).save();
    showSuccess('All reports downloaded!');
}

// =====================================================
// Financial Recommendations
// =====================================================

function generateRecommendations(principal, rate, time, simpleAmount, compoundAmount) {
    const recommendations = [];
    const yearlyReturn = ((compoundAmount - principal) / time).toFixed(2);

    if (rate < 5) {
        recommendations.push({
            icon: 'fa-arrow-trend-up',
            title: 'Low Return Rate',
            text: 'Consider looking for investments with higher returns to maximize your wealth growth.'
        });
    }

    if (time < 5) {
        recommendations.push({
            icon: 'fa-calendar-alt',
            title: 'Short Time Period',
            text: 'Increasing your investment period can significantly boost compound returns.'
        });
    } else if (time > 20) {
        recommendations.push({
            icon: 'fa-chart-line',
            title: 'Long-term Investment',
            text: 'Your long-term investment horizon is excellent for compound growth!'
        });
    }

    const difference = compoundAmount - simpleAmount;
    if (difference > principal * 0.1) {
        recommendations.push({
            icon: 'fa-star',
            title: 'Compound Interest Power',
            text: `You're earning ${formatCurrency(difference)} extra through compound interest. Keep it invested!`
        });
    }

    if (principal < 10000) {
        recommendations.push({
            icon: 'fa-piggy-bank',
            title: 'Start Saving More',
            text: 'Consider increasing your principal amount to accelerate your wealth building journey.'
        });
    }

    recommendations.push({
        icon: 'fa-lightbulb',
        title: 'Diversify Your Portfolio',
        text: 'Don\'t put all eggs in one basket. Spread investments across different options.'
    });

    displayRecommendations(recommendations);
}

function displayRecommendations(recommendations) {
    const container = document.getElementById('recommendationsContainerNav');

    container.innerHTML = recommendations.map(rec => `
        <div class="recommendation-card">
            <i class="fas ${rec.icon}"></i>
            <div>
                <h4>${rec.title}</h4>
                <p>${rec.text}</p>
            </div>
        </div>
    `).join('');
}

// =====================================================
// Financial Health Score
// =====================================================

function updateHealthScore() {
    if (!lastCalculation) return;

    let score = 0;
    const calc = lastCalculation;

    // Score based on interest rate
    if (calc.rate > 0 && calc.rate <= 5) score += 20;
    else if (calc.rate > 5 && calc.rate <= 10) score += 30;
    else if (calc.rate > 10) score += 40;

    // Score based on time period
    if (calc.time >= 10) score += 25;
    else if (calc.time >= 5) score += 15;
    else score += 5;

    // Score based on principal
    if (calc.principal > 100000) score += 20;
    else if (calc.principal > 50000) score += 15;
    else if (calc.principal > 10000) score += 10;
    else score += 5;

    // Score based on earnings
    const return_percentage = ((calc.compoundAmount - calc.principal) / calc.principal) * 100;
    if (return_percentage > 50) score += 20;
    else if (return_percentage > 20) score += 15;
    else score += 10;

    // Cap score at 100
    score = Math.min(score, 100);

    // Display score with animated ring
    const scoreEl = document.getElementById('healthScore');
    const ringEl = document.getElementById('scoreRingFill');
    const circumference = 2 * Math.PI * 54;

    let current = 0;
    const scoreAnim = setInterval(() => {
        current += 2;
        if (current >= score) {
            current = score;
            clearInterval(scoreAnim);
        }
        scoreEl.textContent = Math.round(current);
    }, 30);

    if (ringEl) {
        ringEl.style.strokeDashoffset = circumference;
        requestAnimationFrame(() => {
            ringEl.style.strokeDashoffset = circumference - (score / 100) * circumference;
        });
    }

    let message = '';
    if (score >= 80) message = '🌟 Excellent! You\'re on track for strong financial growth.';
    else if (score >= 60) message = '👍 Good! Your investment strategy is sound.';
    else if (score >= 40) message = '📈 Fair! Consider improving your investment returns.';
    else message = '⚠️ Moderate. Explore better investment opportunities.';

    document.getElementById('healthMessage').textContent = message;
}

// =====================================================
// Utility Functions
// =====================================================

function validateInputs(...values) {
    // Check for valid positive numbers
    if (!values.every(val => !isNaN(val) && val > 0)) {
        return false;
    }
    
    // Check for unrealistic values
    // Interest rate should not exceed 1000%
    if (values.length >= 2) {
        const rate = values[1];
        if (rate > 1000) {
            showError('Interest rate seems unrealistic (max 1000%)');
            return false;
        }
    }
    
    // Principal should be reasonable (not exceed 10 billion)
    if (values.length >= 1) {
        const principal = values[0];
        if (principal > 10000000000) {
            showError('Principal amount seems unrealistic');
            return false;
        }
    }
    
    return true;
}

function formatNumber(num) {
    return parseFloat(num).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function showError(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: var(--danger-color);
        color: white;
        padding: 1rem 2rem;
        border-radius: var(--radius);
        box-shadow: var(--shadow-lg);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
    `;
    notification.classList.add('notification');
    notification.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showSuccess(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: var(--success-color);
        color: white;
        padding: 1rem 2rem;
        border-radius: var(--radius);
        box-shadow: var(--shadow-lg);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
    `;
    notification.classList.add('notification');
    notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Update health score after calculations
const originalCalculateInterest = calculateInterest;
window.calculateInterest = function() {
    originalCalculateInterest();
    setTimeout(updateHealthScore, 100);
};

// Initialize with a default score
document.addEventListener('DOMContentLoaded', function() {
    // Show initial score message
    document.getElementById('healthScore').textContent = '0';
    document.getElementById('healthMessage').textContent = '👋 Welcome! Perform a calculation to get your personalized financial health score.';
});