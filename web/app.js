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

document.getElementById('analyze-btn').addEventListener('click', async () => {
    const text = document.getElementById('text-input').value;
    if (text.length < 40) {
        alert("Please enter at least 40 characters.");
        return;
    }

    const btn = document.getElementById('analyze-btn');
    btn.disabled = true;
    btn.textContent = "Analyzing...";
    
    document.getElementById('results-section').classList.add('hidden');

    try {
        const res = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        
        renderResults(data);
    } catch (e) {
        alert("Error analyzing text. Is the server running?");
    } finally {
        btn.disabled = false;
        btn.textContent = "Analyze Text";
    }
});

function renderResults(data) {
    const resultsSec = document.getElementById('results-section');
    resultsSec.classList.remove('hidden');

    const badge = document.getElementById('confidence-badge');
    badge.textContent = `Confidence: ${data.confidence}`;

    const abstainDiv = document.getElementById('abstain-message');
    if (data.abstain) {
        abstainDiv.classList.remove('hidden');
        abstainDiv.innerHTML = `<strong>The tool abstained.</strong><br>${escapeHTML(data.abstain_reason || "Not enough evidence to ground a claim.")}`;
    } else {
        abstainDiv.classList.add('hidden');
    }

    const spansContainer = document.getElementById('spans-container');
    spansContainer.innerHTML = '';
    
    data.technique_spans.forEach(span => {
        const card = document.createElement('div');
        card.className = 'technique-card';
        
        const safeQuote = escapeHTML(span.quote);
        const safeExplanation = escapeHTML(span.explanation);
        
        card.innerHTML = `
            <span class="technique-label">${span.technique.replace(/_/g, ' ')}</span>
            <blockquote><mark>${safeQuote}</mark></blockquote>
            <p class="explanation">${safeExplanation}</p>
        `;
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

async function refreshMetrics() {
    const display = document.getElementById('metrics-display');
    try {
        const res = await fetch('/metrics');
        if (!res.ok) throw new Error('Metrics request failed');
        const data = await res.json();
        display.innerHTML = `
            <div class="metric"><strong>${data.analyses}</strong><span>analyses</span></div>
            <div class="metric"><strong>${data.abstentions}</strong><span>abstentions</span></div>
            <div class="metric"><strong>${data.quote_grounding_drops}</strong><span>unverifiable quotes removed</span></div>
        `;
    } catch (error) {
        display.textContent = 'Live counters are temporarily unavailable.';
    }
}

refreshMetrics();
setInterval(refreshMetrics, 10000);
