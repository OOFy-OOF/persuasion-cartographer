const API_URL = 'https://persuasioncartographer.duckdns.org/analyze';

const textInput = document.getElementById('text-input');
const analyzeButton = document.getElementById('analyze-button');
const status = document.getElementById('status');
const results = document.getElementById('results');

async function loadSelection() {
    try {
        const { pendingSelection } = await chrome.storage.session.get('pendingSelection');
        if (pendingSelection?.trim()) {
            textInput.value = pendingSelection.trim();
            await chrome.storage.session.remove('pendingSelection');
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id || !/^https?:/.test(tab.url || '')) return;
        const [selection] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection()?.toString() || ''
        });
        if (selection?.result?.trim()) textInput.value = selection.result.trim();
    } catch (error) {
        // Some browser pages do not allow extension scripts; paste remains available.
    }
}

function addText(parent, tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value;
    parent.appendChild(element);
    return element;
}

function renderAnalysis(data) {
    results.classList.remove('hidden');
    document.getElementById('confidence').textContent = `Confidence: ${data.confidence}`;

    const abstain = document.getElementById('abstain');
    abstain.replaceChildren();
    if (data.abstain) {
        abstain.classList.remove('hidden');
        addText(abstain, 'strong', '', 'The tool abstained.');
        addText(abstain, 'div', '', data.abstain_reason || 'The text did not support a grounded analysis.');
    } else {
        abstain.classList.add('hidden');
    }

    const spans = document.getElementById('spans');
    spans.replaceChildren();
    for (const span of data.technique_spans || []) {
        const card = addText(spans, 'article', 'technique-card', '');
        addText(card, 'span', 'technique-label', span.technique.replace(/_/g, ' '));
        addText(card, 'blockquote', '', span.quote);
        addText(card, 'p', 'explanation', span.explanation);
    }

    const framing = document.getElementById('framing');
    framing.replaceChildren();
    for (const note of data.framing_notes || []) {
        const item = document.createElement('li');
        addText(item, 'strong', '', `${note.kind.replace(/_/g, ' ')}: `);
        addText(item, 'span', '', note.note);
        framing.appendChild(item);
    }
    document.getElementById('framing-section').classList.toggle('hidden', framing.children.length === 0);
}

analyzeButton.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) {
        status.textContent = 'Select or paste some text first.';
        status.classList.add('error');
        return;
    }
    if (text.length > 20000) {
        status.textContent = 'Please keep the text under 20,000 characters.';
        status.classList.add('error');
        return;
    }

    analyzeButton.disabled = true;
    analyzeButton.textContent = 'Analyzing...';
    status.textContent = '';
    status.classList.remove('error');
    results.classList.add('hidden');
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (!response.ok) {
            const detail = await response.json().catch(() => ({}));
            throw new Error(detail.detail || `Analysis request failed (${response.status}).`);
        }
        renderAnalysis(await response.json());
    } catch (error) {
        status.textContent = `Could not analyze this text. ${error.message || 'Check your connection and try again.'}`;
        status.classList.add('error');
    } finally {
        analyzeButton.disabled = false;
        analyzeButton.textContent = 'Analyze text';
    }
});

loadSelection();
