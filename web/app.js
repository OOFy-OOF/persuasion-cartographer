// Helper to prevent XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}

const tabButtons = [...document.querySelectorAll('[role="tab"]')];
const textInput = document.getElementById('text-input');
const characterCount = document.getElementById('character-count');

function updateCharacterCount() {
    const used = textInput.value.length;
    const limit = textInput.maxLength;
    characterCount.textContent = `${used}/${limit} characters`;
    characterCount.classList.toggle('at-limit', used === limit);
}

textInput.addEventListener('input', updateCharacterCount);
updateCharacterCount();

function activateTab(tab, moveFocus = false) {
    tabButtons.forEach(button => {
        const selected = button === tab;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
        document.getElementById(button.getAttribute('aria-controls')).classList.toggle('hidden', !selected);
    });
    if (moveFocus) tab.focus();
}

tabButtons.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', event => {
        let nextIndex;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabButtons.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabButtons.length - 1;
        else return;
        event.preventDefault();
        activateTab(tabButtons[nextIndex], true);
    });
});

document.getElementById('analyze-btn').addEventListener('click', async () => {
    const text = document.getElementById('text-input').value;
    if (!text.trim()) {
        alert("Please enter some text to analyse.");
        return;
    }

    const btn = document.getElementById('analyze-btn');
    btn.disabled = true;
    btn.textContent = "Analysing...";
    
    document.getElementById('results-section').classList.add('hidden');

    try {
        const res = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.detail || `Analysis failed (${res.status}).`);
        }
        const data = await res.json();
        
        renderResults(data);
        refreshMetrics();
    } catch (e) {
        alert(`Error analysing text: ${e.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = "Analyse Text";
    }
});

function renderResults(data) {
    const resultsSec = document.getElementById('results-section');
    resultsSec.classList.remove('hidden');

    const badge = document.getElementById('confidence-badge');
    badge.textContent = `Confidence: ${data.confidence}`;

    const techniqueSpans = Array.isArray(data.technique_spans) ? data.technique_spans : [];
    const abstained = data.abstain || techniqueSpans.length === 0;
    const abstainDiv = document.getElementById('abstain-message');
    if (abstained) {
        abstainDiv.classList.remove('hidden');
        abstainDiv.innerHTML = `<strong>The tool abstained.</strong><br>${escapeHTML(data.abstain_reason || "No rhetorical technique could be supported by an exact quote.")}`;
    } else {
        abstainDiv.classList.add('hidden');
    }

    const spansContainer = document.getElementById('spans-container');
    spansContainer.innerHTML = '';

    techniqueSpans.forEach(span => {
        const card = document.createElement('div');
        card.className = 'technique-card';

        const heading = document.createElement('div');
        heading.className = 'technique-heading';
        const label = document.createElement('span');
        label.className = 'technique-label';
        label.textContent = span.technique.replace(/_/g, ' ');
        const flagButton = document.createElement('button');
        flagButton.className = 'flag-button';
        flagButton.type = 'button';
        flagButton.textContent = 'Flag inaccurate';
        flagButton.setAttribute('aria-label', `Flag ${label.textContent} as inaccurate`);
        flagButton.addEventListener('click', () => submitTechniqueFlag(span.technique, flagButton));
        heading.append(label, flagButton);
        
        const safeQuote = escapeHTML(span.quote);
        const safeExplanation = escapeHTML(span.explanation);
        
        card.innerHTML = `
            <blockquote><mark>${safeQuote}</mark></blockquote>
            <p class="explanation">${safeExplanation}</p>
        `;
        card.prepend(heading);
        spansContainer.appendChild(card);
    });

    const framingList = document.getElementById('framing-list');
    framingList.innerHTML = '';
    data.framing_notes.forEach(note => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${note.kind.replace(/_/g, ' ')}:</strong> ${escapeHTML(note.note)}`;
        framingList.appendChild(li);
    });
}

async function submitTechniqueFlag(technique, button) {
    button.disabled = true;
    button.textContent = 'Sending...';
    button.classList.remove('flag-error');
    try {
        const response = await fetch('/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ technique })
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `Feedback failed (${response.status}).`);
        }
        button.textContent = 'Flagged ✓';
        button.classList.add('flagged');
        refreshMetrics();
    } catch (error) {
        button.disabled = false;
        button.textContent = 'Retry flag';
        button.title = error.message || 'Could not submit feedback. Please try again.';
        button.classList.add('flag-error');
    }
}

async function refreshMetrics() {
    const display = document.getElementById('metrics-display');
    try {
        const res = await fetch('/metrics');
        if (!res.ok) throw new Error('Metrics request failed');
        const data = await res.json();
        display.innerHTML = `
            <div class="metric"><strong>${data.analyses}</strong><span>analyses</span></div>
            <div class="metric"><strong>${data.abstentions}</strong><span>successful abstentions</span></div>
            <div class="metric"><strong>${data.quote_grounding_drops}</strong><span>unverifiable quotes removed</span></div>
        `;
        const ranking = document.getElementById('misattribution-ranking');
        const topFlagged = Object.entries(data.misattributions || {})
            .filter(([, count]) => count > 0)
            .sort((left, right) => right[1] - left[1])
            .slice(0, 3);
        ranking.replaceChildren();
        if (topFlagged.length === 0) {
            const item = document.createElement('li');
            item.textContent = 'No technique flags submitted yet.';
            ranking.appendChild(item);
        } else {
            topFlagged.forEach(([technique, count]) => {
                const item = document.createElement('li');
                item.textContent = `${technique.replace(/_/g, ' ')} — ${count}`;
                ranking.appendChild(item);
            });
        }
    } catch (error) {
        display.textContent = 'Live counters are temporarily unavailable.';
    }
}

refreshMetrics();
setInterval(refreshMetrics, 10000);
